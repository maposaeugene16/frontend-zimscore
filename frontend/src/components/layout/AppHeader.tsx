import { Menu, Bell, Search, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function AppHeader({ onMenuClick, title }: AppHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-border glass-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        {title && <h1 className="font-display text-lg font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search..." className="bg-transparent text-sm outline-none w-40 placeholder:text-muted-foreground" />
        </div>

        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
            {initials}
          </div>
          <span className="hidden md:block text-sm font-medium">{displayName}</span>
        </div>

        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
