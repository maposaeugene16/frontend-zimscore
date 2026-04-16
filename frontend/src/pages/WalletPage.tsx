import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock, Plus, Minus, Copy, Download, Search, Shield, ShieldOff, Info, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { mockUser, transactions as initialTransactions, formatCurrency, formatDate, Transaction } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const txCategories = ["All", "Deposit", "Withdrawal", "Disbursement", "Repayment", "Fee", "Interest"];

export default function WalletPage() {
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [balance, setBalance] = useState(mockUser.walletBalance);
  const [lockedBalance] = useState(mockUser.lockedBalance);
  const [walletFrozen, setWalletFrozen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("ecocash");
  const [accountRef, setAccountRef] = useState("");
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<number | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertAmount, setAlertAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filtered = transactions.filter((t) => {
    const matchesType = filter === "all" || t.type === filter;
    const matchesCat = categoryFilter === "All" || t.category === categoryFilter;
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase()) || (t.reference || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCat && matchesSearch;
  });

  const totalIncome = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  const handleDeposit = () => {
    if (walletFrozen) { toast.error("Wallet is frozen. Unfreeze to make transactions."); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > 10000) { toast.error("Maximum deposit is $10,000"); return; }
    setBalance(prev => {
      const newBal = prev + amt;
      if (lowBalanceThreshold && newBal < lowBalanceThreshold) {
        toast.warning(`Balance is below your alert threshold of ${formatCurrency(lowBalanceThreshold)}`);
      }
      return newBal;
    });
    const newTx: Transaction = {
      id: String(Date.now()), type: "credit",
      description: `Deposit via ${method === "ecocash" ? "EcoCash" : method === "bank" ? "Bank Transfer" : method === "paynow" ? "Paynow" : "USD Cash"}`,
      amount: amt, date: new Date().toISOString().split("T")[0], category: "Deposit",
      reference: `DEP-${Date.now().toString(36).toUpperCase()}`,
    };
    setTransactions(prev => [newTx, ...prev]);
    toast.success(`${formatCurrency(amt)} deposited successfully`);
    setDepositOpen(false); setAmount(""); setAccountRef("");
  };

  const handleEcoCashDeposit = async () => {
    if (walletFrozen) { toast.error("Wallet is frozen."); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!accountRef.trim()) { toast.error("Enter your EcoCash phone number"); return; }

    setIsLoading(true);
    try {
      const response = await fetch("/api/ecocash/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: accountRef, amount: amt }),
      });
      const data = await response.json();
      
      if (data.status === "Success" || data.transaction_id) {
        toast.success(data.message || "EcoCash push sent! Please confirm on your phone.");
        // We'll update balance locally for demo, ideally we wait for webhook
        setBalance(prev => prev + amt);
        const newTx: Transaction = {
          id: data.transaction_id || String(Date.now()),
          type: "credit",
          description: "EcoCash Deposit",
          amount: amt,
          date: new Date().toISOString().split("T")[0],
          category: "Deposit",
          reference: data.client_correlator || `DEP-${Date.now().toString(36).toUpperCase()}`,
        };
        setTransactions(prev => [newTx, ...prev]);
        setDepositOpen(false); setAmount(""); setAccountRef("");
      } else {
        toast.error(data.message || "EcoCash transaction failed");
      }
    } catch (error) {
      toast.error("Failed to connect to payment server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = () => {
    if (walletFrozen) { toast.error("Wallet is frozen. Unfreeze to make transactions."); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > balance) { toast.error(`Insufficient balance. Available: ${formatCurrency(balance)}`); return; }
    if (!accountRef.trim()) { toast.error("Please enter account/phone number"); return; }
    setBalance(prev => {
      const newBal = prev - amt;
      if (lowBalanceThreshold && newBal < lowBalanceThreshold) {
        toast.warning(`Balance is below your alert threshold of ${formatCurrency(lowBalanceThreshold)}`);
      }
      return newBal;
    });
    // Deduct fee at point of transaction - WAL-BR-003
    const fee = amt * 0.01;
    const feeTx: Transaction = {
      id: String(Date.now() + 1), type: "debit",
      description: "Withdrawal Fee", amount: fee,
      date: new Date().toISOString().split("T")[0], category: "Fee",
      reference: `FEE-${Date.now().toString(36).toUpperCase()}`,
    };
    const newTx: Transaction = {
      id: String(Date.now()), type: "debit",
      description: `Withdrawal to ${method === "ecocash" ? "EcoCash" : method === "bank" ? "Bank Account" : "Cash Pickup"}`,
      amount: amt, date: new Date().toISOString().split("T")[0], category: "Withdrawal",
      reference: `WTH-${Date.now().toString(36).toUpperCase()}`,
    };
    setTransactions(prev => [feeTx, newTx, ...prev]);
    toast.success(`${formatCurrency(amt)} withdrawn successfully`);
    setWithdrawOpen(false); setAmount(""); setAccountRef("");
  };

  const handleEcoCashWithdraw = async () => {
    if (walletFrozen) { toast.error("Wallet is frozen."); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > balance) { toast.error("Insufficient balance"); return; }
    if (!accountRef.trim()) { toast.error("Enter recipient EcoCash number"); return; }

    setIsLoading(true);
    try {
      const response = await fetch("/api/ecocash/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: accountRef, amount: amt }),
      });
      const data = await response.json();

      if (data.status === "Success" || data.transaction_id) {
        setBalance(prev => prev - amt);
        const fee = amt * 0.01;
        const feeTx: Transaction = {
          id: String(Date.now() + 1), type: "debit",
          description: "Withdrawal Fee", amount: fee,
          date: new Date().toISOString().split("T")[0], category: "Fee",
          reference: `FEE-${Date.now().toString(36).toUpperCase()}`,
        };
        const newTx: Transaction = {
          id: data.transaction_id || String(Date.now()),
          type: "debit",
          description: "EcoCash Withdrawal",
          amount: amt,
          date: new Date().toISOString().split("T")[0],
          category: "Withdrawal",
          reference: data.client_correlator || `WTH-${Date.now().toString(36).toUpperCase()}`,
        };
        setTransactions(prev => [feeTx, newTx, ...prev]);
        toast.success(data.message || "Withdrawal successful");
        setWithdrawOpen(false); setAmount(""); setAccountRef("");
      } else {
        toast.error(data.message || "EcoCash transaction failed");
      }
    } catch (error) {
      toast.error("Failed to connect to payment server");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFreeze = () => {
    setWalletFrozen(!walletFrozen);
    toast[walletFrozen ? "success" : "warning"](walletFrozen ? "Wallet unfrozen. Transactions enabled." : "Wallet frozen. All outgoing transactions blocked.");
    setFreezeOpen(false);
  };

  const setAlert = () => {
    const threshold = Number(alertAmount);
    if (!threshold || threshold <= 0) { toast.error("Enter a valid amount"); return; }
    setLowBalanceThreshold(threshold);
    toast.success(`Low-balance alert set at ${formatCurrency(threshold)}`);
    setAlertOpen(false); setAlertAmount("");
  };

  const copyWalletId = () => {
    navigator.clipboard.writeText("ZIM-WAL-" + mockUser.name.replace(/\s/g, "").toUpperCase().slice(0, 6) + "-7742");
    toast.success("Wallet ID copied to clipboard");
  };

  const exportTransactions = () => {
    const csv = ["Date,Description,Category,Type,Amount,Reference"]
      .concat(filtered.map(t => `${t.date},"${t.description}",${t.category},${t.type},${t.type === "credit" ? "" : "-"}${t.amount},${t.reference || ""}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported");
  };

  const quickAmounts = [50, 100, 250, 500, 1000];

  return (
    <AppLayout title="Wallet">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Frozen banner */}
        {walletFrozen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-sm text-destructive">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Wallet is frozen.</span> All outgoing transactions are blocked.
            <Button size="sm" variant="outline" className="ml-auto text-xs" onClick={() => setFreezeOpen(true)}>Unfreeze</Button>
          </motion.div>
        )}

        {/* Balances - WAL-FR-008 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Available Balance" value={formatCurrency(balance)} icon={Wallet} trend={{ value: `${((totalIncome - totalExpenses) / (totalIncome || 1) * 100).toFixed(0)}% net`, positive: totalIncome > totalExpenses }} />
          <StatCard title="Locked Balance" value={formatCurrency(lockedBalance)} subtitle="In active loans & escrow" icon={Lock} />
          <StatCard title="Total Balance" value={formatCurrency(balance + lockedBalance)} icon={Wallet} />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setDepositOpen(true)} className="glow-primary" disabled={walletFrozen}>
              <Plus className="w-4 h-4 mr-2" /> Deposit
            </Button>
            <Button variant="outline" onClick={() => setWithdrawOpen(true)} disabled={walletFrozen}>
              <Minus className="w-4 h-4 mr-2" /> Withdraw
            </Button>
            <Button variant="outline" onClick={() => setFreezeOpen(true)}>
              {walletFrozen ? <ShieldOff className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              {walletFrozen ? "Unfreeze" : "Freeze"}
            </Button>
            <Button variant="outline" onClick={() => setAlertOpen(true)}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Alert
            </Button>
          </div>
          <button onClick={copyWalletId} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
            <Copy className="w-3 h-3" /> Wallet ID: ZIM-WAL-{mockUser.name.replace(/\s/g, "").toUpperCase().slice(0, 6)}-7742
          </button>
        </div>

        {/* Income/Expense */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/15"><ArrowDownLeft className="w-5 h-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">Total Income</p><p className="font-display font-bold text-success">{formatCurrency(totalIncome)}</p></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/15"><ArrowUpRight className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="font-display font-bold text-destructive">{formatCurrency(totalExpenses)}</p></div>
          </motion.div>
        </div>

        {/* Transaction History - WAL-FR-008 breakdown by type */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-display text-lg font-semibold">Transaction Ledger</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={exportTransactions}><Download className="w-3 h-3 mr-1" /> Export CSV</Button>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-3 h-6">All</TabsTrigger>
                  <TabsTrigger value="credit" className="text-xs px-3 h-6">Income</TabsTrigger>
                  <TabsTrigger value="debit" className="text-xs px-3 h-6">Expenses</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {txCategories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by description, category, or reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-secondary border-border" />
          </div>

          <div className="space-y-1">
            <AnimatePresence>
              {filtered.map((tx) => (
                <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tx.type === 'credit' ? 'bg-success/15' : 'bg-destructive/15'}`}>
                      {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)} · {tx.category} {tx.reference && `· ${tx.reference}`}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No transactions match your search.</p>}
          </div>
        </motion.div>
      </div>

      {/* Deposit */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deposit Funds</DialogTitle><DialogDescription>Add money to your ZimScore wallet</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[{ id: "ecocash", label: "EcoCash" }, { id: "bank", label: "Bank" }, { id: "paynow", label: "Paynow" }, { id: "cash", label: "USD Cash" }].map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${method === m.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min={1} max={10000} />
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map(qa => <button key={qa} onClick={() => setAmount(String(qa))} className="px-3 py-1 rounded-full text-xs bg-secondary border border-border hover:border-primary/30 transition-colors">${qa}</button>)}
              </div>
            </div>
            {method === "ecocash" && (
              <div className="space-y-2">
                <Label>EcoCash Number</Label>
                <Input placeholder="077X XXX XXXX" value={accountRef} onChange={e => setAccountRef(e.target.value)} />
              </div>
            )}
            {amount && Number(amount) > 0 && (
              <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-sm">
                New balance: <span className="text-success font-bold">{formatCurrency(balance + Number(amount))}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
            <Button 
              onClick={method === "ecocash" ? handleEcoCashDeposit : handleDeposit} 
              className="glow-primary"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : `Deposit ${amount ? formatCurrency(Number(amount)) : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw Funds</DialogTitle><DialogDescription>Transfer from your wallet (1% fee applies)</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "ecocash", label: "EcoCash" }, { id: "bank", label: "Bank" }, { id: "cash", label: "Cash" }].map(m => (
                  <button key={m.id} onClick={() => setMethod(m.id)} className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${method === m.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"}`}>{m.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{method === "ecocash" ? "Phone Number" : "Account Number"}</Label>
              <Input placeholder={method === "ecocash" ? "077X XXX XXXX" : "Account number"} value={accountRef} onChange={e => setAccountRef(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min={1} />
              <p className="text-xs text-muted-foreground">Available: {formatCurrency(balance)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={method === "ecocash" ? handleEcoCashWithdraw : handleWithdraw}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze - WAL-FR-012 */}
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{walletFrozen ? "Unfreeze Wallet" : "Freeze Wallet"}</DialogTitle>
            <DialogDescription>{walletFrozen ? "Re-enable all outgoing transactions." : "Block all outgoing transactions immediately. Use this if you suspect fraud."}</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            {walletFrozen ? <ShieldOff className="w-12 h-12 text-success mx-auto mb-3" /> : <Shield className="w-12 h-12 text-destructive mx-auto mb-3" />}
            <p className="text-sm text-muted-foreground">{walletFrozen ? "Your wallet is currently frozen. Unfreezing will allow deposits and withdrawals." : "Freezing your wallet will immediately block all withdrawals, transfers, and payments."}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeOpen(false)}>Cancel</Button>
            <Button variant={walletFrozen ? "default" : "destructive"} onClick={toggleFreeze}>
              {walletFrozen ? "Unfreeze Wallet" : "Freeze Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Low-balance alert - WAL-FR-011 */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Low-Balance Alert</DialogTitle><DialogDescription>Get notified when your balance falls below a threshold.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Alert Threshold (USD)</Label>
              <Input type="number" placeholder="e.g. 100" value={alertAmount} onChange={e => setAlertAmount(e.target.value)} />
            </div>
            {lowBalanceThreshold && <p className="text-xs text-muted-foreground">Current alert: {formatCurrency(lowBalanceThreshold)}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertOpen(false)}>Cancel</Button>
            <Button onClick={setAlert}>Set Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
