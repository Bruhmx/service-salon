import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingNav } from "@/components/FloatingNav";

export default function ServiceProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [isProvider, setIsProvider] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalBookings: 0,
    pendingOrders: 0,
    pendingBookings: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkProviderAccess();
  }, []);

  useEffect(() => {
    if (isProvider) {
      fetchStats();
    }
  }, [isProvider]);

  const checkProviderAccess = async () => {
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

      const hasProviderRole = roles?.some((r) => r.role === "service_provider");

      if (!hasProviderRole) {
        toast.error("Access denied. Service provider role required.");
        navigate("/");
        return;
      }

      // Check if provider profile exists
      const { data: provider } = await supabase
        .from("service_providers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!provider) {
        toast.info("Please complete your business registration");
        navigate("/provider/register");
        return;
      }

      setIsProvider(true);
    } catch (error) {
      console.error("Error checking provider access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (provider) {
      const [orders, bookings] = await Promise.all([
        supabase.from("product_orders").select("*").eq("provider_id", provider.id),
        supabase.from("bookings").select("*").eq("provider_id", provider.id),
      ]);

      setStats({
        totalOrders: orders.data?.length || 0,
        totalBookings: bookings.data?.length || 0,
        pendingOrders: orders.data?.filter(o => o.status === "pending").length || 0,
        pendingBookings: bookings.data?.filter(b => b.status === "pending").length || 0,
      });

      const allActivity = [
        ...(bookings.data?.map(b => ({ ...b, type: "booking" })) || []),
        ...(orders.data?.map(o => ({ ...o, type: "order" })) || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

      setRecentActivity(allActivity);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isProvider) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-24">
      <FloatingNav />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-accent py-16 px-4 animate-fade-in">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Provider Dashboard
          </h1>
          <p className="text-lg text-primary-foreground/90">
            Manage your business operations and view your statistics
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6 animate-fade-in">Business Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stats.totalOrders}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stats.pendingOrders}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stats.totalBookings}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stats.pendingBookings}</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold mb-6 animate-fade-in">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="py-12">
              <p className="text-muted-foreground text-center">No recent activity</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recentActivity.map((activity, index) => (
              <Card 
                key={activity.id} 
                className="hover:shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium capitalize text-lg">{activity.type}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status: <span className="font-medium text-primary">{activity.status}</span>
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{new Date(activity.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
