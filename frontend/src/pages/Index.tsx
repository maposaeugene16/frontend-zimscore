import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Shield, Users, BarChart3, Building2, Rocket, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  { icon: BarChart3, title: "Credit Scoring", description: "AI-powered credit assessment tailored for the Zimbabwean market" },
  { icon: Users, title: "P2P Lending", description: "Connect borrowers with lenders for fair, transparent financing" },
  { icon: Building2, title: "SME Tools", description: "Invoicing, micro-loans, and analytics for small businesses" },
  { icon: Shield, title: "Secure Platform", description: "Bank-grade security with end-to-end encryption" },
  { icon: Rocket, title: "Crowdfunding", description: "Fund community projects and ventures that matter" },
  { icon: TrendingUp, title: "Financial Growth", description: "Track, improve, and leverage your financial health" },
];

const stats = [
  { value: "50K+", label: "Active Users" },
  { value: "$12M+", label: "Loans Facilitated" },
  { value: "742", label: "Avg Credit Score" },
  { value: "98%", label: "Repayment Rate" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">ZimScore</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 glow-primary transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 page-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-success/8 rounded-full blur-3xl animate-pulse-glow" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-36 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4" /> Trusted by 50,000+ Zimbabweans
            </span>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold max-w-4xl mx-auto leading-tight">
              Your Financial Future,{" "}
              <span className="gradient-text">Reimagined</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6">
              Build your credit score, access P2P lending, and empower your business with Zimbabwe's most innovative fintech platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link to="/register" className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 glow-primary transition-all flex items-center gap-2">
                Start Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="px-8 py-3 rounded-lg bg-secondary border border-border text-foreground font-semibold hover:bg-secondary/80 transition-colors">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <p className="font-display text-3xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Everything You Need</h2>
          <p className="text-muted-foreground mt-2">Comprehensive financial tools designed for Zimbabwe</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-hover p-6"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
        <div className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-success/5" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Ready to Get Started?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">Join thousands of Zimbabweans building a stronger financial future.</p>
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 glow-primary transition-all">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">ZimScore</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2024 ZimScore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
