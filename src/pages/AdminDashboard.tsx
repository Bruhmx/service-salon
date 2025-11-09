import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Loader2, Menu, Calendar, ShoppingBag, Package, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalOrders: 0,
    totalRentals: 0,
    pendingBookings: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some((r) => r.role === "admin");

      if (!hasAdminRole) {
        toast.error("Access denied. Admin role required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const [bookings, orders, rentals] = await Promise.all([
      supabase.from("bookings").select("*"),
      supabase.from("product_orders").select("*"),
      supabase.from("equipment_rentals").select("*"),
    ]);

    setStats({
      totalBookings: bookings.data?.length || 0,
      totalOrders: orders.data?.length || 0,
      totalRentals: rentals.data?.length || 0,
      pendingBookings: bookings.data?.filter(b => b.status === "pending").length || 0,
    });

    const allActivity = [
      ...(bookings.data?.map(b => ({ ...b, type: "booking" })) || []),
      ...(orders.data?.map(o => ({ ...o, type: "order" })) || []),
      ...(rentals.data?.map(r => ({ ...r, type: "rental" })) || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

    setRecentActivity(allActivity);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col w-full">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
          </header>
          
          <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary/20 overflow-x-hidden">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 hidden lg:block">Admin Dashboard Overview</h1>
            
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4 mb-4 md:mb-6">
            <Card className="relative overflow-hidden group hover:shadow-elegant transition-all duration-300 border-2 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Total Bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{stats.totalBookings}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group hover:shadow-elegant transition-all duration-300 border-2 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-accent" />
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">{stats.totalOrders}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group hover:shadow-elegant transition-all duration-300 border-2 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Total Rentals
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent">{stats.totalRentals}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group hover:shadow-elegant transition-all duration-300 border-2 hover:border-accent/50">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent animate-pulse" />
                  Pending Bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">{stats.pendingBookings}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-elegant">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6">
              <div className="space-y-3 md:space-y-4">
                {recentActivity.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 md:p-4 bg-gradient-to-r from-secondary/50 to-accent/5 rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-card transition-all duration-300 group animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse" />
                      <div>
                        <p className="font-medium capitalize text-sm md:text-base group-hover:text-primary transition-colors">{activity.type}</p>
                        <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            activity.status === 'completed' && "bg-green-500/10 text-green-600",
                            activity.status === 'pending' && "bg-yellow-500/10 text-yellow-600",
                            activity.status === 'cancelled' && "bg-red-500/10 text-red-600"
                          )}>
                            {activity.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
