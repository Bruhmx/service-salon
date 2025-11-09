import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trash2, Star, Menu, Clock, User as UserIcon, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    checkAdminAccess();
  }, []);

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
      fetchReviews();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, service_providers(business_name), profiles(full_name)")
      .order("created_at", { ascending: false });

    if (data) setReviews(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete review");
      return;
    }
    toast.success("Review deleted successfully");
    fetchReviews();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <h1 className="text-xl font-bold">Reviews</h1>
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
          </header>
          
        <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background via-secondary/10 to-accent/10 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Reviews
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Monitor and manage customer reviews
              </p>
            </div>

            <div className="grid gap-3 md:gap-4">
              {reviews.map((review, index) => (
                <Card 
                  key={review.id} 
                  className="relative overflow-hidden group border-2 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-elegant animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg truncate flex items-center gap-2 group-hover:text-primary transition-colors">
                          <Sparkles className="h-4 w-4 text-primary shrink-0" />
                          {review.service_providers?.business_name}
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm flex items-center gap-1.5">
                          <UserIcon className="h-3 w-3" />
                          by {review.profiles?.full_name}
                        </CardDescription>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(review.id)} className="self-start hover:shadow-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 md:space-y-3 relative z-10">
                    <div className="flex items-center gap-1 p-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 w-fit">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 md:h-5 md:w-5 transition-all duration-300 ${
                            i < review.rating 
                              ? "fill-primary text-primary drop-shadow-lg" 
                              : "text-muted-foreground/30"
                          }`} 
                        />
                      ))}
                      <span className="ml-2 text-xs md:text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="text-xs md:text-sm leading-relaxed break-words p-3 rounded-lg bg-secondary/30 border border-border/50 italic">
                      "{review.comment}"
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(review.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                      <span>•</span>
                      <span>{new Date(review.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        </div>
      </div>
    </SidebarProvider>
  );
}