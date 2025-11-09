import { Home, Palette, FileText, Wrench, Package, CalendarDays, Star, Users, LogOut, Sparkles, ClipboardList } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import gbLogo from "@/assets/gb_logo.png";

const menuItems = [
  { title: "Overview", url: "/admin/dashboard", icon: Home },
  { title: "Orders", url: "/admin/orders", icon: ClipboardList },
  { title: "Design & Content", url: "/admin/content", icon: Palette },
  { title: "Homepage Editor", url: "/admin/homepage", icon: FileText },
  { title: "Services", url: "/admin/services", icon: Wrench },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Renting", url: "/admin/renting", icon: CalendarDays },
  { title: "Reviews", url: "/admin/reviews", icon: Star },
  { title: "Users & Providers", url: "/admin/users", icon: Users },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/admin");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-elegant">
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
        {open && (
          <>
            <div className="relative">
              <img src={gbLogo} alt="GB Logo" className="h-8 w-8 object-contain" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Panel
              </h2>
              <p className="text-xs text-muted-foreground">Management Center</p>
            </div>
          </>
        )}
      </div>

      <SidebarContent className="bg-gradient-to-b from-background to-secondary/5">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-semibold border-l-2 border-primary shadow-card hover:shadow-elegant transition-all duration-300"
                          : "hover:bg-secondary/50 hover:translate-x-1 transition-all duration-200 border-l-2 border-transparent"
                      }
                    >
                      <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto border-t border-border/50 pt-4">
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
                >
                  <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
