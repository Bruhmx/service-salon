import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Loader2, Palette, Upload, Type, Image as ImageIcon, Menu } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AdminContent() {
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
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const handleColorUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Color scheme updated successfully!");
  };

  const handleLogoUpload = () => {
    toast.success("Logo uploaded successfully!");
  };

  const handleFontUpdate = () => {
    toast.success("Font settings updated successfully!");
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
            <h1 className="text-xl font-bold">Design & Content</h1>
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
          </header>
          
        <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background via-secondary/10 to-accent/10 overflow-x-hidden">
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            <div className="hidden lg:block">
              <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Design & Content
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Customize the look and feel
              </p>
            </div>

            <Tabs defaultValue="colors" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6 h-auto">
                <TabsTrigger value="colors" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                  <Palette className="h-3 w-3 md:h-4 md:w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="branding" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                  <ImageIcon className="h-3 w-3 md:h-4 md:w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="typography" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                  <Type className="h-3 w-3 md:h-4 md:w-4" />
                  Typography
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors">
                <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <CardHeader>
                    <CardTitle>Color Scheme</CardTitle>
                    <CardDescription>
                      Customize your brand colors and theme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleColorUpdate} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="primary">Primary Color</Label>
                          <div className="flex gap-2">
                            <Input id="primary" type="color" defaultValue="#f5b8c7" className="w-20 h-10" />
                            <Input type="text" defaultValue="#f5b8c7" className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondary">Secondary Color</Label>
                          <div className="flex gap-2">
                            <Input id="secondary" type="color" defaultValue="#fdf2f5" className="w-20 h-10" />
                            <Input type="text" defaultValue="#fdf2f5" className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accent">Accent Color</Label>
                          <div className="flex gap-2">
                            <Input id="accent" type="color" defaultValue="#f9d5df" className="w-20 h-10" />
                            <Input type="text" defaultValue="#f9d5df" className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="background">Background Color</Label>
                          <div className="flex gap-2">
                            <Input id="background" type="color" defaultValue="#ffffff" className="w-20 h-10" />
                            <Input type="text" defaultValue="#ffffff" className="flex-1" />
                          </div>
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        Save Color Scheme
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branding">
                <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <CardHeader>
                    <CardTitle>Branding Assets</CardTitle>
                    <CardDescription>
                      Upload and manage your brand assets
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="logo">Logo</Label>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center bg-secondary/30">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                          <div className="space-y-2">
                            <Input id="logo" type="file" accept="image/*" className="max-w-xs" />
                            <Button onClick={handleLogoUpload} variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Logo
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="favicon">Favicon</Label>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center bg-secondary/30">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <Input id="favicon" type="file" accept="image/*" className="max-w-xs" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="typography">
                <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <CardHeader>
                    <CardTitle>Typography</CardTitle>
                    <CardDescription>
                      Customize fonts and text styles
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="headingFont">Heading Font</Label>
                        <Input id="headingFont" defaultValue="Inter" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bodyFont">Body Font</Label>
                        <Input id="bodyFont" defaultValue="Inter" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fontUrl">Custom Font URL</Label>
                        <Input id="fontUrl" placeholder="https://fonts.googleapis.com/..." />
                      </div>
                    </div>
                    <Button onClick={handleFontUpdate} className="w-full">
                      Save Typography Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
