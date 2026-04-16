import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/mock-data";
import {
  Building2, DollarSign, Users, Activity, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, XCircle, Eye, Clock, FileText,
  BarChart3, Download, Bell, Settings, Shield, ShieldAlert,
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Filter,
  Loader2, ChevronRight, ArrowUpRight, ArrowDownRight, Landmark,
  Calendar, CreditCard, Banknote, PieChart, Package, BookOpen,
  Info, Star, Phone, Mail, Globe, Lock, Key, UserCheck, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart as RePieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LoanApplication {
  id: string;
  applicantName: string;
  applicantId: string;
  zimScore: number;
  amount: number;
  purpose: string;
  product: string;
  appliedAt: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  confidence: number;
  monthlyIncome?: number;
}

interface ActiveLoan {
  id: string;
  borrower: string;
  amount: number;
  outstanding: number;
  interestRate: number;
  disbursedAt: string;
  nextPayment: string;
  nextPaymentAmount: number;
  status: "current" | "late_30" | "late_60" | "late_90" | "default";
  zimScore: number;
  paidInstallments: number;
  totalInstallments: number;
}

interface LoanProduct {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  repaymentPeriod: string;
  minZimScore: number;
  active: boolean;
  applications: number;
  disbursed: number;
}

interface FINotification {
  id: string;
  type: "application" | "payment" | "default" | "score_drop" | "system";
  title: string;
  message: string;
  read: boolean;
  time: string;
  severity: "low" | "medium" | "high";
}

// ─── Mock FI Data ────────────────────────────────────────────────────────────

const fiInstitution = {
  name: "ZimFin Microfinance",
  regNumber: "MFI-2021-0045",
  contactEmail: "admin@zimfin.co.zw",
  phone: "+263 77 123 4567",
  website: "www.zimfin.co.zw",
  licenseExpiry: "2027-12-31",
};

const mockApplications: LoanApplication[] = [
  { id: "app1", applicantName: "Tendai Moyo", applicantId: "USR-001", zimScore: 742, amount: 1500, purpose: "Business Expansion", product: "Small Business Starter", appliedAt: "2026-04-12T09:30:00Z", status: "pending", confidence: 88, monthlyIncome: 850 },
  { id: "app2", applicantName: "Grace Chirume", applicantId: "USR-002", zimScore: 685, amount: 800, purpose: "School Fees", product: "Education Loan", appliedAt: "2026-04-11T14:20:00Z", status: "under_review", confidence: 75, monthlyIncome: 620 },
  { id: "app3", applicantName: "Peter Zulu", applicantId: "USR-003", zimScore: 590, amount: 500, purpose: "Medical Bills", product: "Quick Cash", appliedAt: "2026-04-10T11:00:00Z", status: "pending", confidence: 62, monthlyIncome: 400 },
  { id: "app4", applicantName: "Mary Dube", applicantId: "USR-004", zimScore: 810, amount: 5000, purpose: "Farm Equipment", product: "Growth Capital", appliedAt: "2026-04-09T08:45:00Z", status: "approved", confidence: 95, monthlyIncome: 1400 },
  { id: "app5", applicantName: "Samuel Ncube", applicantId: "USR-005", zimScore: 420, amount: 200, purpose: "Vehicle Repair", product: "Quick Cash", appliedAt: "2026-04-08T16:10:00Z", status: "rejected", confidence: 38, monthlyIncome: 250 },
  { id: "app6", applicantName: "Chipo Mukoyi", applicantId: "USR-006", zimScore: 710, amount: 2500, purpose: "Inventory", product: "Small Business Starter", appliedAt: "2026-04-07T10:00:00Z", status: "approved", confidence: 82, monthlyIncome: 950 },
];

const mockActiveLoans: ActiveLoan[] = [
  { id: "ln1", borrower: "Mary Dube", amount: 5000, outstanding: 4200, interestRate: 10, disbursedAt: "2026-03-01", nextPayment: "2026-05-01", nextPaymentAmount: 467, status: "current", zimScore: 810, paidInstallments: 1, totalInstallments: 12 },
  { id: "ln2", borrower: "Chipo Mukoyi", amount: 2500, outstanding: 2100, interestRate: 8, disbursedAt: "2026-03-15", nextPayment: "2026-04-15", nextPaymentAmount: 218, status: "late_30", zimScore: 680, paidInstallments: 0, totalInstallments: 12 },
  { id: "ln3", borrower: "John Nyathi", amount: 1200, outstanding: 600, interestRate: 8, disbursedAt: "2025-10-01", nextPayment: "2026-05-01", nextPaymentAmount: 108, status: "current", zimScore: 722, paidInstallments: 6, totalInstallments: 12 },
  { id: "ln4", borrower: "Rudo Makoni", amount: 800, outstanding: 800, interestRate: 10, disbursedAt: "2026-02-01", nextPayment: "2026-04-01", nextPaymentAmount: 87, status: "late_60", zimScore: 510, paidInstallments: 0, totalInstallments: 10 },
  { id: "ln5", borrower: "Tapiwa Gomo", amount: 3000, outstanding: 650, interestRate: 9, disbursedAt: "2025-06-01", nextPayment: "2026-05-01", nextPaymentAmount: 290, status: "default", zimScore: 340, paidInstallments: 7, totalInstallments: 12 },
];

const mockProducts: LoanProduct[] = [
  { id: "lp1", name: "Small Business Starter", minAmount: 100, maxAmount: 2000, interestRate: 8, repaymentPeriod: "3–12 months", minZimScore: 550, active: true, applications: 34, disbursed: 28000 },
  { id: "lp2", name: "Growth Capital", minAmount: 2000, maxAmount: 10000, interestRate: 10, repaymentPeriod: "6–24 months", minZimScore: 650, active: true, applications: 12, disbursed: 85000 },
  { id: "lp3", name: "Quick Cash", minAmount: 20, maxAmount: 500, interestRate: 10, repaymentPeriod: "7–30 days", minZimScore: 400, active: true, applications: 78, disbursed: 12500 },
  { id: "lp4", name: "Education Loan", minAmount: 200, maxAmount: 5000, interestRate: 8, repaymentPeriod: "6–18 months", minZimScore: 600, active: false, applications: 9, disbursed: 14000 },
];

const mockFINotifications: FINotification[] = [
  { id: "fn1", type: "application", title: "New Loan Application", message: "Tendai Moyo has applied for $1,500 (Small Business Starter). ZimScore: 742.", read: false, time: "2026-04-12T09:30:00Z", severity: "low" },
  { id: "fn2", type: "default", title: "Loan Default Alert", message: "Tapiwa Gomo's loan of $3,000 has been past due 90+ days. Immediate action required.", read: false, time: "2026-04-11T08:00:00Z", severity: "high" },
  { id: "fn3", type: "payment", title: "Payment Overdue – 60 Days", message: "Rudo Makoni's payment of $87 is 60 days overdue. Consider escalation.", read: false, time: "2026-04-10T07:00:00Z", severity: "high" },
  { id: "fn4", type: "score_drop", title: "Borrower Score Drop Alert", message: "Chipo Mukoyi's ZimScore dropped from 710 to 680. Monitor repayment.", read: true, time: "2026-04-09T12:00:00Z", severity: "medium" },
  { id: "fn5", type: "application", title: "Application Received", message: "Grace Chirume applied for $800 (Education Loan). ZimScore: 685.", read: true, time: "2026-04-08T14:00:00Z", severity: "low" },
];

const disbursementData = [
  { month: "Nov", disbursed: 48000, repaid: 38000, defaulted: 2100 },
  { month: "Dec", disbursed: 52000, repaid: 44000, defaulted: 1800 },
  { month: "Jan", disbursed: 61000, repaid: 51000, defaulted: 2400 },
  { month: "Feb", disbursed: 58000, repaid: 49000, defaulted: 2200 },
  { month: "Mar", disbursed: 74000, repaid: 61000, defaulted: 2900 },
  { month: "Apr", disbursed: 82000, repaid: 68000, defaulted: 1600 },
];

const scoreDistribution = [
  { band: "750–850", count: 18, fill: "hsl(160, 84%, 39%)" },
  { band: "650–749", count: 31, fill: "hsl(224, 76%, 48%)" },
  { band: "550–649", count: 24, fill: "hsl(45, 93%, 58%)" },
  { band: "400–549", count: 14, fill: "hsl(28, 100%, 55%)" },
  { band: "0–399", count: 6, fill: "hsl(0, 84%, 60%)" },
];

const parData = [
  { name: "Current", value: 82, fill: "hsl(160, 84%, 39%)" },
  { name: "PAR 30", value: 9, fill: "hsl(45, 93%, 58%)" },
  { name: "PAR 60", value: 5, fill: "hsl(28, 100%, 55%)" },
  { name: "PAR 90+", value: 4, fill: "hsl(0, 84%, 60%)" },
];

// ─── Helper Components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    pending: "bg-accent/15 text-accent border-accent/30",
    under_review: "bg-primary/15 text-primary border-primary/30",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    current: "bg-success/15 text-success border-success/30",
    late_30: "bg-accent/15 text-accent border-accent/30",
    late_60: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    late_90: "bg-destructive/15 text-destructive border-destructive/30",
    default: "bg-destructive/15 text-destructive border-destructive/30",
    active: "bg-success/15 text-success border-success/30",
    inactive: "bg-muted/40 text-muted-foreground border-border",
  };
  const label = status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {label}
    </span>
  );
}

function ZimScoreBar({ score }: { score: number }) {
  const pct = (score / 850) * 100;
  const color = score >= 750 ? "hsl(160,84%,39%)" : score >= 650 ? "hsl(224,76%,48%)" : score >= 500 ? "hsl(45,93%,58%)" : "hsl(0,84%,60%)";
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-sm font-bold w-8 shrink-0" style={{ color }}>{score}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FIPortal() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState("overview");
  const [appSearch, setAppSearch] = useState("");
  const [appFilter, setAppFilter] = useState("all");
  const [loanFilter, setLoanFilter] = useState("all");
  const [viewApp, setViewApp] = useState<LoanApplication | null>(null);
  const [viewLoan, setViewLoan] = useState<ActiveLoan | null>(null);
  const [notifications, setNotifications] = useState<FINotification[]>(mockFINotifications);
  const [products, setProducts] = useState<LoanProduct[]>(mockProducts);
  const [productDialog, setProductDialog] = useState<LoanProduct | "new" | null>(null);
  const [applications, setApplications] = useState<LoanApplication[]>(mockApplications);
  const [rejectReason, setRejectReason] = useState("");

  // Product form state
  const [pName, setPName] = useState("");
  const [pMin, setPMin] = useState("");
  const [pMax, setPMax] = useState("");
  const [pRate, setPRate] = useState("");
  const [pPeriod, setPPeriod] = useState("");
  const [pScore, setPScore] = useState("");

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingApps = applications.filter(a => a.status === "pending" || a.status === "under_review");
  const totalOutstanding = mockActiveLoans.reduce((s, l) => s + l.outstanding, 0);
  const totalDisbursed = mockActiveLoans.reduce((s, l) => s + l.amount, 0);
  const defaultCount = mockActiveLoans.filter(l => l.status === "default").length;
  const lateCount = mockActiveLoans.filter(l => l.status.startsWith("late")).length;
  const portfolioAtRisk = ((mockActiveLoans.filter(l => l.status !== "current").reduce((s, l) => s + l.outstanding, 0) / totalOutstanding) * 100).toFixed(1);

  // Application actions
  const handleApprove = (app: LoanApplication) => {
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "approved" } : a));
    toast.success(`Application approved for ${app.applicantName}`, { description: `$${app.amount.toLocaleString()} – ${app.product}` });
    setViewApp(null);
  };

  const handleReject = (app: LoanApplication) => {
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "rejected" } : a));
    toast.success(`Application rejected`, { description: rejectReason });
    setViewApp(null);
    setRejectReason("");
  };

  const handleMarkUnderReview = (app: LoanApplication) => {
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "under_review" } : a));
    toast.success(`Marked as Under Review`);
    setViewApp(null);
  };

  // Product actions
  const openNewProduct = () => {
    setPName(""); setPMin(""); setPMax(""); setPRate(""); setPPeriod(""); setPScore("");
    setProductDialog("new");
  };

  const openEditProduct = (p: LoanProduct) => {
    setPName(p.name); setPMin(String(p.minAmount)); setPMax(String(p.maxAmount));
    setPRate(String(p.interestRate)); setPPeriod(p.repaymentPeriod); setPScore(String(p.minZimScore));
    setProductDialog(p);
  };

  const handleSaveProduct = () => {
    if (!pName || !pMin || !pMax || !pRate || !pPeriod || !pScore) { toast.error("Fill in all fields"); return; }
    if (productDialog === "new") {
      const newP: LoanProduct = { id: `lp${Date.now()}`, name: pName, minAmount: +pMin, maxAmount: +pMax, interestRate: +pRate, repaymentPeriod: pPeriod, minZimScore: +pScore, active: true, applications: 0, disbursed: 0 };
      setProducts(prev => [...prev, newP]);
      toast.success("Loan product created");
    } else if (productDialog && productDialog !== "new") {
      setProducts(prev => prev.map(p => p.id === (productDialog as LoanProduct).id ? { ...p, name: pName, minAmount: +pMin, maxAmount: +pMax, interestRate: +pRate, repaymentPeriod: pPeriod, minZimScore: +pScore } : p));
      toast.success("Product updated");
    }
    setProductDialog(null);
  };

  const toggleProduct = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success("Product removed");
  };

  // Notifications
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  // Export
  const exportCSV = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join(",");
    const vals = rows.map(r => Object.values(r).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + vals], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} exported`);
  };

  const filteredApps = applications
    .filter(a => appFilter === "all" || a.status === appFilter)
    .filter(a => !appSearch || a.applicantName.toLowerCase().includes(appSearch.toLowerCase()) || a.purpose.toLowerCase().includes(appSearch.toLowerCase()));

  const filteredLoans = mockActiveLoans.filter(l => loanFilter === "all" || l.status === loanFilter);

  const notifIcon = (type: string, severity: string) => {
    if (type === "default" || severity === "high") return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (type === "application") return <FileText className="w-4 h-4 text-primary" />;
    if (type === "payment") return <DollarSign className="w-4 h-4 text-accent" />;
    if (type === "score_drop") return <TrendingDown className="w-4 h-4 text-orange-400" />;
    return <Bell className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <AppLayout title="FI Portal">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Landmark className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">{fiInstitution.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-success" /> Verified Institution · {fiInstitution.regNumber}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="relative" onClick={() => setTab("notifications")}>
              <Bell className="w-4 h-4 mr-2" /> Alerts
              {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
            </Button>
            <Button onClick={() => setTab("products")} className="glow-primary">
              <Plus className="w-4 h-4 mr-2" /> New Product
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications" className="relative">
              Applications
              {pendingApps.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">{pendingApps.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="portfolio">Loan Portfolio</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="notifications" className="relative">
              Notifications
              {unreadCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-destructive text-white text-[10px] font-bold">{unreadCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ── 1. OVERVIEW ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Portfolio" value={formatCurrency(totalOutstanding)} subtitle="Outstanding balance" icon={DollarSign} trend={{ value: "8.4% vs last month", positive: true }} />
              <StatCard title="Active Loans" value={mockActiveLoans.length.toString()} subtitle={`${lateCount} overdue`} icon={Activity} trend={{ value: `${lateCount} need action`, positive: false }} />
              <StatCard title="Pending Applications" value={pendingApps.length.toString()} subtitle="Awaiting your review" icon={Clock} />
              <StatCard title="Portfolio at Risk" value={`${portfolioAtRisk}%`} subtitle="PAR (all aging)" icon={AlertTriangle} trend={{ value: "2.1% below avg", positive: true }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Loan volume mini chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold">Monthly Disbursement vs Repayment</h3>
                  <Button size="sm" variant="outline" onClick={() => exportCSV(disbursementData, "disbursement_report.csv")}>
                    <Download className="w-3 h-3 mr-1" /> Export
                  </Button>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={disbursementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
                    <XAxis dataKey="month" stroke="hsl(215,20%,55%)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215,20%,55%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,18%)", borderRadius: "8px", color: "hsl(210,40%,96%)" }} formatter={(v: number) => [formatCurrency(v)]} />
                    <Line type="monotone" dataKey="disbursed" stroke="hsl(224,76%,48%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(224,76%,48%)" }} name="Disbursed" />
                    <Line type="monotone" dataKey="repaid" stroke="hsl(160,84%,39%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(160,84%,39%)" }} name="Repaid" />
                    <Line type="monotone" dataKey="defaulted" stroke="hsl(0,84%,60%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(0,84%,60%)" }} name="Defaulted" strokeDasharray="4 4" />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {/* PAR breakdown */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">Portfolio Quality</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie data={parData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {parData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,18%)", borderRadius: "8px" }} />
                    <Legend iconType="circle" />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {parData.map(d => (
                    <div key={d.name} className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.fill }} />{d.name}</span>
                      <span className="font-bold">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Recent Applications */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold">Recent Applications</h3>
                <Button variant="ghost" size="sm" onClick={() => setTab("applications")}>View All <ChevronRight className="w-3 h-3 ml-1" /></Button>
              </div>
              <div className="space-y-2">
                {applications.slice(0, 4).map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                        {app.applicantName.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{app.applicantName}</p>
                        <p className="text-xs text-muted-foreground">{app.product} · {formatCurrency(app.amount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ZimScoreBar score={app.zimScore} />
                      <StatusBadge status={app.status} />
                      <Button variant="ghost" size="sm" onClick={() => { setViewApp(app); }}><Eye className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* ── 2. APPLICATIONS ─────────────────────────────────────────── */}
          <TabsContent value="applications" className="space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold">Loan Applications</h3>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search applicant…" value={appSearch} onChange={e => setAppSearch(e.target.value)} className="pl-9 bg-secondary border-border w-52" />
                </div>
                <Button variant="outline" size="sm" onClick={() => exportCSV(applications, "applications.csv")}><Download className="w-3 h-3 mr-1" /> Export</Button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 flex-wrap">
              {["all", "pending", "under_review", "approved", "rejected"].map(f => (
                <button key={f} onClick={() => setAppFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${appFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? "All" : f.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  {f !== "all" && <span className="ml-1">({applications.filter(a => a.status === f).length})</span>}
                </button>
              ))}
            </div>

            <motion.div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Applicant</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ZimScore</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Applied</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No applications match your filters.</td></tr>
                    ) : filteredApps.map((app, i) => (
                      <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {app.applicantName.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <p className="font-medium">{app.applicantName}</p>
                              <p className="text-xs text-muted-foreground">{app.applicantId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 w-36"><ZimScoreBar score={app.zimScore} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{app.product}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(app.amount)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(app.appliedAt)}</td>
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewApp(app)}><Eye className="w-3.5 h-3.5" /></Button>
                            {(app.status === "pending" || app.status === "under_review") && (
                              <>
                                <Button variant="ghost" size="sm" className="text-success hover:text-success hover:bg-success/10" onClick={() => handleApprove(app)}><CheckCircle className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setViewApp(app); }}><XCircle className="w-3.5 h-3.5" /></Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── 3. PORTFOLIO ─────────────────────────────────────────────── */}
          <TabsContent value="portfolio" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Disbursed" value={formatCurrency(totalDisbursed)} icon={Banknote} />
              <StatCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={CreditCard} trend={{ value: `${portfolioAtRisk}% at risk`, positive: false }} />
              <StatCard title="Late Loans" value={lateCount.toString()} subtitle="30–90 days overdue" icon={Clock} />
              <StatCard title="Defaults" value={defaultCount.toString()} subtitle="90+ days" icon={AlertTriangle} />
            </div>

            <div className="flex gap-1 flex-wrap">
              {["all", "current", "late_30", "late_60", "default"].map(f => (
                <button key={f} onClick={() => setLoanFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${loanFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? "All" : f.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => exportCSV(mockActiveLoans, "loan_portfolio.csv")}><Download className="w-3 h-3 mr-1" /> Export</Button>
            </div>

            <motion.div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Borrower</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Disbursed</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Outstanding</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ZimScore</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Next Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((loan, i) => (
                      <motion.tr key={loan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {loan.borrower.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="font-medium">{loan.borrower}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(loan.amount)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(loan.outstanding)}</td>
                        <td className="px-4 py-3 w-32"><ZimScoreBar score={loan.zimScore} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(loan.paidInstallments / loan.totalInstallments) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{loan.paidInstallments}/{loan.totalInstallments}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p>{formatDate(loan.nextPayment)}</p>
                          <p className="text-muted-foreground">{formatCurrency(loan.nextPaymentAmount)}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={loan.status} /></td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setViewLoan(loan)}><Eye className="w-3.5 h-3.5" /></Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── 4. PRODUCTS ──────────────────────────────────────────────── */}
          <TabsContent value="products" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Loan Products</h3>
              <Button onClick={openNewProduct} className="glow-primary"><Plus className="w-4 h-4 mr-2" /> Create Product</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {products.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass-card p-5 transition-all ${!p.active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold">{p.name}</h4>
                        <StatusBadge status={p.active ? "active" : "inactive"} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Min Score: {p.minZimScore} · {p.repaymentPeriod}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => toggleProduct(p.id)}>
                        {p.active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditProduct(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteProduct(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mt-3">
                    <div className="p-2 rounded-lg bg-secondary/40 border border-border">
                      <p className="text-xs text-muted-foreground">Range</p>
                      <p className="text-xs font-semibold">{formatCurrency(p.minAmount)}–{formatCurrency(p.maxAmount)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/40 border border-border">
                      <p className="text-xs text-muted-foreground">Rate</p>
                      <p className="text-sm font-bold text-primary">{p.interestRate}% p.a.</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/40 border border-border">
                      <p className="text-xs text-muted-foreground">Applications</p>
                      <p className="text-sm font-bold">{p.applications}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Total Disbursed</span>
                    <span className="font-semibold text-foreground">{formatCurrency(p.disbursed)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── 5. ANALYTICS ─────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Disbursement bar chart */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold">Disbursement Trend</h3>
                  <Button size="sm" variant="outline" onClick={() => exportCSV(disbursementData, "disbursement_report.csv")}><Download className="w-3 h-3 mr-1" /> CSV</Button>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={disbursementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
                    <XAxis dataKey="month" stroke="hsl(215,20%,55%)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215,20%,55%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,18%)", borderRadius: "8px", color: "hsl(210,40%,96%)" }} formatter={(v: number) => [formatCurrency(v)]} />
                    <Bar dataKey="disbursed" fill="hsl(224,76%,48%)" radius={[4, 4, 0, 0]} name="Disbursed" />
                    <Bar dataKey="repaid" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} name="Repaid" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Score distribution */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">Borrower ZimScore Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreDistribution} layout="vertical">
                    <XAxis type="number" stroke="hsl(215,20%,55%)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="band" stroke="hsl(215,20%,55%)" fontSize={11} tickLine={false} axisLine={false} width={60} />
                    <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,18%)", borderRadius: "8px", color: "hsl(210,40%,96%)" }} formatter={(v: number) => [v, "Borrowers"]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {scoreDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Performance Summary */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Portfolio Performance Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Disbursed (6mo)", value: formatCurrency(disbursementData.reduce((s, d) => s + d.disbursed, 0)), color: "text-primary" },
                  { label: "Total Repaid (6mo)", value: formatCurrency(disbursementData.reduce((s, d) => s + d.repaid, 0)), color: "text-success" },
                  { label: "Total Defaulted (6mo)", value: formatCurrency(disbursementData.reduce((s, d) => s + d.defaulted, 0)), color: "text-destructive" },
                  { label: "Default Rate", value: `${((disbursementData.reduce((s, d) => s + d.defaulted, 0) / disbursementData.reduce((s, d) => s + d.disbursed, 0)) * 100).toFixed(1)}%`, color: "text-accent" },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-xl bg-secondary/40 border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={`font-display text-xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* ── 6. NOTIFICATIONS ─────────────────────────────────────────── */}
          <TabsContent value="notifications" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Institution Alerts <span className="text-sm text-muted-foreground font-normal ml-1">({unreadCount} unread)</span></h3>
              <Button variant="outline" size="sm" onClick={markAllRead}><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark All Read</Button>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {notifications.map((n, i) => (
                  <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className={`glass-card p-4 border-l-4 cursor-pointer transition-all ${!n.read ? (n.severity === "high" ? "border-l-destructive" : n.severity === "medium" ? "border-l-accent" : "border-l-primary") : "border-l-transparent opacity-70"}`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-2 rounded-lg ${n.severity === "high" ? "bg-destructive/10" : n.severity === "medium" ? "bg-accent/10" : "bg-primary/10"}`}>
                          {notifIcon(n.type, n.severity)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{n.title}</p>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(n.time)}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${n.severity === "high" ? "bg-destructive/15 text-destructive" : n.severity === "medium" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"}`}>
                        {n.severity}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* ── 7. COMPLIANCE ────────────────────────────────────────────── */}
          <TabsContent value="compliance" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold">KYC / Borrower Compliance</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Borrowers", value: mockActiveLoans.length.toString(), icon: Users, color: "text-primary" },
                  { label: "KYC Verified", value: "87", icon: UserCheck, color: "text-success" },
                  { label: "KYC Pending", value: "6", icon: Clock, color: "text-accent" },
                  { label: "KYC Rejected", value: "2", icon: XCircle, color: "text-destructive" },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-xl bg-secondary/40 border border-border text-center">
                    <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
                    <p className={`font-display text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Borrower KYC table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Borrower</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Loan</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">ZimScore</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">KYC Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockActiveLoans.map(loan => (
                      <tr key={loan.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{loan.borrower}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(loan.amount)}</td>
                        <td className="px-4 py-2.5 w-32"><ZimScoreBar score={loan.zimScore} /></td>
                        <td className="px-4 py-2.5"><StatusBadge status={loan.zimScore >= 600 ? "approved" : "under_review"} /></td>
                        <td className="px-4 py-2.5">
                          <Button variant="ghost" size="sm" className="text-xs h-7">
                            <FileText className="w-3 h-3 mr-1" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Regulatory Reports */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold">Regulatory Reports</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Monthly Portfolio Report", period: "April 2026", icon: BarChart3 },
                  { label: "Defaulter Report", period: "Q1 2026", icon: AlertTriangle },
                  { label: "Disbursement Register", period: "Year-to-date", icon: FileText },
                ].map(r => (
                  <button key={r.label} onClick={() => exportCSV(mockActiveLoans, `${r.label.replace(/ /g, "_")}.csv`)} className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border hover:border-primary/30 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <r.icon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.period}</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Audit Trail */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Recent Audit Trail</h3>
              <div className="space-y-2">
                {[
                  { action: "Application Approved", user: "Admin", target: "Mary Dube – $5,000", time: "2026-04-09T08:45:00Z" },
                  { action: "Application Rejected", user: "Admin", target: "Samuel Ncube – $200", time: "2026-04-08T16:10:00Z" },
                  { action: "Loan Product Updated", user: "Admin", target: "Education Loan (deactivated)", time: "2026-04-07T12:00:00Z" },
                  { action: "New Product Created", user: "Admin", target: "Quick Cash product added", time: "2026-04-05T09:00:00Z" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50 text-sm">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-success shrink-0" />
                      <div>
                        <p className="font-medium">{e.action}</p>
                        <p className="text-xs text-muted-foreground">{e.target} · by {e.user}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(e.time)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* ── 8. SETTINGS ──────────────────────────────────────────────── */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Institution Profile */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold">Institution Profile</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Institution Name", value: fiInstitution.name, icon: Building2 },
                    { label: "Registration No.", value: fiInstitution.regNumber, icon: FileText },
                    { label: "Contact Email", value: fiInstitution.contactEmail, icon: Mail },
                    { label: "Phone Number", value: fiInstitution.phone, icon: Phone },
                    { label: "Website", value: fiInstitution.website, icon: Globe },
                    { label: "License Expiry", value: formatDate(fiInstitution.licenseExpiry), icon: Calendar },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                      <f.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{f.label}</p>
                        <p className="text-sm font-medium truncate">{f.value}</p>
                      </div>
                      <Button variant="ghost" size="sm"><Edit2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                  <Button className="w-full glow-primary" onClick={() => toast.success("Profile saved")}>
                    Save Changes
                  </Button>
                </div>
              </motion.div>

              <div className="space-y-4">
                {/* Notification Preferences */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold">Notification Preferences</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "New Applications", enabled: true },
                      { label: "Payment Overdue (30 days)", enabled: true },
                      { label: "Payment Overdue (60 days)", enabled: true },
                      { label: "Loan Default Alerts", enabled: true },
                      { label: "Borrower Score Drops", enabled: false },
                      { label: "Weekly Portfolio Summary", enabled: true },
                    ].map(pref => (
                      <div key={pref.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border text-sm">
                        <span>{pref.label}</span>
                        <button onClick={() => toast.success("Preference updated")} className={`w-10 h-5 rounded-full transition-colors relative ${pref.enabled ? "bg-primary" : "bg-secondary"}`}>
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${pref.enabled ? "left-5.5 left-[22px]" : "left-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* API & Security */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold">API Access</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-primary flex-1 truncate">zs_live_••••••••••••••••••••••••••••••</code>
                        <Button size="sm" variant="outline" onClick={() => toast.success("Copied to clipboard!")}>Copy</Button>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => toast.success("New API key generated")}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Regenerate API Key
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => toast.success("Two-factor authentication enabled")}>
                      <Lock className="w-4 h-4 mr-2" /> Enable 2FA
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Application Detail Dialog ────────────────────────────────────── */}
      <Dialog open={!!viewApp} onOpenChange={open => !open && setViewApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Review</DialogTitle>
            <DialogDescription>{viewApp?.product} – {viewApp && formatCurrency(viewApp.amount)}</DialogDescription>
          </DialogHeader>
          {viewApp && (
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                  {viewApp.applicantName.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold">{viewApp.applicantName}</p>
                  <p className="text-xs text-muted-foreground">{viewApp.applicantId} · Applied {formatDate(viewApp.appliedAt)}</p>
                </div>
                <StatusBadge status={viewApp.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Amount Requested", value: formatCurrency(viewApp.amount) },
                  { label: "Purpose", value: viewApp.purpose },
                  { label: "ZimScore", value: `${viewApp.zimScore} / 850` },
                  { label: "AI Confidence", value: `${viewApp.confidence}%` },
                  { label: "Monthly Income", value: viewApp.monthlyIncome ? formatCurrency(viewApp.monthlyIncome) : "—" },
                  { label: "Product", value: viewApp.product },
                ].map(f => (
                  <div key={f.label} className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="font-semibold">{f.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">ZimScore</p>
                <ZimScoreBar score={viewApp.zimScore} />
              </div>

              {(viewApp.status === "pending" || viewApp.status === "under_review") && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Rejection Reason (required to reject)</Label>
                  <Input placeholder="e.g. Score below threshold, insufficient income evidence…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="bg-secondary border-border text-sm" />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewApp && (viewApp.status === "pending" || viewApp.status === "under_review") && (
              <>
                <Button variant="outline" onClick={() => handleMarkUnderReview(viewApp)}>Mark Under Review</Button>
                <Button variant="destructive" onClick={() => handleReject(viewApp)}>Reject</Button>
                <Button className="glow-primary" onClick={() => handleApprove(viewApp)}>Approve</Button>
              </>
            )}
            {viewApp && viewApp.status !== "pending" && viewApp.status !== "under_review" && (
              <Button variant="outline" onClick={() => setViewApp(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Loan Detail Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!viewLoan} onOpenChange={open => !open && setViewLoan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loan Details – {viewLoan?.borrower}</DialogTitle>
            <DialogDescription>Loan ID: {viewLoan?.id} · Disbursed {viewLoan && formatDate(viewLoan.disbursedAt)}</DialogDescription>
          </DialogHeader>
          {viewLoan && (
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Principal", value: formatCurrency(viewLoan.amount) },
                  { label: "Outstanding", value: formatCurrency(viewLoan.outstanding) },
                  { label: "Interest Rate", value: `${viewLoan.interestRate}% p.a.` },
                  { label: "Next Payment", value: formatDate(viewLoan.nextPayment) },
                  { label: "Next Payment Amt", value: formatCurrency(viewLoan.nextPaymentAmount) },
                  { label: "Progress", value: `${viewLoan.paidInstallments}/${viewLoan.totalInstallments} installments` },
                ].map(f => (
                  <div key={f.label} className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="font-semibold">{f.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Repayment Progress</p>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${(viewLoan.paidInstallments / viewLoan.totalInstallments) * 100}%` }} transition={{ duration: 1 }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{((viewLoan.paidInstallments / viewLoan.totalInstallments) * 100).toFixed(0)}% repaid</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Borrower ZimScore</p>
                <ZimScoreBar score={viewLoan.zimScore} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Loan Status</span>
                <StatusBadge status={viewLoan.status} />
              </div>
              {viewLoan.status !== "current" && (
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-destructive text-xs">This loan requires attention. Consider contacting the borrower or escalating to collections.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewLoan?.status !== "current" && (
              <Button variant="destructive" size="sm" onClick={() => { toast.success("Escalation sent to collections"); setViewLoan(null); }}>
                Escalate to Collections
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewLoan(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Product Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!productDialog} onOpenChange={open => !open && setProductDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{productDialog === "new" ? "Create Loan Product" : "Edit Loan Product"}</DialogTitle>
            <DialogDescription>Configure the product terms and eligibility criteria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1"><Label className="text-xs">Product Name</Label><Input placeholder="e.g. Small Business Starter" value={pName} onChange={e => setPName(e.target.value)} className="bg-secondary border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Min Amount (USD)</Label><Input type="number" placeholder="100" value={pMin} onChange={e => setPMin(e.target.value)} className="bg-secondary border-border" /></div>
              <div className="space-y-1"><Label className="text-xs">Max Amount (USD)</Label><Input type="number" placeholder="5000" value={pMax} onChange={e => setPMax(e.target.value)} className="bg-secondary border-border" /></div>
              <div className="space-y-1"><Label className="text-xs">Interest Rate (% p.a.)</Label><Input type="number" placeholder="8" value={pRate} onChange={e => setPRate(e.target.value)} className="bg-secondary border-border" /></div>
              <div className="space-y-1"><Label className="text-xs">Min ZimScore</Label><Input type="number" placeholder="500" value={pScore} onChange={e => setPScore(e.target.value)} className="bg-secondary border-border" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Repayment Period</Label><Input placeholder="e.g. 3–12 months" value={pPeriod} onChange={e => setPPeriod(e.target.value)} className="bg-secondary border-border" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveProduct} className="glow-primary">{productDialog === "new" ? "Create" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
