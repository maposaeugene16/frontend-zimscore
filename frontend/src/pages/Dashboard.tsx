import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, BarChart3, ArrowUpRight, ArrowDownLeft, Send, CreditCard, Users, TrendingUp, Eye, EyeOff } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreditScoreGauge } from "@/components/dashboard/CreditScoreGauge";
import { StatCard } from "@/components/dashboard/StatCard";
import { mockUser, transactions, formatCurrency, formatDate } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const displayName = profile?.full_name || user?.user_metadata?.full_name || "User";
  const navigate = useNavigate();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionRecipient, setActionRecipient] = useState("");
  const [activityTab, setActivityTab] = useState("all");
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [realScore, setRealScore] = useState(0);
  const [maxLoan, setMaxLoan] = useState(20);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("ecocash_statements")
        .select("id")
        .eq("user_id", user.id)
        .eq("verification_status", "verified");
      const count = data?.length ?? 0;
      setVerifiedCount(count);
      // Simple score: 0 if no docs
      if (count === 0) {
        setRealScore(0);
        setMaxLoan(20);
      } else {
        const score = Math.min(850, count * 150 + 200);
        setRealScore(score);
        setMaxLoan(score < 300 ? 50 : score < 500 ? 200 : score < 650 ? 500 : score < 750 ? 1500 : 5000);
      }
    };
    fetchDocs();
  }, [user]);

  const filteredTransactions = activityTab === "all"
    ? transactions
    : transactions.filter(t => t.type === activityTab);

  const handleQuickAction = (label: string) => {
    if (label === "Cards") {
      toast.info("Card management coming soon!");
      return;
    }
    setActionDialog(label);
    setActionAmount("");
    setActionRecipient("");
  };

  const handleActionSubmit = () => {
    if (!actionAmount || isNaN(Number(actionAmount)) || Number(actionAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if ((actionDialog === "Pay" || actionDialog === "Transfer") && !actionRecipient.trim()) {
      toast.error("Please enter a recipient");
      return;
    }
    toast.success(`${actionDialog} of ${formatCurrency(Number(actionAmount))} processed successfully!`);
    setActionDialog(null);
  };

  const quickActions = [
    { label: "Pay", icon: Send, color: "bg-primary/15 text-primary" },
    { label: "Request", icon: ArrowDownLeft, color: "bg-success/15 text-success" },
    { label: "Transfer", icon: ArrowUpRight, color: "bg-accent/15 text-accent" },
    { label: "Cards", icon: CreditCard, color: "bg-purple-500/15 text-purple-400" },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Welcome back, {displayName.split(" ")[0]} 👋</h2>
            <p className="text-muted-foreground text-sm">Here's your financial overview</p>
          </div>
          <button
            onClick={() => setBalanceVisible(!balanceVisible)}
            className="p-2 rounded-lg bg-secondary/60 hover:bg-secondary border border-border transition-colors"
            title={balanceVisible ? "Hide balances" : "Show balances"}
          >
            {balanceVisible ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cursor-pointer" onClick={() => navigate("/wallet")}>
            <StatCard title="Wallet Balance" value={balanceVisible ? formatCurrency(mockUser.walletBalance) : "••••••"} icon={Wallet} trend={{ value: "12% this month", positive: true }} />
          </div>
          <div className="cursor-pointer" onClick={() => navigate("/score")}>
            <StatCard title="Credit Score" value={String(realScore)} subtitle={realScore === 0 ? "No Data" : realScore >= 750 ? "Excellent" : realScore >= 650 ? "Very Good" : realScore >= 500 ? "Good" : "Fair"} icon={BarChart3} trend={verifiedCount > 0 ? { value: `${verifiedCount} doc${verifiedCount !== 1 ? "s" : ""} verified`, positive: true } : { value: "Upload documents", positive: false }} />
          </div>
          <div className="cursor-pointer" onClick={() => navigate("/p2p")}>
            <StatCard title="Active Loans" value="3" subtitle={balanceVisible ? "$2,800 outstanding" : "••••••"} icon={Users} />
          </div>
          <div className="cursor-pointer" onClick={() => navigate("/wallet")}>
            <StatCard title="Monthly Earnings" value={balanceVisible ? formatCurrency(365.50) : "••••••"} icon={TrendingUp} trend={{ value: "8.2%", positive: true }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Credit Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card p-6 cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate("/score")}
          >
            <h3 className="font-display text-lg font-semibold mb-4">Credit Score</h3>
            <CreditScoreGauge score={realScore} maxScore={850} />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {verifiedCount === 0 ? "Upload documents to build your score" : `Based on ${verifiedCount} verified document${verifiedCount !== 1 ? "s" : ""}`}
            </p>
            <p className="text-center text-xs text-muted-foreground mt-1">Max loan: ${maxLoan}</p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.label)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border hover:border-primary/20 transition-all duration-200"
                >
                  <div className={`p-3 rounded-full ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity with Tabs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Recent Activity</h3>
              <button onClick={() => navigate("/wallet")} className="text-xs text-primary hover:underline font-medium">
                View All
              </button>
            </div>
            <Tabs value={activityTab} onValueChange={setActivityTab}>
              <TabsList className="w-full mb-3">
                <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
                <TabsTrigger value="credit" className="flex-1 text-xs">Income</TabsTrigger>
                <TabsTrigger value="debit" className="flex-1 text-xs">Expenses</TabsTrigger>
              </TabsList>
              <TabsContent value={activityTab} className="mt-0">
                <div className="space-y-2">
                  {filteredTransactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/40 border-b border-border/50 last:border-0 cursor-pointer transition-colors"
                      onClick={() => navigate("/wallet")}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.type === 'credit' ? 'bg-success/15' : 'bg-destructive/15'}`}>
                          {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{balanceVisible ? formatCurrency(tx.amount) : '••••'}
                      </span>
                    </div>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions found</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>

      {/* Quick Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog}</DialogTitle>
            <DialogDescription>
              {actionDialog === "Pay" && "Send money to another ZimScore user"}
              {actionDialog === "Request" && "Request money from another user"}
              {actionDialog === "Transfer" && "Transfer funds to an external account"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(actionDialog === "Pay" || actionDialog === "Transfer") && (
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient</Label>
                <Input
                  id="recipient"
                  placeholder={actionDialog === "Pay" ? "Enter username or email" : "Enter account number"}
                  value={actionRecipient}
                  onChange={(e) => setActionRecipient(e.target.value)}
                />
              </div>
            )}
            {actionDialog === "Request" && (
              <div className="space-y-2">
                <Label htmlFor="from">Request From</Label>
                <Input
                  id="from"
                  placeholder="Enter username or email"
                  value={actionRecipient}
                  onChange={(e) => setActionRecipient(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Available balance: {formatCurrency(mockUser.walletBalance)}</p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setActionDialog(null)}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleActionSubmit}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 glow-primary transition-all"
            >
              Confirm {actionDialog}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
