import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Menu } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AdminServices() {
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: "",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
      fetchData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    const [servicesRes, providersRes] = await Promise.all([
      supabase.from("services").select("*, service_providers(business_name)"),
      supabase.from("service_providers").select("id, business_name").eq("is_active", true),
    ]);

    if (servicesRes.data) setServices(servicesRes.data);
    if (providersRes.data) setProviders(providersRes.data);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('service-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = formData.image_url;
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) return;
      imageUrl = uploadedUrl;
    }

    try {
      const action = editingService ? 'update' : 'create';
      const data: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        image_url: imageUrl,
        provider_id: null, // Admin creates without provider
      };

      if (editingService) {
        data.id = editingService.id;
      }

      const { data: result, error } = await supabase.functions.invoke('manage-service', {
        body: { action, data },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(editingService ? "Failed to update service" : "Failed to create service");
        return;
      }

      toast.success(editingService ? "Service updated successfully" : "Service created successfully");
      setFormData({ name: "", description: "", price: "", duration_minutes: "", image_url: "" });
      setImageFile(null);
      setEditingService(null);
      fetchData();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      const { error } = await supabase.functions.invoke('manage-service', {
        body: { action: 'delete', id },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error("Failed to delete service");
        return;
      }

      toast.success("Service deleted successfully");
      fetchData();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred");
    }
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
            <h1 className="text-xl font-bold">Services</h1>
            <SidebarTrigger>
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
          </header>
          
        <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background via-secondary/10 to-accent/10 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Services
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Manage service offerings
                </p>
              </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingService(null); setFormData({ name: "", description: "", price: "", duration_minutes: "", image_url: "" }); setImageFile(null); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Service Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <Label>Price</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} required />
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {imageFile && <p className="text-sm text-muted-foreground mt-1">Selected: {imageFile.name}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingService ? "Update" : "Create"} Service
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="border-2 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-elegant group">
                  {service.image_url && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img src={service.image_url} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary transition-colors">{service.name}</CardTitle>
                    <CardDescription>{service.service_providers?.business_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">₱{service.price}</span>
                      <span className="text-sm text-muted-foreground">{service.duration_minutes} min</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => { setEditingService(service); setFormData({ ...service, price: service.price.toString(), duration_minutes: service.duration_minutes.toString() }); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Service</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label>Service Name</Label>
                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                      </div>
                      <div>
                        <Label>Price</Label>
                        <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                      </div>
                      <div>
                        <Label>Duration (minutes)</Label>
                        <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} required />
                      </div>
                      <div>
                        <Label>Upload Image</Label>
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        {imageFile && <p className="text-sm text-muted-foreground mt-1">Selected: {imageFile.name}</p>}
                      </div>
                      <Button type="submit" className="w-full" disabled={uploading}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Update Service
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(service.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
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