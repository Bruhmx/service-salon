import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageCarousel } from "@/components/ImageCarousel";

export default function ProviderEquipment() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [gcashQrFile, setGcashQrFile] = useState<File | null>(null);
  const [gcashQrUrl, setGcashQrUrl] = useState<string>("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_per_day: "",
    image_url: "",
  });

  useEffect(() => {
    fetchProviderAndEquipment();
  }, []);

  const fetchProviderAndEquipment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: provider } = await supabase
      .from("service_providers")
      .select("id, gcash_qr_code_url")
      .eq("user_id", user.id)
      .single();

    if (provider) {
      setProviderId(provider.id);
      setGcashQrUrl(provider.gcash_qr_code_url || "");
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select(`
          *,
          equipment_images (
            id,
            image_url,
            display_order
          )
        `)
        .eq("provider_id", provider.id);
      
      if (equipmentData) {
        const equipmentWithImages = equipmentData.map((equip: any) => ({
          ...equip,
          images: equip.equipment_images?.sort((a: any, b: any) => a.display_order - b.display_order) || []
        }));
        setEquipment(equipmentWithImages);
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
        .from('equipment-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload image: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('equipment-images')
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

    if (imageFiles.length < 1 && !editingEquipment) {
      toast.error("Please upload at least 1 image");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = formData.image_url;

      if (imageFiles.length > 0) {
        const uploadedUrl = await uploadImage(imageFiles[0]);
        if (!uploadedUrl) {
          setUploading(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      const action = editingEquipment ? 'update' : 'create';
      const data: any = {
        name: formData.name,
        description: formData.description,
        price_per_day: parseFloat(formData.price_per_day),
        image_url: imageUrl,
        provider_id: providerId,
      };

      if (editingEquipment) {
        data.id = editingEquipment.id;
      }

      const { data: result, error } = await supabase.functions.invoke('manage-equipment', {
        body: { action, data },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(editingEquipment ? "Failed to update equipment" : "Failed to create equipment");
        setUploading(false);
        return;
      }

      const equipmentId = result.equipment?.id || editingEquipment?.id;

      if (imageFiles.length > 0 && equipmentId) {
        for (let i = 0; i < imageFiles.length; i++) {
          const uploadedUrl = await uploadImage(imageFiles[i]);
          if (uploadedUrl) {
            await supabase.from("equipment_images").insert({
              equipment_id: equipmentId,
              image_url: uploadedUrl,
              display_order: i,
            });
          }
        }
      }

      toast.success(editingEquipment ? "Equipment updated successfully" : "Equipment created successfully");
      setFormData({ name: "", description: "", price_per_day: "", image_url: "" });
      setImageFiles([]);
      setEditingEquipment(null);
      setUploading(false);
      fetchProviderAndEquipment();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred");
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;
    
    try {
      const { error } = await supabase.functions.invoke('manage-equipment', {
        body: { action: 'delete', id },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error("Failed to delete equipment");
        return;
      }

      toast.success("Equipment deleted successfully");
      fetchProviderAndEquipment();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleUploadGcashQr = async () => {
    if (!gcashQrFile || !providerId) return;

    try {
      setUploadingQr(true);
      const fileExt = gcashQrFile.name.split('.').pop();
      const fileName = `gcash-qr-${providerId}.${fileExt}`;
      const filePath = `${providerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('provider_backgrounds')
        .upload(filePath, gcashQrFile, { upsert: true });

      if (uploadError) {
        toast.error(`Failed to upload QR code: ${uploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('provider_backgrounds')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("service_providers")
        .update({ gcash_qr_code_url: publicUrl })
        .eq("id", providerId);

      if (updateError) {
        toast.error("Failed to save QR code URL");
        return;
      }

      setGcashQrUrl(publicUrl);
      setGcashQrFile(null);
      toast.success("GCash QR code uploaded successfully!");
    } catch (error: any) {
      toast.error("Failed to upload QR code");
    } finally {
      setUploadingQr(false);
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
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          My Equipment
        </h1>
        <p className="text-muted-foreground">Manage your rental equipment</p>
      </div>

      {/* GCash QR Code Section */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>GCash Payment QR Code</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload your GCash QR code for customers to make downpayment when renting equipment
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Upload QR Code Image</Label>
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => setGcashQrFile(e.target.files?.[0] || null)} 
              />
              <Button 
                onClick={handleUploadGcashQr} 
                disabled={!gcashQrFile || uploadingQr}
                className="w-full"
              >
                {uploadingQr ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Upload QR Code"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Current QR Code</Label>
              {gcashQrUrl ? (
                <div className="border rounded-lg p-2 bg-muted">
                  <img src={gcashQrUrl} alt="GCash QR Code" className="w-full max-w-[200px] mx-auto" />
                </div>
              ) : (
                <div className="border rounded-lg p-8 bg-muted text-center text-sm text-muted-foreground">
                  No QR code uploaded yet
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Equipment List</h2>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEquipment(null); setImageFiles([]); setFormData({ name: "", description: "", price_per_day: "", image_url: "" }); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Equipment Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <Label>Price Per Day</Label>
                <Input type="number" step="0.01" value={formData.price_per_day} onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })} required />
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
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <>{editingEquipment ? "Update" : "Create"} Equipment</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipment.map((item) => {
          const imageUrls = item.images?.map((img: any) => img.image_url) || [];
          if (item.image_url && imageUrls.length === 0) {
            imageUrls.push(item.image_url);
          }
          
          return (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {imageUrls.length > 0 && (
                  <div className="mb-4">
                    <ImageCarousel images={imageUrls} alt={item.name} />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                <p className="font-semibold">₱{item.price_per_day}/day</p>
                <p className="text-sm mt-1">Status: {item.is_available ? "Available" : "Unavailable"}</p>
                <div className="flex gap-2 mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => { setEditingEquipment(item); setImageFiles([]); setFormData({ ...item, price_per_day: item.price_per_day.toString() }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Equipment</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label>Equipment Name</Label>
                          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div>
                          <Label>Price Per Day</Label>
                          <Input type="number" step="0.01" value={formData.price_per_day} onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })} required />
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
                          {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Update Equipment"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {equipment.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No equipment added yet. Click "Add Equipment" to get started.</p>
        </div>
      )}
    </div>
  );
}