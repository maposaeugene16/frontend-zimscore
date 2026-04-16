import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Wallet, BarChart3, Users, Building2,
  Rocket, Shield, LogOut, X, TrendingUp, Bell, Landmark, Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Wallet", icon: Wallet, path: "/wallet" },
  { label: "Credit Score", icon: BarChart3, path: "/score" },
  { label: "P2P Lending", icon: Users, path: "/p2p" },
  { label: "SME Hub", icon: Building2, path: "/sme" },
  { label: "Crowdfunding", icon: Rocket, path: "/crowdfunding" },
  { label: "MFI Marketplace", icon: Landmark, path: "/mfi" },
  { label: "FI Portal", icon: Building2, path: "/fi-portal" },
  { label: "EcoCash Upload", icon: Smartphone, path: "/ecocash-upload" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Admin", icon: Shield, path: "/admin" },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-64 sidebar-gradient border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">ZimScore</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.filter(item => item.path !== "/admin" || isAdmin).map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
