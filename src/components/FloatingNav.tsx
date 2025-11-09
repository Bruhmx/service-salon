import { Home, LogIn, ShoppingBag, Package, Shield, User, Menu, X, Wrench, ShoppingCart, Calendar, LogOut, Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const FloatingNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const isProviderRoute = location.pathname.startsWith('/provider/');
  const isAdminRoute = location.pathname.startsWith('/admin/') || location.pathname === '/admin';

  useEffect(() => {
    checkUserRole();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMenuOpen && !target.closest('.floating-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const checkUserRole = async () => {
    try {
      setIsAuthChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthenticated(false);
        setUserRole(null);
        return;
      }

      setIsAuthenticated(true);

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        return;
      }

      if (roles && roles.length > 0) {
        // Priority: admin > service_provider > customer
        if (roles.some(r => r.role === "admin")) {
          setUserRole("admin");
        } else if (roles.some(r => r.role === "service_provider")) {
          setUserRole("service_provider");
        } else if (roles.some(r => r.role === "customer")) {
          setUserRole("customer");
        }
      } else {
        // No role found, default to customer for authenticated users
        setUserRole("customer");
      }
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/admin");
    setIsMenuOpen(false);
  };

  const getNavItems = () => {
    // While checking auth, show non-authenticated menu to prevent flashing customer content
    if (isAuthChecking) {
      return [
        { icon: Home, label: "Home", path: "/" },
        { icon: LogIn, label: "Login", path: "/login" },
        { icon: ShoppingBag, label: "Products", path: "/products" },
        { icon: Package, label: "Renting", path: "/renting" },
        { icon: Shield, label: "Admin", path: "/admin" },
      ];
    }

    // Show provider-specific menu when on provider routes
    if (isProviderRoute && userRole === "service_provider") {
      return [
        { icon: Home, label: "Dashboard", path: "/provider/dashboard" },
        { icon: Wrench, label: "My Services", path: "/provider/services" },
        { icon: Package, label: "My Products", path: "/provider/products" },
        { icon: Wrench, label: "My Equipment", path: "/provider/equipment" },
        { icon: ShoppingCart, label: "Product Orders", path: "/provider/orders" },
        { icon: Calendar, label: "Service Bookings", path: "/provider/bookings" },
        { icon: Wrench, label: "Equipment Rentals", path: "/provider/rentals" },
        { icon: Settings, label: "Business Profile", path: "/provider/settings" },
        { icon: LogOut, label: "Logout", path: "#", action: handleLogout },
      ];
    }

    // Show non-authenticated navigation only when not logged in
    if (!isAuthenticated) {
      return [
        { icon: Home, label: "Home", path: "/" },
        { icon: LogIn, label: "Login", path: "/login" },
        { icon: ShoppingBag, label: "Products", path: "/products" },
        { icon: Package, label: "Renting", path: "/renting" },
        { icon: Shield, label: "Admin", path: "/admin" },
      ];
    }

    if (userRole === "admin") {
      return [
        { icon: Home, label: "Home", path: "/" },
        { icon: ShoppingBag, label: "Products", path: "/products" },
        { icon: Package, label: "Renting", path: "/renting" },
        { icon: Shield, label: "Admin", path: "/admin" },
      ];
    }

    if (userRole === "service_provider") {
      return [
        { icon: Home, label: "Home", path: "/" },
        { icon: ShoppingBag, label: "Products", path: "/products" },
        { icon: Package, label: "Renting", path: "/renting" },
        { icon: Shield, label: "Dashboard", path: "/provider/dashboard" },
      ];
    }

    if (userRole === "customer") {
      return [
        { icon: Home, label: "Home", path: "/" },
        { icon: ShoppingBag, label: "Products", path: "/products" },
        { icon: Package, label: "Renting", path: "/renting" },
        { icon: User, label: "Me", path: "/me" },
      ];
    }

    return [
      { icon: Home, label: "Home", path: "/" },
      { icon: LogIn, label: "Login", path: "/login" },
      { icon: ShoppingBag, label: "Products", path: "/products" },
      { icon: Package, label: "Renting", path: "/renting" },
    ];
  };

  const navItems = getNavItems();

  // Don't render FloatingNav on admin routes (they have their own sidebar)
  if (isAdminRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 floating-menu-container">
      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute bottom-16 right-0 mb-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px] z-50 animate-scale-in">
          <ul className="py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  {item.action ? (
                    <button
                      onClick={item.action}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent text-left"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-accent"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={cn(
          "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-glow)] hover:scale-110 transition-all duration-300 flex items-center justify-center",
          isMenuOpen && "scale-110 rotate-90"
        )}
        aria-label="Menu"
      >
        {isMenuOpen ? <X className="w-6 h-6 animate-fade-in" /> : <Menu className="w-6 h-6 animate-fade-in" />}
      </button>
    </div>
  );
};
