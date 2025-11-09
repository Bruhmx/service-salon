import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Loader2, Eye, Save, Plus, Trash2, Menu } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AdminHomepage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [heroTitle, setHeroTitle] = useState("Welcome to Our Platform");
  const [heroSubtitle, setHeroSubtitle] = useState("Your trusted service marketplace");
  const [heroImage, setHeroImage] = useState("");
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
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHomepage = () => {
    toast.success("Homepage settings saved successfully!");
  };

  const handlePreview = () => {
    window.open("/", "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            <h1 className="text-xl font-bold">Homepage</h1>
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
          </header>
          
        <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background via-secondary/10 to-accent/10 overflow-x-hidden">
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Homepage Editor
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Customize homepage content
                </p>
              </div>
              <Button onClick={handlePreview} variant="outline" className="gap-2 self-start sm:self-auto text-xs md:text-sm">
                <Eye className="h-3 w-3 md:h-4 md:w-4" />
                Preview
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                <CardHeader>
                  <CardTitle>Hero Section</CardTitle>
                  <CardDescription>
                    Edit your homepage hero section
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="Enter hero title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                    <Textarea
                      id="heroSubtitle"
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      placeholder="Enter hero subtitle"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroImage">Hero Image URL</Label>
                    <Input
                      id="heroImage"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <Button onClick={handleSaveHomepage} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    Save Hero Section
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                <CardHeader>
                  <CardTitle>Featured Sections</CardTitle>
                  <CardDescription>
                    Manage featured content sections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[1, 2, 3].map((section) => (
                      <div key={section} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex-1">
                          <p className="font-medium">Featured Section {section}</p>
                          <p className="text-sm text-muted-foreground">Edit section content</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Section
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl lg:col-span-2">
                <CardHeader>
                  <CardTitle>Call-to-Action Section</CardTitle>
                  <CardDescription>
                    Customize your CTA section
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ctaTitle">CTA Title</Label>
                      <Input
                        id="ctaTitle"
                        defaultValue="Ready to get started?"
                        placeholder="Enter CTA title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctaButton">Button Text</Label>
                      <Input
                        id="ctaButton"
                        defaultValue="Get Started"
                        placeholder="Enter button text"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ctaDescription">Description</Label>
                    <Textarea
                      id="ctaDescription"
                      defaultValue="Join thousands of satisfied customers"
                      placeholder="Enter CTA description"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSaveHomepage} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    Save CTA Section
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
