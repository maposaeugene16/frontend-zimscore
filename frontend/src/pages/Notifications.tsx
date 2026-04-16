import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, DollarSign, TrendingUp, Users, Shield, Settings, Check, CheckCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { notifications as initialNotifications, Notification } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const typeIcons: Record<string, typeof Bell> = { financial: DollarSign, score: TrendingUp, loan: Users, system: Settings, kyc: Shield };
const typeColors: Record<string, string> = { financial: "bg-success/15 text-success", score: "bg-primary/15 text-primary", loan: "bg-accent/15 text-accent", system: "bg-secondary text-muted-foreground", kyc: "bg-primary/15 text-primary" };

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const handleClick = (notification: Notification) => {
    markRead(notification.id);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  return (
    <AppLayout title="Notifications">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Notifications</h2>
            <p className="text-muted-foreground text-sm">{unreadCount} unread · Retained for 90 days</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-2" /> Mark All Read
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.map((notification, i) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass = typeColors[notification.type] || "bg-secondary text-muted-foreground";
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleClick(notification)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${notification.read ? "bg-secondary/10 border-border/50" : "bg-secondary/30 border-border hover:border-primary/20"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${colorClass} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${notification.read ? "text-muted-foreground" : "text-foreground"}`}>{notification.title}</p>
                      {!notification.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{new Date(notification.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  {!notification.read && (
                    <button onClick={e => { e.stopPropagation(); markRead(notification.id); }} className="p-1 rounded hover:bg-secondary transition-colors shrink-0" title="Mark as read">
                      <Check className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
          {notifications.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
