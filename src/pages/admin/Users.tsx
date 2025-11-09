import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Shield, User, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();
  const usersPerPage = 20;
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

      // Use server-side verification for better security
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-admin');

      if (verifyError || !verifyData?.isAdmin) {
        toast.error("Access denied. Admin role required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchUsers();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    // Fetch with pagination and search support
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, created_at", { count: 'exact' })
      .order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data: profilesData, error: profilesError } = await query
      .range((currentPage - 1) * usersPerPage, currentPage * usersPerPage - 1);
    
    if (profilesError) {
      toast.error("Failed to fetch users");
      return;
    }

    if (profilesData) {
      const usersWithRoles = await Promise.all(
        profilesData.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);
          
          return {
            ...profile,
            roles: rolesData?.map(r => r.role) || []
          };
        })
      );
      setUsers(usersWithRoles);
    }
  };

  const toggleRole = async (userId: string, role: "admin" | "customer" | "service_provider", hasRole: boolean) => {
    // Use server-side edge function for role management with validation
    const { data, error } = await supabase.functions.invoke('manage-user-role', {
      body: {
        userId,
        role,
        action: hasRole ? 'remove' : 'add'
      }
    });

    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Failed to update role");
      return;
    }

    toast.success(data.message);
    fetchUsers();
  };

  const toggleShowDetails = (userId: string) => {
    setShowDetails(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
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
            <h1 className="text-xl font-bold">Users</h1>
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
          </header>
          
          <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background via-secondary/10 to-accent/10 overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Users & Providers
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Manage user roles and permissions
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 sm:max-w-md"
                />
                <Button onClick={handleSearch} className="w-full sm:w-auto">Search</Button>
              </div>

            <div className="grid gap-3 md:gap-4">
              {users.map((user) => (
                <Card key={user.id} className="relative overflow-hidden group border-2 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-elegant">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base md:text-lg truncate group-hover:text-primary transition-colors">{user.full_name}</CardTitle>
                          <p className="text-xs md:text-sm text-muted-foreground break-all">
                            {showDetails[user.id] ? user.email : '••••••@••••••.com'}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleShowDetails(user.id)}
                            className="mt-2 text-xs h-8 hover:text-primary"
                          >
                            {showDetails[user.id] ? 'Hide Details' : 'Show Details'}
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {user.roles.map((role: string) => (
                          <Badge key={role} variant="secondary" className="text-xs bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">{role}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 border-t border-border/50 bg-secondary/20">
                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      <Button 
                        size="sm" 
                        variant={user.roles.includes("admin") ? "default" : "outline"}
                        onClick={() => toggleRole(user.id, "admin", user.roles.includes("admin"))}
                        className={cn(
                          "w-full sm:w-auto text-xs md:text-sm transition-all duration-300",
                          user.roles.includes("admin") && "bg-gradient-to-r from-primary to-accent hover:shadow-glow"
                        )}
                      >
                        <Shield className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Admin
                      </Button>
                      <Button 
                        size="sm" 
                        variant={user.roles.includes("service_provider") ? "default" : "outline"}
                        onClick={() => toggleRole(user.id, "service_provider", user.roles.includes("service_provider"))}
                        className={cn(
                          "w-full sm:w-auto text-xs md:text-sm transition-all duration-300",
                          user.roles.includes("service_provider") && "bg-gradient-to-r from-accent to-primary hover:shadow-glow"
                        )}
                      >
                        <User className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Provider
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12 text-sm md:text-base text-muted-foreground">
                No users found
              </div>
            )}

            <div className="flex justify-center gap-2 mt-4 md:mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs md:text-sm"
              >
                Previous
              </Button>
              <span className="flex items-center px-2 md:px-4 text-xs md:text-sm">Page {currentPage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={users.length < usersPerPage}
                className="text-xs md:text-sm"
              >
                Next
              </Button>
            </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}