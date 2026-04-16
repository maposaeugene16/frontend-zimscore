import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, DollarSign, Activity, CheckCircle, XCircle, Eye, Loader2, AlertTriangle, BarChart3, TrendingUp, Ban, FileText, Download, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { adminStats, formatCurrency } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string; user_id: string; full_name: string; verification_status: string; created_at: string;
  national_id_front_url: string | null; national_id_back_url: string | null; passport_photo_url: string | null;
}

export default function AdminPortal() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [docUrls, setDocUrls] = useState<{ front?: string; back?: string; photo?: string }>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [mainTab, setMainTab] = useState("overview");

  useEffect(() => { fetchProfiles(); }, []);

  if (!isAdmin) {
    return (
      <AppLayout title="Admin Portal">
        <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="font-display text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have admin privileges. Contact a system administrator to request access.</p>
        </div>
      </AppLayout>
    );
  }

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load profiles");
    else setProfiles(data || []);
    setLoading(false);
  };

  const getSignedUrl = async (path: string | null): Promise<string | undefined> => {
    if (!path) return undefined;
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
    return data?.signedUrl;
  };

  const viewDocs = async (profile: Profile) => {
    setViewProfile(profile);
    const [front, back, photo] = await Promise.all([getSignedUrl(profile.national_id_front_url), getSignedUrl(profile.national_id_back_url), getSignedUrl(profile.passport_photo_url)]);
    setDocUrls({ front, back, photo });
  };

  const updateStatus = async (profileId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ verification_status: status, updated_at: new Date().toISOString() }).eq("id", profileId);
    if (error) { toast.error("Failed to update status"); return; }
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, verification_status: status } : p));
    toast.success(`User ${status === "verified" ? "approved" : status === "rejected" ? "rejected" : "suspended"}`);
    if (viewProfile?.id === profileId) setViewProfile(null);
  };

  const filtered = statusFilter === "all" ? profiles : profiles.filter(p => p.verification_status === statusFilter);
  const pendingCount = profiles.filter(p => p.verification_status === "pending").length;
  const verifiedCount = profiles.filter(p => p.verification_status === "verified").length;

  const statusColors: Record<string, string> = { pending: "bg-accent/15 text-accent", verified: "bg-success/15 text-success", rejected: "bg-destructive/15 text-destructive", suspended: "bg-destructive/15 text-destructive" };

  const exportRevenue = () => {
    const csv = ["Source,Amount"].concat(adminStats.revenueBySource.map(r => `${r.source},${r.amount}`)).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "revenue_report.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("Revenue report exported");
  };

  return (
    <AppLayout title="Admin Portal">
      <div className="max-w-6xl mx-auto space-y-6">
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
            <TabsTrigger value="analytics">Credit Analytics</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* System Overview - ADM-FR-001 */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Total Users" value={adminStats.totalUsers.toLocaleString()} icon={Users} />
              <StatCard title="Active Loans" value={adminStats.activeLoans.toString()} icon={Activity} />
              <StatCard title="Total Wallet Balance" value={formatCurrency(adminStats.totalWalletBalance)} icon={DollarSign} />
              <StatCard title="Pending KYC" value={pendingCount.toString()} icon={Shield} />
              <StatCard title="Open Disputes" value={adminStats.openDisputes.toString()} icon={AlertTriangle} />
            </div>

            {/* Users by Role */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">Users by Role</h3>
                <div className="space-y-3">
                  {adminStats.usersByRole.map(r => (
                    <div key={r.role} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{r.role}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(r.count / adminStats.totalUsers) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold w-10 text-right">{r.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Failed Transactions - ADM-FR-002 */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">System Health (24h)</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-accent" /><span className="text-sm">Failed Transactions</span></div>
                    <span className="font-bold text-accent">{adminStats.failedTransactions24h}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-success" /><span className="text-sm">Default Rate</span></div>
                    <span className="font-bold">{adminStats.defaultRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /><span className="text-sm">Monthly Revenue</span></div>
                    <span className="font-bold text-success">{formatCurrency(adminStats.monthlyRevenue)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* KYC */}
          <TabsContent value="kyc" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={profiles.length.toString()} icon={Users} />
              <StatCard title="Verified" value={verifiedCount.toString()} icon={CheckCircle} />
              <StatCard title="Pending" value={pendingCount.toString()} icon={Shield} />
              <StatCard title="Rejected" value={profiles.filter(p => p.verification_status === "rejected").length.toString()} icon={XCircle} />
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="font-display text-lg font-semibold">User Verifications</h3>
                <div className="flex gap-2">
                  {["all", "pending", "verified", "rejected"].map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map(profile => (
                    <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                          {profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(profile.created_at).toLocaleDateString("en-GB")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[profile.verification_status] || "bg-muted text-muted-foreground"}`}>{profile.verification_status}</span>
                        <button onClick={() => viewDocs(profile)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Eye className="w-4 h-4" /></button>
                        {profile.verification_status === "pending" && (
                          <>
                            <button onClick={() => updateStatus(profile.id, "verified")} className="p-2 rounded-lg bg-success/15 text-success hover:bg-success/25"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => updateStatus(profile.id, "rejected")} className="p-2 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25"><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                        {profile.verification_status === "verified" && (
                          <button onClick={() => updateStatus(profile.id, "suspended")} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" title="Suspend"><Ban className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Credit Analytics - ADM-FR-004/005/006 */}
          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">Default Rate by Zimscore Band</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={adminStats.defaultByBand}>
                    <XAxis dataKey="band" stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 96%)" }} formatter={(value: number) => [`${value}%`, "Default Rate"]} />
                    <Bar dataKey="rate" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">Loan Volume Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={adminStats.loanVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={11} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 96%)" }} />
                    <Line type="monotone" dataKey="disbursed" stroke="hsl(224, 76%, 48%)" strokeWidth={2} name="Disbursed" />
                    <Line type="monotone" dataKey="repaid" stroke="hsl(160, 84%, 39%)" strokeWidth={2} name="Repaid" />
                    <Line type="monotone" dataKey="defaulted" stroke="hsl(0, 84%, 60%)" strokeWidth={2} name="Defaulted" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </TabsContent>

          {/* Revenue - ADM-FR-007/008 */}
          <TabsContent value="revenue" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg font-semibold">Revenue Breakdown</h3>
              <Button variant="outline" onClick={exportRevenue}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {adminStats.revenueBySource.map(r => (
                <motion.div key={r.source} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{r.source}</p>
                  <p className="font-display text-2xl font-bold text-success">{formatCurrency(r.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{((r.amount / adminStats.monthlyRevenue) * 100).toFixed(0)}% of total</p>
                </motion.div>
              ))}
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Monthly Revenue: {formatCurrency(adminStats.monthlyRevenue)}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={adminStats.revenueBySource}>
                  <XAxis dataKey="source" stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 96%)" }} />
                  <Bar dataKey="amount" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </TabsContent>

          {/* Security & Fraud - ADM-FR-009/010/011 */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <h3 className="font-display text-lg font-semibold">Suspicious Activity Alerts</h3>
            {adminStats.suspiciousActivity.map(sa => (
              <motion.div key={sa.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`glass-card p-4 border-l-4 ${sa.severity === "high" ? "border-l-destructive" : "border-l-accent"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${sa.severity === "high" ? "text-destructive" : "text-accent"}`} />
                    <div>
                      <p className="text-sm font-medium">{sa.type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sa.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">User: {sa.userId} · {new Date(sa.timestamp).toLocaleString("en-GB")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline"><Eye className="w-3 h-3 mr-1" /> Review</Button>
                    <Button size="sm" variant="destructive"><Ban className="w-3 h-3 mr-1" /> Suspend</Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {adminStats.suspiciousActivity.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No suspicious activity detected.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* KYC Document Viewer */}
      <Dialog open={!!viewProfile} onOpenChange={open => !open && setViewProfile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewProfile?.full_name} — KYC Documents</DialogTitle>
            <DialogDescription>Review submitted identity documents</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center space-y-2">
              <p className="text-xs font-medium text-muted-foreground">ID Front</p>
              {docUrls.front ? <img src={docUrls.front} alt="ID Front" className="w-full h-32 object-cover rounded-lg border border-border" /> : <div className="w-full h-32 bg-secondary rounded-lg flex items-center justify-center text-xs text-muted-foreground">No image</div>}
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-medium text-muted-foreground">ID Back</p>
              {docUrls.back ? <img src={docUrls.back} alt="ID Back" className="w-full h-32 object-cover rounded-lg border border-border" /> : <div className="w-full h-32 bg-secondary rounded-lg flex items-center justify-center text-xs text-muted-foreground">No image</div>}
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Passport Photo</p>
              {docUrls.photo ? <img src={docUrls.photo} alt="Photo" className="w-full h-32 object-cover rounded-lg border border-border" /> : <div className="w-full h-32 bg-secondary rounded-lg flex items-center justify-center text-xs text-muted-foreground">No image</div>}
            </div>
          </div>
          {viewProfile?.verification_status === "pending" && (
            <div className="flex gap-3 justify-end">
              <Button variant="destructive" onClick={() => updateStatus(viewProfile.id, "rejected")}>Reject</Button>
              <Button onClick={() => updateStatus(viewProfile.id, "verified")} className="glow-primary">Approve</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
