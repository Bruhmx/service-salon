import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Save, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function ProviderSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [gcashQrUrl, setGcashQrUrl] = useState<string | null>(null);
  const [uploadingGcash, setUploadingGcash] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    description: "",
    address: "",
    zipCode: "",
    isActive: true,
  });

  useEffect(() => {
    checkProviderAccess();
  }, []);

  const checkProviderAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/login");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isProvider = roles?.some(r => r.role === "service_provider");
      
      if (!isProvider) {
        toast.error("Access denied. Service provider account required.");
        navigate("/");
        return;
      }

      const { data: provider } = await supabase
        .from("service_providers")
        .select("id, background_image_url, gcash_qr_code_url, business_name, description, address, zip_code, is_active")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!provider) {
        toast.error("Provider profile not found");
        navigate("/provider-register");
        return;
      }

      setProviderId(provider.id);
      setBackgroundUrl(provider.background_image_url);
      setGcashQrUrl(provider.gcash_qr_code_url);
      setFormData({
        businessName: provider.business_name || "",
        description: provider.description || "",
        address: provider.address || "",
        zipCode: provider.zip_code || "",
        isActive: provider.is_active ?? true,
      });
    } catch (error) {
      console.error("Error checking provider access:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !providerId) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${providerId}/background.${fileExt}`;

    try {
      setUploading(true);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('provider_backgrounds')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('provider_backgrounds')
        .getPublicUrl(filePath);

      // Update provider record
      const { error: updateError } = await supabase
        .from('service_providers')
        .update({ background_image_url: publicUrl })
        .eq('id', providerId);

      if (updateError) throw updateError;

      setBackgroundUrl(publicUrl);
      toast.success("Background image updated successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload background image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!providerId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('service_providers')
        .update({
          business_name: formData.businessName,
          description: formData.description,
          address: formData.address,
          zip_code: formData.zipCode,
          is_active: formData.isActive,
        })
        .eq('id', providerId);

      if (error) throw error;

      toast.success("Business profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update business profile");
    } finally {
      setSaving(false);
    }
  };

  const handleGcashQrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !providerId) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${providerId}/gcash-qr.${fileExt}`;

    try {
      setUploadingGcash(true);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('provider_backgrounds')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('provider_backgrounds')
        .getPublicUrl(filePath);

      // Update provider record
      const { error: updateError } = await supabase
        .from('service_providers')
        .update({ gcash_qr_code_url: publicUrl })
        .eq('id', providerId);

      if (updateError) throw updateError;

      setGcashQrUrl(publicUrl);
      toast.success("GCash QR code updated successfully");
    } catch (error) {
      console.error("Error uploading GCash QR:", error);
      toast.error("Failed to upload GCash QR code");
    } finally {
      setUploadingGcash(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Business Profile</h1>
        <p className="text-muted-foreground mt-2">Customize how your business appears to customers on the home page</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Update your business details that will be shown to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 p-4 bg-secondary/20 rounded-lg border-2 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Power className={`h-5 w-5 ${formData.isActive ? 'text-green-500' : 'text-red-500'}`} />
                  <Label htmlFor="availability" className="text-base font-semibold">
                    Business Availability Status
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.isActive 
                    ? "Your business is currently visible and accepting bookings" 
                    : "Your business is currently hidden and not accepting bookings"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${formData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {formData.isActive ? 'Available' : 'Unavailable'}
                </span>
                <Switch
                  id="availability"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Your business name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your business and services..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Your business address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">Zip Code</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              placeholder="Postal code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="background-image">Background Image</Label>
            {backgroundUrl && (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border bg-muted flex items-center justify-center mb-2">
                <img
                  src={backgroundUrl}
                  alt="Business background"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              <Label htmlFor="background-upload" className="cursor-pointer">
                <Button type="button" disabled={uploading} asChild>
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {backgroundUrl ? "Change Image" : "Upload Image"}
                      </>
                    )}
                  </span>
                </Button>
              </Label>
              <input
                id="background-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Recommended size: 1920x1080px. Accepts JPG, PNG, or WebP.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="gcash-qr">GCash QR Code for Downpayment</Label>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/50 rounded-lg">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                ⚠️ Important: Upload ONLY the QR code image
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>Screenshot your GCash QR code</li>
                <li>Crop the image to show ONLY the QR code itself</li>
                <li>Do NOT include the GCash app interface or blue background</li>
                <li>The QR code should be clear and scannable</li>
              </ul>
            </div>

            {gcashQrUrl && (
              <div className="relative w-full max-w-xs mx-auto rounded-lg overflow-hidden border-2 bg-white p-4 flex items-center justify-center">
                <img
                  src={gcashQrUrl}
                  alt="GCash QR Code"
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <Label htmlFor="gcash-upload" className="cursor-pointer">
                <Button type="button" disabled={uploadingGcash} asChild>
                  <span>
                    {uploadingGcash ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {gcashQrUrl ? "Change QR Code" : "Upload QR Code"}
                      </>
                    )}
                  </span>
                </Button>
              </Label>
              <input
                id="gcash-upload"
                type="file"
                accept="image/*"
                onChange={handleGcashQrUpload}
                disabled={uploadingGcash}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: Square image with just the QR code. Accepts JPG, PNG, or WebP.
            </p>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
