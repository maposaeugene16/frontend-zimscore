import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertTriangle, CheckCircle, Clock, TrendingUp, DollarSign, Search, Plus, Info, FileText, Flag } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { loanRequests as initialLoans, formatCurrency, LoanRequest, mockUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const riskColors: Record<string, string> = { Low: "text-success bg-success/15", Medium: "text-accent bg-accent/15", High: "text-destructive bg-destructive/15" };
const riskIcons: Record<string, typeof CheckCircle> = { Low: CheckCircle, Medium: Clock, High: AlertTriangle };
const purposes = ["Farm Equipment", "School Fees", "Business Expansion", "Medical Bills", "Vehicle Repair", "Home Improvement", "Inventory Purchase", "Other"];

export default function P2PLending() {
  const [loans, setLoans] = useState<LoanRequest[]>(initialLoans);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [bidRates, setBidRates] = useState<Record<string, string>>({});
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; loan: LoanRequest | null; amount: number; rate: number }>({ open: false, loan: null, amount: 0, rate: 0 });
  const [myBids, setMyBids] = useState<{ loanId: string; amount: number; borrower: string; date: string; rate: number }[]>([]);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [mainTab, setMainTab] = useState("browse");

  // Create Loan Request form (Borrower flow) - P2P-FR-001
  const [createOpen, setCreateOpen] = useState(false);
  const [reqAmount, setReqAmount] = useState("");
  const [reqPurpose, setReqPurpose] = useState("");
  const [reqDuration, setReqDuration] = useState("30");
  const [reqMaxRate, setReqMaxRate] = useState("");
  const [myLoanRequests, setMyLoanRequests] = useState<LoanRequest[]>([]);

  // Dispute - P2P-FR-018
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState<File | null>(null);

  const filteredLoans = loans.filter((loan) => {
    const matchesRisk = riskFilter === "all" || loan.riskRating.toLowerCase() === riskFilter;
    const matchesSearch = loan.borrower.toLowerCase().includes(searchQuery.toLowerCase()) || loan.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const totalInvested = myBids.reduce((sum, b) => sum + b.amount, 0);

  const handleBidClick = (loan: LoanRequest) => {
    if (!riskAcknowledged) { toast.error("Please acknowledge the lending risk disclaimer first"); return; }
    const amountStr = bidAmounts[loan.id];
    const rateStr = bidRates[loan.id] || String(loan.interestRate);
    if (!amountStr || Number(amountStr) <= 0) { toast.error("Enter a valid bid amount"); return; }
    const amount = Number(amountStr);
    const rate = Number(rateStr);
    const remaining = loan.amount * (1 - loan.funded / 100);
    if (amount > remaining) { toast.error(`Maximum bid is ${formatCurrency(remaining)}`); return; }
    if (amount > mockUser.walletBalance) { toast.error("Insufficient wallet balance. Please fund your wallet first."); return; }
    if (loan.maxRate && rate > loan.maxRate) { toast.error(`Rate exceeds borrower's max of ${loan.maxRate}%`); return; }
    setConfirmDialog({ open: true, loan, amount, rate });
  };

  const confirmBid = () => {
    if (!confirmDialog.loan) return;
    const { loan, amount, rate } = confirmDialog;
    const additionalPercent = (amount / loan.amount) * 100;
    setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, funded: Math.min(100, l.funded + additionalPercent) } : l));
    setMyBids(prev => [...prev, { loanId: loan.id, amount, borrower: loan.borrower, date: new Date().toLocaleDateString("en-GB"), rate }]);
    setBidAmounts(prev => ({ ...prev, [loan.id]: "" }));
    setBidRates(prev => ({ ...prev, [loan.id]: "" }));
    setSelectedLoan(null);
    setConfirmDialog({ open: false, loan: null, amount: 0, rate: 0 });
    const estReturn = amount * (1 + rate / 100);
    toast.success(`Bid placed: ${formatCurrency(amount)} at ${rate}%`, { description: `Est. return: ~${formatCurrency(estReturn)}` });
  };

  const handleCreateLoanRequest = () => {
    const amt = Number(reqAmount);
    if (!amt || amt < 5 || amt > 500) { toast.error("Amount must be between $5 and $500"); return; }
    if (!reqPurpose) { toast.error("Select a purpose"); return; }
    if (!reqMaxRate || Number(reqMaxRate) <= 0) { toast.error("Enter max interest rate"); return; }
    if (myLoanRequests.some(r => r.status === "open")) { toast.error("You already have an active loan request. Only one is allowed at a time."); return; }
    const newReq: LoanRequest = {
      id: `my-${Date.now()}`, borrower: mockUser.name, amount: amt, purpose: reqPurpose,
      interestRate: Number(reqMaxRate), term: Math.ceil(Number(reqDuration) / 30),
      riskRating: "Low", funded: 0, avatar: mockUser.avatar,
      zimScore: mockUser.creditScore, maxRate: Number(reqMaxRate), duration: Number(reqDuration),
      status: "open", createdAt: new Date().toISOString().split("T")[0], bids: [],
    };
    setMyLoanRequests(prev => [newReq, ...prev]);
    toast.success("Loan request created!", { description: `$${amt} for ${reqPurpose} — expires in 7 days` });
    setCreateOpen(false);
    setReqAmount(""); setReqPurpose(""); setReqDuration("30"); setReqMaxRate("");
  };

  const handleDispute = () => {
    if (!disputeReason.trim()) { toast.error("Please provide a reason"); return; }
    if (!disputeEvidence) { toast.error("Evidence is required to file a dispute"); return; }
    toast.success("Dispute filed. The loan is now on hold pending review.");
    setDisputeOpen(false); setDisputeReason(""); setDisputeEvidence(null);
  };

  return (
    <AppLayout title="P2P Lending">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">P2P Lending Marketplace</h2>
            <p className="text-muted-foreground text-sm">$5–$500 loans · 7–90 days · All funds via wallet</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDisputeOpen(true)}><Flag className="w-4 h-4 mr-2" /> Dispute</Button>
            <Button onClick={() => setCreateOpen(true)} className="glow-primary"><Plus className="w-4 h-4 mr-2" /> Request Loan</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Listings", value: loans.filter(l => l.status === "open").length.toString(), icon: Users, color: "text-primary" },
            { label: "Your Investments", value: formatCurrency(totalInvested), icon: DollarSign, color: "text-success" },
            { label: "Your Loan Requests", value: myLoanRequests.length.toString(), icon: FileText, color: "text-accent" },
          ].map(stat => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="font-display font-bold text-lg">{stat.value}</p></div>
            </motion.div>
          ))}
        </div>

        {/* Risk Acknowledgment - P2P-FR-007 */}
        {!riskAcknowledged && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">Lending Risk Disclaimer</p>
                <p className="text-xs text-amber-200/70 mt-1">Lending carries financial risk. You may lose your capital if the borrower defaults. Past performance does not guarantee future returns.</p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" onChange={e => setRiskAcknowledged(e.target.checked)} className="rounded" />
                  <span className="text-xs text-amber-200">I understand and accept the risks of P2P lending</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="browse">Browse Loans</TabsTrigger>
            <TabsTrigger value="mybids">My Bids ({myBids.length})</TabsTrigger>
            <TabsTrigger value="myrequests">My Requests ({myLoanRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search borrowers or purposes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-secondary border-border" />
              </div>
              <Tabs value={riskFilter} onValueChange={setRiskFilter}>
                <TabsList className="bg-secondary">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="low">Low</TabsTrigger>
                  <TabsTrigger value="medium">Med</TabsTrigger>
                  <TabsTrigger value="high">High</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Loan Cards */}
            <div className="space-y-3">
              {filteredLoans.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No loans match your filters.</p>}
              {filteredLoans.map(loan => {
                const RiskIcon = riskIcons[loan.riskRating] || Clock;
                const remaining = loan.amount * (1 - loan.funded / 100);
                return (
                  <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={cn("p-4 rounded-xl border transition-all duration-200 cursor-pointer", loan.funded >= 100 ? "border-success/30 bg-success/5 opacity-70" : selectedLoan === loan.id ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20 bg-secondary/20")}
                    onClick={() => loan.funded < 100 && setSelectedLoan(selectedLoan === loan.id ? null : loan.id)}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">{loan.avatar}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{loan.borrower}</p>
                            {loan.zimScore && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">ZS: {loan.zimScore}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{loan.purpose} · {loan.duration || loan.term * 30} days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-display font-bold">{formatCurrency(loan.amount)}</p>
                          <p className="text-xs text-muted-foreground">Max {loan.maxRate || loan.interestRate}%</p>
                        </div>
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1", riskColors[loan.riskRating])}>
                          <RiskIcon className="w-3 h-3" /> {loan.riskRating}
                        </span>
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{loan.funded >= 100 ? "Fully Funded ✓" : `${Math.round(loan.funded)}% funded`}</span>
                        <span>{loan.bids?.length || 0} bid(s)</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div className={cn("h-full rounded-full", loan.funded >= 100 ? "bg-success" : "bg-primary")} initial={{ width: 0 }} animate={{ width: `${Math.min(100, loan.funded)}%` }} transition={{ duration: 0.5 }} />
                      </div>
                    </div>
                    {/* Bid form */}
                    <AnimatePresence>
                      {selectedLoan === loan.id && loan.funded < 100 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <p className="text-xs text-muted-foreground">Remaining: {formatCurrency(remaining)} · Est. return: ~{formatCurrency(Number(bidAmounts[loan.id] || 0) * (1 + (Number(bidRates[loan.id]) || loan.interestRate) / 100))}</p>
                            <div className="flex gap-3">
                              <Input type="number" placeholder="Bid amount" value={bidAmounts[loan.id] || ""} onChange={e => setBidAmounts(prev => ({ ...prev, [loan.id]: e.target.value }))} onClick={e => e.stopPropagation()} className="flex-1 bg-secondary border-border" min={1} />
                              <Input type="number" placeholder={`Rate (max ${loan.maxRate || loan.interestRate}%)`} value={bidRates[loan.id] || ""} onChange={e => setBidRates(prev => ({ ...prev, [loan.id]: e.target.value }))} onClick={e => e.stopPropagation()} className="w-28 bg-secondary border-border" />
                              <Button onClick={e => { e.stopPropagation(); handleBidClick(loan); }} className="glow-primary">Bid</Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="mybids" className="mt-4">
            {myBids.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">You haven't placed any bids yet.</p>
                <p className="text-xs mt-1">Browse loans and start lending to earn returns.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBids.map((bid, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div>
                      <p className="text-sm font-medium">{bid.borrower}</p>
                      <p className="text-xs text-muted-foreground">{bid.date} · {bid.rate}% interest</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-success">{formatCurrency(bid.amount)}</p>
                      <p className="text-xs text-muted-foreground">Return: ~{formatCurrency(bid.amount * (1 + bid.rate / 100))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="myrequests" className="mt-4">
            {myLoanRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No loan requests yet.</p>
                <p className="text-xs mt-1">Create a request for $5–$500 and receive bids from lenders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myLoanRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm">{formatCurrency(req.amount)} — {req.purpose}</p>
                        <p className="text-xs text-muted-foreground">{req.duration} days · Max {req.maxRate}% · ZimScore: {req.zimScore}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent">{req.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Bid */}
      <Dialog open={confirmDialog.open} onOpenChange={open => !open && setConfirmDialog({ open: false, loan: null, amount: 0, rate: 0 })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Bid</DialogTitle><DialogDescription>This amount will be locked in your wallet.</DialogDescription></DialogHeader>
          {confirmDialog.loan && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Borrower</span><span className="font-medium">{confirmDialog.loan.borrower}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ZimScore</span><span className="font-medium">{confirmDialog.loan.zimScore}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bid Amount</span><span className="font-bold text-primary">{formatCurrency(confirmDialog.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Your Rate</span><span>{confirmDialog.rate}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{confirmDialog.loan.duration || confirmDialog.loan.term * 30} days</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Est. Return</span><span className="font-bold text-success">{formatCurrency(confirmDialog.amount * (1 + confirmDialog.rate / 100))}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, loan: null, amount: 0, rate: 0 })}>Cancel</Button>
            <Button onClick={confirmBid} className="glow-primary">Confirm Bid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Loan Request - P2P-FR-001 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Loan Request</DialogTitle><DialogDescription>Request $5–$500 with 7–90 day repayment. Your ZimScore ({mockUser.creditScore}) will be shown to lenders.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (USD, $5–$500)</Label>
              <Input type="number" placeholder="e.g. 200" value={reqAmount} onChange={e => setReqAmount(e.target.value)} min={5} max={500} />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <select value={reqPurpose} onChange={e => setReqPurpose(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select purpose...</option>
                {purposes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <select value={reqDuration} onChange={e => setReqDuration(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Max Interest Rate (%)</Label>
                <Input type="number" placeholder="e.g. 12" value={reqMaxRate} onChange={e => setReqMaxRate(e.target.value)} min={1} max={30} />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <p>Your request expires after 7 days if no bid is accepted.</p>
              <p className="mt-1">Only one active request is allowed at a time.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateLoanRequest} className="glow-primary">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute - P2P-FR-018 */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>File a Dispute</DialogTitle><DialogDescription>Disputed loans are placed on hold — no automated collections while under review.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Describe the issue..." value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Evidence (required)</Label>
              <label className="flex items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/30 bg-secondary/30">
                {disputeEvidence ? <span className="text-sm text-foreground">{disputeEvidence.name}</span> : <span className="text-sm text-muted-foreground">Upload screenshot, receipt, or document</span>}
                <input type="file" className="hidden" onChange={e => setDisputeEvidence(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDispute}>File Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
