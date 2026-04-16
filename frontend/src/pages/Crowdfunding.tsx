import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Users, Clock, Plus, Heart, Share2, Search, TrendingUp, Upload, CheckCircle, AlertCircle, FileText, Shield } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { crowdfundProjects as initialProjects, formatCurrency, CrowdfundProject } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const categories = ["All", "Energy", "Technology", "Infrastructure", "Health", "Education", "Agriculture"];
const returnTypes = ["Revenue Share", "Equity", "Social Impact", "Fixed Return"];
const escrowLabels: Record<string, { label: string; color: string }> = {
  holding: { label: "In Escrow", color: "bg-accent/15 text-accent" },
  partial_release: { label: "Partial Release", color: "bg-primary/15 text-primary" },
  fully_released: { label: "Released", color: "bg-success/15 text-success" },
  refunded: { label: "Refunded", color: "bg-destructive/15 text-destructive" },
};

export default function Crowdfunding() {
  const [projects, setProjects] = useState<CrowdfundProject[]>(initialProjects);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [backDialog, setBackDialog] = useState<CrowdfundProject | null>(null);
  const [backAmount, setBackAmount] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<CrowdfundProject | null>(null);
  const [myBackings, setMyBackings] = useState<{ projectId: number; amount: number; date: string }[]>([]);
  const [mainTab, setMainTab] = useState("browse");

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newCategory, setNewCategory] = useState("Technology");
  const [newDays, setNewDays] = useState("30");
  const [newReturnType, setNewReturnType] = useState("Revenue Share");
  const [businessPlan, setBusinessPlan] = useState<File | null>(null);

  const filtered = projects.filter(p => {
    const matchesCat = categoryFilter === "All" || p.category === categoryFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalBacked = myBackings.reduce((s, b) => s + b.amount, 0);

  const handleBack = () => {
    if (!backDialog) return;
    const amt = Number(backAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const remaining = backDialog.goal - backDialog.raised;
    if (amt > remaining) { toast.error(`Maximum contribution is ${formatCurrency(remaining)}`); return; }
    setProjects(prev => prev.map(p => p.id === backDialog.id ? { ...p, raised: p.raised + amt, backers: p.backers + 1 } : p));
    setMyBackings(prev => [...prev, { projectId: backDialog.id, amount: amt, date: new Date().toLocaleDateString("en-GB") }]);
    toast.success(`${formatCurrency(amt)} contributed to ${backDialog.title}`, { description: "Funds held in escrow until milestone approval." });
    setBackDialog(null); setBackAmount("");
  };

  const handleCreateProject = () => {
    if (!newTitle.trim() || !newDesc.trim() || !newGoal) { toast.error("Please fill in all fields"); return; }
    if (!businessPlan) { toast.error("Business plan upload is required"); return; }
    const goal = Number(newGoal);
    if (goal < 100) { toast.error("Minimum goal is $100"); return; }
    const newProject: CrowdfundProject = {
      id: Date.now(), title: newTitle, description: newDesc, goal, raised: 0, backers: 0,
      daysLeft: Number(newDays), category: newCategory, creator: "You",
      returnType: newReturnType, businessPlanUploaded: true, escrowStatus: "holding",
      milestones: [{ id: `m-${Date.now()}`, title: "First Milestone", amount: Math.round(goal * 0.5), status: "pending", dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] }],
    };
    setProjects(prev => [newProject, ...prev]);
    toast.success("Campaign launched!", { description: "Investors can now contribute." });
    setCreateOpen(false);
    setNewTitle(""); setNewDesc(""); setNewGoal(""); setNewCategory("Technology"); setNewDays("30"); setNewReturnType("Revenue Share"); setBusinessPlan(null);
  };

  const quickBackAmounts = [10, 25, 50, 100, 250];

  return (
    <AppLayout title="Crowdfunding">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Community Crowdfunding</h2>
            <p className="text-muted-foreground text-sm">Fund projects · Milestone-based escrow · Track returns</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="glow-primary"><Plus className="w-4 h-4 mr-2" /> Create Campaign</Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Campaigns", value: projects.length.toString(), icon: Rocket, color: "text-primary" },
            { label: "Your Contributions", value: formatCurrency(totalBacked), icon: Heart, color: "text-success" },
            { label: "Projects Backed", value: new Set(myBackings.map(b => b.projectId)).size.toString(), icon: TrendingUp, color: "text-accent" },
          ].map(stat => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="font-display font-bold text-lg">{stat.value}</p></div>
            </motion.div>
          ))}
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="mybackings">My Backings ({myBackings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-secondary border-border" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((project, i) => {
                const pct = Math.min(100, (project.raised / project.goal) * 100);
                const isFullyFunded = pct >= 100;
                const escrow = escrowLabels[project.escrowStatus];
                return (
                  <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass-card-hover p-5 ${isFullyFunded ? "opacity-80" : ""}`}>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium">{project.category}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${escrow.color}`}><Shield className="w-3 h-3 inline mr-1" />{escrow.label}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs border border-border">{project.returnType}</span>
                      {isFullyFunded && <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success text-xs font-medium">Funded ✓</span>}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto"><Clock className="w-3 h-3" /> {project.daysLeft}d</span>
                    </div>
                    <h3 className="font-display font-semibold mb-1 cursor-pointer hover:text-primary transition-colors" onClick={() => setDetailProject(project)}>{project.title}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{project.description}</p>
                    <p className="text-xs text-muted-foreground mb-3">by {project.creator} {project.businessPlanUploaded && <span className="text-success">· Business plan ✓</span>}</p>
                    <div className="space-y-2">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div className={`h-full rounded-full ${isFullyFunded ? "bg-success" : "bg-gradient-to-r from-primary to-success"}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">{formatCurrency(project.raised)} <span className="text-muted-foreground font-normal">of {formatCurrency(project.goal)}</span></span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3 h-3" /> {project.backers}</span>
                      </div>
                    </div>
                    {/* Milestones preview */}
                    <div className="mt-3 flex gap-1">
                      {project.milestones.map(m => (
                        <div key={m.id} className={`flex-1 h-1.5 rounded-full ${m.status === "approved" ? "bg-success" : m.status === "submitted" ? "bg-accent" : "bg-secondary"}`} title={`${m.title}: ${m.status}`} />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button disabled={isFullyFunded} onClick={() => setBackDialog(project)} className="flex-1 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 border border-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isFullyFunded ? "Fully Funded" : "Back This Project"}
                      </button>
                      <button onClick={() => setDetailProject(project)} className="p-2 rounded-lg bg-secondary border border-border hover:border-primary/30 transition-colors">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="mybackings" className="mt-4">
            {myBackings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">You haven't backed any projects yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBackings.map((b, i) => {
                  const proj = projects.find(p => p.id === b.projectId);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <p className="text-sm font-medium">{proj?.title}</p>
                        <p className="text-xs text-muted-foreground">{b.date} · {proj?.returnType}</p>
                      </div>
                      <p className="font-display font-bold text-success">{formatCurrency(b.amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Back dialog */}
      <Dialog open={!!backDialog} onOpenChange={open => !open && setBackDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Back "{backDialog?.title}"</DialogTitle><DialogDescription>Funds are held in escrow until milestones are approved.</DialogDescription></DialogHeader>
          {backDialog && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Goal</span><span>{formatCurrency(backDialog.goal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Raised</span><span className="text-success">{formatCurrency(backDialog.raised)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Return Type</span><span>{backDialog.returnType}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input type="number" placeholder="0.00" value={backAmount} onChange={e => setBackAmount(e.target.value)} min={1} />
                <div className="flex gap-2 flex-wrap">
                  {quickBackAmounts.map(qa => <button key={qa} onClick={() => setBackAmount(String(qa))} className="px-3 py-1 rounded-full text-xs bg-secondary border border-border hover:border-primary/30">${qa}</button>)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackDialog(null)}>Cancel</Button>
            <Button onClick={handleBack} className="glow-primary">Contribute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign - CRW-FR-001 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Campaign</DialogTitle><DialogDescription>Launch a crowdfunding campaign with milestones and business plan</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2"><Label>Project Title</Label><Input placeholder="e.g. Solar Panels for School" value={newTitle} onChange={e => setNewTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Pitch Description</Label><Textarea placeholder="Describe impact and goals..." value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Funding Goal (USD)</Label><Input type="number" placeholder="5000" value={newGoal} onChange={e => setNewGoal(e.target.value)} min={100} /></div>
              <div className="space-y-2"><Label>Duration</Label>
                <select value={newDays} onChange={e => setNewDays(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {[15, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Investor Return Type</Label>
              <div className="flex gap-2 flex-wrap">
                {returnTypes.map(rt => (
                  <button key={rt} onClick={() => setNewReturnType(rt)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${newReturnType === rt ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"}`}>{rt}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2 flex-wrap">
                {categories.filter(c => c !== "All").map(cat => (
                  <button key={cat} onClick={() => setNewCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${newCategory === cat ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"}`}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Plan (required)</Label>
              <label className="flex items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/30 bg-secondary/30">
                {businessPlan ? (
                  <span className="text-sm text-success flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {businessPlan.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Upload className="w-4 h-4" /> Upload business plan (PDF)</span>
                )}
                <input type="file" accept=".pdf" className="hidden" onChange={e => setBusinessPlan(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} className="glow-primary"><Rocket className="w-4 h-4 mr-2" /> Launch Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail with Milestones - CRW-FR-005 */}
      <Dialog open={!!detailProject} onOpenChange={open => !open && setDetailProject(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailProject?.title}</DialogTitle><DialogDescription>by {detailProject?.creator}</DialogDescription></DialogHeader>
          {detailProject && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{detailProject.description}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-secondary/30 border border-border"><p className="text-xs text-muted-foreground">Goal</p><p className="font-bold text-sm">{formatCurrency(detailProject.goal)}</p></div>
                <div className="p-2 rounded-lg bg-secondary/30 border border-border"><p className="text-xs text-muted-foreground">Raised</p><p className="font-bold text-sm text-success">{formatCurrency(detailProject.raised)}</p></div>
                <div className="p-2 rounded-lg bg-secondary/30 border border-border"><p className="text-xs text-muted-foreground">Return</p><p className="font-bold text-sm">{detailProject.returnType}</p></div>
              </div>
              {/* Milestones */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Milestones</h4>
                <div className="space-y-2">
                  {detailProject.milestones.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border">
                      <div className="flex items-center gap-2">
                        {m.status === "approved" ? <CheckCircle className="w-4 h-4 text-success" /> : m.status === "submitted" ? <AlertCircle className="w-4 h-4 text-accent" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                        <div>
                          <p className="text-sm font-medium">{m.title}</p>
                          <p className="text-xs text-muted-foreground">Due: {m.dueDate}</p>
                          {m.evidence && <p className="text-xs text-success mt-0.5">{m.evidence}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(m.amount)}</p>
                        <span className={`text-xs ${m.status === "approved" ? "text-success" : m.status === "submitted" ? "text-accent" : "text-muted-foreground"}`}>{m.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
