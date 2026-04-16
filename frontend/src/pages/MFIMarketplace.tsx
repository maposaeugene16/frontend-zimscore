import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Star, Search, CheckCircle, Info, Send } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mfiInstitutions, formatCurrency, mockUser, MFIInstitution, MFILoanProduct } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MFIMarketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMFI, setSelectedMFI] = useState<MFIInstitution | null>(null);
  const [applyDialog, setApplyDialog] = useState<{ mfi: MFIInstitution; product: MFILoanProduct } | null>(null);
  const [applyAmount, setApplyAmount] = useState("");
  const [applyReason, setApplyReason] = useState("");

  const filtered = mfiInstitutions.filter(mfi =>
    mfi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mfi.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApply = () => {
    if (!applyAmount || Number(applyAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!applyDialog) return;
    const { product, mfi } = applyDialog;
    const amt = Number(applyAmount);
    if (amt < product.minAmount || amt > product.maxAmount) {
      toast.error(`Amount must be between ${formatCurrency(product.minAmount)} and ${formatCurrency(product.maxAmount)}`);
      return;
    }
    if (mockUser.creditScore < product.minZimScore) {
      toast.error(`Your Zimscore (${mockUser.creditScore}) is below the minimum requirement (${product.minZimScore})`);
      return;
    }
    toast.success(`Application submitted to ${mfi.name}`, { description: `${formatCurrency(amt)} — ${product.name}. Your Zimscore and financial summary have been shared.` });
    setApplyDialog(null); setApplyAmount(""); setApplyReason("");
  };

  return (
    <AppLayout title="MFI Marketplace">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Microfinance Marketplace</h2>
          <p className="text-muted-foreground text-sm">Browse verified MFIs and apply for loans that match your Zimscore</p>
        </div>

        {/* Recommended */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">Recommended for You</span>
            <span className="text-xs text-muted-foreground">(ZimScore: {mockUser.creditScore})</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {mfiInstitutions.flatMap(mfi => mfi.loanProducts.filter(p => p.active && mockUser.creditScore >= p.minZimScore).map(p => (
              <button key={p.id} onClick={() => setApplyDialog({ mfi, product: p })} className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-xs text-success hover:bg-success/20 transition-colors">
                {mfi.name}: {p.name} — {p.interestRate}%
              </button>
            )))}
          </div>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search MFIs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>

        {/* MFI Cards - MFI-FR-002 */}
        <div className="space-y-4">
          {filtered.map((mfi, i) => (
            <motion.div key={mfi.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">{mfi.logo}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">{mfi.name}</h3>
                      {mfi.verified && <CheckCircle className="w-4 h-4 text-success" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Reg: {mfi.registrationNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-accent fill-accent" />
                  <span className="text-sm font-bold">{mfi.rating}</span>
                  <span className="text-xs text-muted-foreground">({mfi.reviewCount})</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{mfi.description}</p>

              {/* Loan Products - MFI-FR-003/005 */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Loan Products</h4>
                {mfi.loanProducts.filter(p => p.active).map(product => {
                  const eligible = mockUser.creditScore >= product.minZimScore;
                  const gap = product.minZimScore - mockUser.creditScore;
                  return (
                    <div key={product.id} className={`flex items-center justify-between p-3 rounded-lg border ${eligible ? "bg-secondary/20 border-border" : "bg-secondary/10 border-border/50 opacity-70"}`}>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.minAmount)}–{formatCurrency(product.maxAmount)} · {product.interestRate}% · {product.repaymentPeriod} · Min ZS: {product.minZimScore}
                        </p>
                        {!eligible && (
                          <p className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Score too low — improve by {gap} points to qualify
                          </p>
                        )}
                      </div>
                      <Button size="sm" disabled={!eligible} onClick={() => setApplyDialog({ mfi, product })} className={eligible ? "glow-primary" : ""}>
                        <Send className="w-3 h-3 mr-1" /> Apply
                      </Button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Apply Dialog - MFI-FR-004 */}
      <Dialog open={!!applyDialog} onOpenChange={open => !open && setApplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {applyDialog?.product.name}</DialogTitle>
            <DialogDescription>at {applyDialog?.mfi.name} — Your Zimscore ({mockUser.creditScore}) and financial summary will be shared.</DialogDescription>
          </DialogHeader>
          {applyDialog && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{applyDialog.product.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Range</span><span>{formatCurrency(applyDialog.product.minAmount)}–{formatCurrency(applyDialog.product.maxAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Interest</span><span>{applyDialog.product.interestRate}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span>{applyDialog.product.repaymentPeriod}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Loan Amount (USD)</Label>
                <Input type="number" placeholder="Enter amount" value={applyAmount} onChange={e => setApplyAmount(e.target.value)} min={applyDialog.product.minAmount} max={applyDialog.product.maxAmount} />
              </div>
              <div className="space-y-2">
                <Label>Purpose (optional)</Label>
                <Textarea placeholder="Why do you need this loan?" value={applyReason} onChange={e => setApplyReason(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialog(null)}>Cancel</Button>
            <Button onClick={handleApply} className="glow-primary">Submit Application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
