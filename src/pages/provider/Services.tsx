import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageCarousel } from "@/components/ImageCarousel";

export default function ProviderServices() {
  const [services, setServices] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<any>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: "",
    image_url: "",
  });

  useEffect(() => {
    fetchProviderAndServices();
  }, []);

  const fetchProviderAndServices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (provider) {
      setProviderId(provider.id);
      const { data: servicesData } = await supabase
        .from("services")
        .select(`
          *,
          service_images (
            id,
            image_url,
            display_order
          )
        `)
        .eq("provider_id", provider.id);
      
      if (servicesData) {
        const servicesWithImages = servicesData.map((service: any) => ({
          ...service,
          images: service.service_images?.sort((a: any, b: any) => a.display_order - b.display_order) || []
        }));
        setServices(servicesWithImages);
      }
    }
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!providerId) {
      toast.error("Provider ID not found. Please refresh and try again.");
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${providerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload image: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('service-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return;

    if (imageFiles.length < 1 && !editingService) {
      toast.error("Please upload at least 1 image");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = formData.image_url;

      // Upload first image as main image if new files selected
      if (imageFiles.length > 0) {
        const uploadedUrl = await uploadImage(imageFiles[0]);
        if (!uploadedUrl) {
          setUploading(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      const action = editingService ? 'update' : 'create';
      const data: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        image_url: imageUrl,
        provider_id: providerId,
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
        setUploading(false);
        return;
      }

      const serviceId = result.service?.id || editingService?.id;

      // Upload additional images to service_images table
      if (imageFiles.length > 0 && serviceId) {
        for (let i = 0; i < imageFiles.length; i++) {
          const uploadedUrl = await uploadImage(imageFiles[i]);
          if (uploadedUrl) {
            await supabase.from("service_images").insert({
              service_id: serviceId,
              image_url: uploadedUrl,
              display_order: i,
            });
          }
        }
      }

      toast.success(editingService ? "Service updated successfully" : "Service created successfully");
      setFormData({ name: "", description: "", price: "", duration_minutes: "", image_url: "" });
      setImageFiles([]);
      setEditingService(null);
      setUploading(false);
      fetchProviderAndServices();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred");
      setUploading(false);
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
      fetchProviderAndServices();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Services</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingService(null); setImageFiles([]); setFormData({ name: "", description: "", price: "", duration_minutes: "", image_url: "" }); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                <Label>Upload Images (up to 5)</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 5);
                    setImageFiles(files);
                  }} 
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {imageFiles.length > 0 ? `${imageFiles.length} image(s) selected` : "Select 1-5 images"}
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <>{editingService ? "Update" : "Create"} Service</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const imageUrls = service.images?.map((img: any) => img.image_url) || [];
          if (service.image_url && imageUrls.length === 0) {
            imageUrls.push(service.image_url);
          }
          
          return (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {imageUrls.length > 0 && (
                  <div className="mb-4">
                    <ImageCarousel images={imageUrls} alt={service.name} />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                <p className="font-semibold">₱{service.price}</p>
                <p className="text-sm">{service.duration_minutes} minutes</p>
                <div className="flex gap-2 mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => { setEditingService(service); setImageFiles([]); setFormData({ ...service, price: service.price.toString(), duration_minutes: service.duration_minutes.toString() }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                          <Label>Add More Images (up to 5 total)</Label>
                          <Input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []).slice(0, 5);
                              setImageFiles(files);
                            }} 
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            {imageFiles.length > 0 ? `${imageFiles.length} new image(s) selected` : "Select images to add"}
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={uploading}>
                          {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Update Service"}
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
          );
        })}
      </div>
    </div>
  );
}