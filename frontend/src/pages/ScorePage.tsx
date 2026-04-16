import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreditScoreGauge } from "@/components/dashboard/CreditScoreGauge";
import { mockUser, monthlyScoreHistory, scoreTips, formatDate } from "@/lib/mock-data";
import { TrendingUp, Lightbulb, Upload, FileText, CheckCircle, Info, AlertCircle, BarChart3, ShieldAlert, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const documentTypes = [
  { id: "payslip", label: "Payslip", formats: "PDF / Image", icon: FileText },
  { id: "bank_statement", label: "Bank Statement", formats: "PDF / CSV", icon: FileText },
  { id: "ecocash", label: "EcoCash History", formats: "CSV", icon: FileText },
  { id: "utility", label: "Utility Bill", formats: "PDF / Image", icon: FileText },
];

interface VerifiedStatement {
  id: string;
  verification_status: string;
  confidence: number | null;
  extracted_data: any;
  file_name: string;
  created_at: string;
}

function calculateMaxLoanAmount(score: number): number {
  if (score === 0) return 20;
  if (score < 300) return 50;
  if (score < 500) return 200;
  if (score < 650) return 500;
  if (score < 750) return 1500;
  return 5000;
}

function calculateScoreFromStatements(statements: VerifiedStatement[]): {
  score: number;
  band: string;
  confidence: number;
  breakdown: { label: string; score: number; weight: number; color: string }[];
} {
  if (statements.length === 0) {
    return {
      score: 0,
      band: "No Data",
      confidence: 0,
      breakdown: [
        { label: "Income Stability", score: 0, weight: 35, color: "hsl(160, 84%, 39%)" },
        { label: "Expense Ratio", score: 0, weight: 30, color: "hsl(224, 76%, 48%)" },
        { label: "Payment History", score: 0, weight: 20, color: "hsl(45, 93%, 58%)" },
        { label: "Savings Behaviour", score: 0, weight: 15, color: "hsl(280, 70%, 55%)" },
      ],
    };
  }

  // Use extracted data from verified statements to build score
  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;
  let avgConfidence = 0;

  for (const stmt of statements) {
    avgConfidence += (stmt.confidence ?? 50);
    if (stmt.extracted_data) {
      const data = typeof stmt.extracted_data === "string" ? JSON.parse(stmt.extracted_data) : stmt.extracted_data;
      totalIncome += Number(data.total_credits ?? data.totalIncome ?? data.total_income ?? 0);
      totalExpenses += Number(data.total_debits ?? data.totalExpenses ?? data.total_expenses ?? 0);
      transactionCount += Number(data.transaction_count ?? data.transactionCount ?? 0);
    }
  }

  avgConfidence = avgConfidence / statements.length;

  // Income Stability: based on having consistent data
  const incomeScore = totalIncome > 0 ? Math.min(100, 40 + statements.length * 15) : 0;

  // Expense Ratio
  const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1;
  const expenseScore = expenseRatio <= 0.5 ? 100 : Math.max(0, 100 - (expenseRatio - 0.5) * 200);

  // Payment History: more statements = more history
  const paymentScore = Math.min(100, statements.length * 25);

  // Savings Behaviour
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
  const savingsScore = savingsRate > 0 ? Math.min(100, savingsRate * 200) : 0;

  const baseScore =
    incomeScore * 0.35 +
    expenseScore * 0.3 +
    paymentScore * 0.2 +
    savingsScore * 0.15;

  const finalScore = Math.max(0, Math.min(850, Math.round(baseScore * 8.5)));
  const confidence = Math.min(90, avgConfidence);

  const band =
    finalScore >= 750 ? "Excellent" :
    finalScore >= 650 ? "Very Good" :
    finalScore >= 500 ? "Good" :
    finalScore >= 300 ? "Fair" : "Poor";

  return {
    score: finalScore,
    band,
    confidence: Math.round(confidence),
    breakdown: [
      { label: "Income Stability", score: Math.round(incomeScore), weight: 35, color: "hsl(160, 84%, 39%)" },
      { label: "Expense Ratio", score: Math.round(expenseScore), weight: 30, color: "hsl(224, 76%, 48%)" },
      { label: "Payment History", score: Math.round(paymentScore), weight: 20, color: "hsl(45, 93%, 58%)" },
      { label: "Savings Behaviour", score: Math.round(savingsScore), weight: 15, color: "hsl(280, 70%, 55%)" },
    ],
  };
}

export default function ScorePage() {
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  // TODO: Replace these three state declarations with implementation
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File | null>>({});
  const [docVerifications, setDocVerifications] = useState<Record<string, { status: "verified" | "rejected" | "pending"; reason?: string }>>({});
  const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [manualBudgetOpen, setManualBudgetOpen] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [monthlySavings, setMonthlySavings] = useState("");

  const [verifiedStatements, setVerifiedStatements] = useState<VerifiedStatement[]>([]);
  const [isLoadingScore, setIsLoadingScore] = useState(true);

  // Fetch verified documents from DB
  useEffect(() => {
    const fetchVerifiedDocs = async () => {
      if (!user) {
        setIsLoadingScore(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("ecocash_statements")
          .select("id, verification_status, confidence, extracted_data, file_name, created_at")
          .eq("user_id", user.id)
          .eq("verification_status", "verified");

        if (error) throw error;
        setVerifiedStatements((data as VerifiedStatement[]) || []);
      } catch (err) {
        console.error("Failed to fetch verified statements", err);
      } finally {
        setIsLoadingScore(false);
      }
    };
    fetchVerifiedDocs();
  }, [user]);

  const scoreResult = calculateScoreFromStatements(verifiedStatements);
  const zimScore = scoreResult.score;
  const band = scoreResult.band;
  const confidence = scoreResult.confidence;
  const breakdownSource = scoreResult.breakdown;
  const maxLoan = calculateMaxLoanAmount(zimScore);

  const bandColor =
    zimScore >= 750 ? "text-success" :
    zimScore >= 650 ? "text-primary" :
    zimScore >= 500 ? "text-accent" :
    zimScore > 0 ? "text-destructive" : "text-muted-foreground";

  // TODO: Paste fileToBase64 helper here
  const fileToBase64 = async (_file: File): Promise<string> => {
    // stub — replace with implementation
    return "";
  };

  // TODO: Paste getDocLabel helper here
  const getDocLabel = (_docId: string): string => {
    // stub — replace with implementation
    return _docId;
  };

  // TODO: Paste handleFileUpload (with supabase.functions.invoke) here
  const handleFileUpload = (docType: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploadedDocs(prev => ({ ...prev, [docType]: file }));
    toast.success(`${file.name} uploaded — paste AI verification logic here`);
    // TODO: call supabase.functions.invoke("verify-financial-document", ...) here
  };

  // TODO: Paste handleProcessDocuments (verified-only submission) here
  const handleProcessDocuments = () => {
    const count = Object.values(uploadedDocs).filter(Boolean).length;
    if (count === 0) { toast.error("Please upload at least one document"); return; }
    // TODO: filter to only verified docs before submitting
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      toast.success("Documents processed. Score updated!", { description: `${count} document(s) analysed` });
      setUploadOpen(false);
      setUploadedDocs({});
    }, 3000);
  };

  const handleManualBudget = () => {
    if (!monthlyIncome || !monthlyExpenses) { toast.error("Please enter income and expenses"); return; }
    toast.success("Budget data submitted. Score will update within 60 seconds.");
    setManualBudgetOpen(false);
    setMonthlyIncome(""); setMonthlyExpenses(""); setMonthlySavings("");
  };

  return (
    <AppLayout title="Credit Score">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Your Zimscore</h2>
            <p className="text-muted-foreground text-sm">AI-powered credit assessment based on verified documents</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setManualBudgetOpen(true)}>
              <BarChart3 className="w-4 h-4 mr-2" /> Manual Budget
            </Button>
            <Button onClick={() => setUploadOpen(true)} className="glow-primary">
              <Upload className="w-4 h-4 mr-2" /> Upload Documents
            </Button>
          </div>
        </div>

        {/* No documents warning */}
        {!isLoadingScore && verifiedStatements.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-accent/30 bg-accent/5 flex items-start gap-3"
          >
            <ShieldAlert className="w-6 h-6 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">No verified documents found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your credit score is <span className="font-bold text-foreground">0</span> because you haven't uploaded any verified financial documents.
                Upload your EcoCash statements, bank statements, or receipts to build your credit score.
                Without verified documents, the maximum loan you can receive is <span className="font-bold text-foreground">$20.00</span>.
              </p>
              <Button size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Upload Now
              </Button>
            </div>
          </motion.div>
        )}

        {/* Max Loan Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-sm text-muted-foreground">Maximum Eligible Loan Amount</p>
            <p className="font-display text-2xl font-bold">${maxLoan.toLocaleString()}.00</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Verified Documents</p>
            <p className="font-display text-2xl font-bold">{verifiedStatements.length}</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gauge + Confidence */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex flex-col items-center">
            <h3 className="font-display text-lg font-semibold mb-4">Your Credit Score</h3>
            {isLoadingScore ? (
              <div className="flex flex-col items-center justify-center h-[200px] w-[200px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-sm text-muted-foreground animate-pulse">Checking verified documents...</p>
              </div>
            ) : (
              <>
                <CreditScoreGauge score={zimScore} maxScore={850} />
                <div className="flex items-center gap-2 mt-3">
                  <span className={`font-display font-bold text-lg ${bandColor}`}>{band}</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs text-muted-foreground w-48 hidden group-hover:block z-10">
                      Zimscore ranges from 0–850. Score is based on verified documents only. No documents = score of 0.
                    </div>
                  </div>
                </div>
                {/* Confidence Level */}
                <div className="mt-4 w-full p-3 rounded-lg bg-secondary/40 border border-border">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Confidence Level
                      <div className="group relative inline-block">
                        <Info className="w-3 h-3 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs w-44 hidden group-hover:block z-10">
                          Based on number of verified documents. More verified documents = higher confidence.
                        </div>
                      </div>
                    </span>
                    <span className="font-bold">{confidence}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${confidence}%` }} transition={{ duration: 1 }} />
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Based on {verifiedStatements.length} verified document{verifiedStatements.length !== 1 ? "s" : ""} · Last updated: {formatDate(new Date().toISOString())}
                </p>
              </>
            )}
          </motion.div>

          {/* Score History */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Score History</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyScoreHistory}>
                <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 850]} stroke="hsl(215, 20%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 96%)" }}
                  formatter={(value: number) => [value, "Zimscore"]}
                />
                <Line type="monotone" dataKey="score" stroke="hsl(224, 76%, 48%)" strokeWidth={2.5} dot={{ fill: "hsl(224, 76%, 48%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Score Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Score Breakdown</h3>
            <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-secondary border border-border">
              {verifiedStatements.length > 0 ? "Document-Based" : "No Data"}
            </span>
          </div>
          <div className="space-y-4">
            {isLoadingScore ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>
            ) : (
              breakdownSource.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      {item.label}
                      <span className="text-muted-foreground">({item.weight}%)</span>
                    </span>
                    <span className="font-semibold">{item.score}/100</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: item.color }} initial={{ width: 0 }} animate={{ width: `${item.score}%` }} transition={{ duration: 1.5 }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Improvement Tips */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-accent" />
            <h3 className="font-display text-lg font-semibold">How to Improve Your Score</h3>
          </div>
          <div className="space-y-3">
            {verifiedStatements.length === 0 ? (
              <>
                <div className="p-4 rounded-lg border bg-accent/5 border-accent/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Upload your EcoCash or bank statement</p>
                    <p className="text-xs text-muted-foreground mt-1">This is the most impactful step. Your score is 0 until you upload verified financial documents.</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-secondary/40 border-border flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm">Upload receipts showing consistent bill payments</p>
                    <p className="text-xs text-muted-foreground mt-1">Utility bills, rent receipts, and other regular payments help build your payment history.</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-secondary/40 border-border flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm">Upload multiple months of statements for higher confidence</p>
                    <p className="text-xs text-muted-foreground mt-1">More data means more accurate scoring and access to larger loans.</p>
                  </div>
                </div>
              </>
            ) : (
              scoreTips.map((tip, i) => (
                <div key={i} className={`p-4 rounded-lg border ${tip.completed ? "bg-success/5 border-success/20" : "bg-secondary/40 border-border"} flex items-start gap-3`}>
                  {tip.completed ? (
                    <CheckCircle className="w-5 h-5 text-success mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm ${tip.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{tip.tip}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-success font-medium">{tip.impact}</span>
                      <span>{tip.timeframe}</span>
                      <span className="px-1.5 py-0.5 rounded bg-secondary border border-border">{tip.subScore}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Document Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Financial Documents</DialogTitle>
            <DialogDescription>Upload genuine EcoCash statements, bank statements, or receipts. Fake documents will be detected and rejected by our AI verification system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-sm">
              <p className="font-medium mb-2">{Object.values(uploadedDocs).filter(Boolean).length} of {documentTypes.length} documents uploaded</p>
              <div className="flex gap-1">
                {documentTypes.map((doc) => (
                  <div key={doc.id} className={`flex-1 h-1.5 rounded-full ${uploadedDocs[doc.id] ? "bg-success" : "bg-secondary"}`} />
                ))}
              </div>
            </div>
            {/* TODO: Replace this entire documentTypes.map() block with AI-verification-aware version */}
            {documentTypes.map((doc) => {
              const verification = docVerifications[doc.id];
              const isVerifying = verifyingDoc === doc.id;
              const isVerified = verification?.status === "verified";
              const isRejected = verification?.status === "rejected";
              return (
                <label
                  key={doc.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                    ${isVerified ? "bg-success/5 border-success/40" : ""}
                    ${isRejected ? "bg-destructive/5 border-destructive/40" : ""}
                    ${!isVerified && !isRejected ? "bg-secondary/30 border-border hover:border-primary/30" : ""}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <doc.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {/* TODO: show rejection reason inline when isRejected */}
                        {isRejected && verification?.reason ? verification.reason : doc.formats}
                      </p>
                    </div>
                  </div>
                  {isVerifying ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : isVerified ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : isRejected ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <span className="text-xs text-primary">Upload</span>
                  )}
                  <input type="file" accept=".pdf,.csv,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload(doc.id)} />
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleProcessDocuments} disabled={processing} className="glow-primary">
              {processing ? "Processing..." : "Process Documents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Budget Entry Dialog */}
      <Dialog open={manualBudgetOpen} onOpenChange={setManualBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Budget Entry</DialogTitle>
            <DialogDescription>Enter your monthly financial data. Note: manual entry alone won't build your credit score — upload verified documents for the best results.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Monthly Income (USD)</Label><input type="number" placeholder="0.00" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><Label>Monthly Expenses (USD)</Label><input type="number" placeholder="0.00" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary" /></div>
            <div className="space-y-2"><Label>Monthly Savings (USD)</Label><input type="number" placeholder="0.00" value={monthlySavings} onChange={e => setMonthlySavings(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary" /></div>
            {monthlyIncome && monthlyExpenses && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <p className="text-muted-foreground">Expense Ratio: <span className="font-bold text-foreground">{((Number(monthlyExpenses) / Number(monthlyIncome)) * 100).toFixed(0)}%</span></p>
                <p className="text-xs text-muted-foreground mt-1">Keep below 60% for optimal scoring</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualBudgetOpen(false)}>Cancel</Button>
            <Button onClick={handleManualBudget}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
