import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, FileText, DollarSign, BarChart3, Plus, Send, Download, TrendingUp, TrendingDown, QrCode, MapPin, Package, Receipt } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency, formatDate } from "@/lib/mock-data";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

interface Invoice {
  id: string; client: string; amount: number; status: "draft" | "sent" | "paid"; date: string; description: string;
}
interface SMETransaction {
  id: string; type: "income" | "expense"; amount: number; category: string; description: string; date: string;
}

const txCategories = ["Customer Payment", "Stock Purchase", "Utility", "Rent", "Staff", "Other"];

const mockSMETransactions: SMETransaction[] = [
  { id: "s1", type: "income", amount: 450, category: "Customer Payment", description: "Retail sale - electronics", date: "2024-01-15" },
  { id: "s2", type: "expense", amount: 280, category: "Stock Purchase", description: "Inventory restock", date: "2024-01-14" },
  { id: "s3", type: "income", amount: 320, category: "Customer Payment", description: "Service fee - consulting", date: "2024-01-13" },
  { id: "s4", type: "expense", amount: 150, category: "Utility", description: "Electricity bill", date: "2024-01-12" },
  { id: "s5", type: "expense", amount: 500, category: "Rent", description: "Monthly shop rent", date: "2024-01-10" },
  { id: "s6", type: "income", amount: 680, category: "Customer Payment", description: "Bulk order - hardware", date: "2024-01-08" },
  { id: "s7", type: "expense", amount: 200, category: "Staff", description: "Part-time wages", date: "2024-01-07" },
];

const monthlyData = [
  { month: "Aug", income: 1800, expenses: 1200 },
  { month: "Sep", income: 2100, expenses: 1400 },
  { month: "Oct", income: 1950, expenses: 1300 },
  { month: "Nov", income: 2400, expenses: 1500 },
  { month: "Dec", income: 2200, expenses: 1600 },
  { month: "Jan", income: 2000, expenses: 1320 },
];

export default function SMEHub() {
  const [mainTab, setMainTab] = useState("dashboard");
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: "INV-001", client: "Harare Supplies Co.", amount: 1200, status: "paid", date: "2024-01-10", description: "Office supplies delivery" },
    { id: "INV-002", client: "Bulawayo Tech Ltd.", amount: 3500, status: "sent", date: "2024-01-12", description: "IT consulting services" },
  ]);
  const [smeTx] = useState<SMETransaction[]>(mockSMETransactions);
  const [invClient, setInvClient] = useState(""); const [invAmount, setInvAmount] = useState(""); const [invDesc, setInvDesc] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [bizName, setBizName] = useState("Moyo Electronics"); const [bizCategory, setBizCategory] = useState("Retail");
  const [bizDesc, setBizDesc] = useState("Quality electronics and accessories in Harare CBD");
  const [bizLocation, setBizLocation] = useState("Harare"); const [bizProducts, setBizProducts] = useState("Electronics, Accessories, Repairs");
  const [qrOpen, setQrOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const totalIncome = smeTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = smeTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netCashFlow = totalIncome - totalExpenses;

  // Expense categories breakdown
  const expenseByCategory = txCategories.map(cat => ({
    category: cat,
    amount: smeTx.filter(t => t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0),
  })).filter(c => c.amount > 0);

  const handleCreateInvoice = () => {
    if (!invClient || !invAmount || !invDesc) { toast.error("Fill in all fields"); return; }
    const newInv: Invoice = { id: `INV-${String(invoices.length + 1).padStart(3, "0")}`, client: invClient, amount: Number(invAmount), description: invDesc, status: "draft", date: new Date().toISOString().split("T")[0] };
    setInvoices(prev => [newInv, ...prev]);
    setInvClient(""); setInvAmount(""); setInvDesc("");
    toast.success(`Invoice ${newInv.id} created`);
  };

  const sendInvoice = (id: string) => { setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: "sent" } : inv)); toast.success(`Invoice ${id} sent`); };
  const markPaid = (id: string) => { setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: "paid" } : inv)); toast.success(`Invoice ${id} paid`); };

  const exportCashFlow = () => {
    const csv = ["Date,Description,Category,Type,Amount"].concat(smeTx.map(t => `${t.date},"${t.description}",${t.category},${t.type},${t.type === "income" ? "" : "-"}${t.amount}`)).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "cashflow_statement.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("Cash flow statement exported");
  };

  const statusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", sent: "bg-accent/15 text-accent", paid: "bg-success/15 text-success" };

  return (
    <AppLayout title="SME Hub">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">{bizName}</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-1"><MapPin className="w-3 h-3" /> {bizLocation} · {bizCategory}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setProfileOpen(true)}><Building2 className="w-4 h-4 mr-2" /> Profile</Button>
            <Button variant="outline" onClick={() => setQrOpen(true)}><QrCode className="w-4 h-4 mr-2" /> QR Pay</Button>
          </div>
        </div>

        {/* Key Metrics - SME-FR-004 */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Revenue", value: formatCurrency(totalIncome), icon: TrendingUp, color: "text-success" },
            { label: "Expenses", value: formatCurrency(totalExpenses), icon: TrendingDown, color: "text-destructive" },
            { label: "Net Cash Flow", value: formatCurrency(netCashFlow), icon: DollarSign, color: netCashFlow > 0 ? "text-success" : "text-destructive" },
            { label: "Invoices", value: invoices.length.toString(), icon: FileText, color: "text-primary" },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-display font-bold">{s.value}</p></div>
            </motion.div>
          ))}
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Cash Flow</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Cash Flow Dashboard - SME-FR-004 */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold">Income vs Expenses</h3>
                  <Button size="sm" variant="outline" onClick={exportCashFlow}><Download className="w-3 h-3 mr-1" /> Export</Button>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 96%)" }} />
                    <Bar dataKey="income" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">3-Month Net Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyData.slice(-3)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 96%)" }} />
                    <Line type="monotone" dataKey="income" stroke="hsl(160, 84%, 39%)" strokeWidth={2} name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="hsl(0, 84%, 60%)" strokeWidth={2} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Top Expense Categories */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Top Expense Categories</h3>
              <div className="space-y-3">
                {expenseByCategory.sort((a, b) => b.amount - a.amount).map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm w-32 text-muted-foreground">{cat.category}</span>
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-destructive/50 rounded-full" style={{ width: `${(cat.amount / totalExpenses) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-20 text-right">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Invoices - SME-FR-007 */}
          <TabsContent value="invoices" className="space-y-4 mt-4">
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Create Invoice</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Client name" value={invClient} onChange={e => setInvClient(e.target.value)} />
                <Input type="number" placeholder="Amount (USD)" value={invAmount} onChange={e => setInvAmount(e.target.value)} />
                <Input placeholder="Description" value={invDesc} onChange={e => setInvDesc(e.target.value)} />
              </div>
              <Button onClick={handleCreateInvoice} className="mt-3"><Plus className="w-4 h-4 mr-2" /> Create Invoice</Button>
            </div>
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="p-4 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{inv.id} — {inv.client}</p>
                    <p className="text-xs text-muted-foreground">{inv.description} · {formatDate(inv.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-display font-bold">{formatCurrency(inv.amount)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>{inv.status}</span>
                    {inv.status === "draft" && <Button size="sm" variant="outline" onClick={() => sendInvoice(inv.id)}><Send className="w-3 h-3 mr-1" /> Send</Button>}
                    {inv.status === "sent" && <Button size="sm" variant="outline" onClick={() => markPaid(inv.id)}>Mark Paid</Button>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Transactions - auto-categorised */}
          <TabsContent value="transactions" className="space-y-3 mt-4">
            {smeTx.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tx.type === "income" ? "bg-success/15" : "bg-destructive/15"}`}>
                    {tx.type === "income" ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.date)} · {tx.category}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Business Profile - SME-FR-001 */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Business Profile</DialogTitle><DialogDescription>Your SME profile feeds into your Zimscore.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Business Name</Label><Input value={bizName} onChange={e => setBizName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Category</Label>
              <select value={bizCategory} onChange={e => setBizCategory(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option>Retail</option><option>Services</option><option>Agriculture</option><option>Manufacturing</option><option>Technology</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={bizDesc} onChange={e => setBizDesc(e.target.value)} rows={2} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={bizLocation} onChange={e => setBizLocation(e.target.value)} /></div>
            <div className="space-y-2"><Label>Products/Services</Label><Input value={bizProducts} onChange={e => setBizProducts(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success("Profile updated"); setProfileOpen(false); }}>Save Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Payment - SME-FR-002 */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR Payment Link</DialogTitle><DialogDescription>Share this with customers to receive payments directly to your wallet.</DialogDescription></DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center">
              <QrCode className="w-32 h-32 text-black" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">Wallet: ZIM-WAL-MOYOEL-7742</p>
            <Button variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText("https://zimscore.app/pay/MOYOEL7742"); toast.success("Payment link copied"); }}>Copy Link</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
