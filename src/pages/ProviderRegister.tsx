import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const providerSchema = z.object({
  business_name: z.string().trim().min(2, "Business name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(200),
  zip_code: z.string().trim().regex(/^\d{4,6}$/, "Please enter a valid ZIP code"),
  profile_image_url: z.string().url().optional().or(z.literal("")),
  valid_id_url: z.string().min(1, "Valid ID is required for verification"),
});

export default function ProviderRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploadType, setImageUploadType] = useState<"url" | "file">("url");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [validIdFile, setValidIdFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    business_name: "",
    description: "",
    address: "",
    zip_code: "",
    profile_image_url: "",
    valid_id_url: "",
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasProviderRole = roles?.some((r) => r.role === "service_provider");

      if (!hasProviderRole) {
        toast.error("Access denied. Service provider role required.");
        navigate("/");
        return;
      }

      // Check if already registered
      const { data: existingProvider } = await supabase
        .from("service_providers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProvider) {
        toast.info("You're already registered as a provider");
        navigate("/provider/dashboard");
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate valid ID file is uploaded
    if (!validIdFile) {
      toast.error("Please upload a valid ID for verification");
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      // Upload valid ID first (required)
      const idFileExt = validIdFile.name.split(".").pop();
      const idFileName = `${user.id}/valid-id-${Date.now()}.${idFileExt}`;
      
      const { error: idUploadError } = await supabase.storage
        .from("valid-ids")
        .upload(idFileName, validIdFile);

      if (idUploadError) {
        toast.error("Failed to upload valid ID");
        throw idUploadError;
      }

      const { data: { publicUrl: validIdUrl } } = supabase.storage
        .from("valid-ids")
        .getPublicUrl(idFileName);

      // Set the valid_id_url in formData before validation
      const dataToValidate = { ...formData, valid_id_url: validIdUrl };
      const validated = providerSchema.parse(dataToValidate);

      let profileImageUrl = validated.profile_image_url;

      // Handle profile image file upload if chosen
      if (imageUploadType === "file" && imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("service-images")
          .upload(filePath, imageFile);

        if (uploadError) {
          toast.error("Failed to upload image");
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("service-images")
          .getPublicUrl(filePath);

        profileImageUrl = publicUrl;
      }

      const { error } = await supabase.from("service_providers").insert({
        user_id: user.id,
        business_name: validated.business_name,
        description: validated.description || null,
        address: validated.address,
        zip_code: validated.zip_code,
        profile_image_url: profileImageUrl || null,
        valid_id_url: validIdUrl,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Business profile created successfully!");
      navigate("/provider/dashboard");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create business profile");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Register Your Business
            </CardTitle>
            <p className="text-muted-foreground text-center">
              Complete your business profile to start offering services
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({ ...formData, business_name: e.target.value })
                  }
                  required
                  maxLength={100}
                  placeholder="Your Business Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  maxLength={500}
                  rows={4}
                  placeholder="Describe your business and services..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  required
                  maxLength={200}
                  placeholder="123 Main Street, City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) =>
                    setFormData({ ...formData, zip_code: e.target.value })
                  }
                  required
                  pattern="\d{4,6}"
                  placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_id">Valid ID * (For Verification)</Label>
                <p className="text-sm text-muted-foreground">
                  Upload a government-issued ID to verify your identity (Driver's License, Passport, National ID, etc.)
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="valid_id"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setValidIdFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                    required
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {validIdFile && (
                  <p className="text-sm text-green-600">
                    ✓ Selected: {validIdFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Profile Image (Optional)</Label>
                <Tabs value={imageUploadType} onValueChange={(v) => setImageUploadType(v as "url" | "file")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">Image URL</TabsTrigger>
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="space-y-2">
                    <Input
                      id="profile_image_url"
                      type="url"
                      value={formData.profile_image_url}
                      onChange={(e) =>
                        setFormData({ ...formData, profile_image_url: e.target.value })
                      }
                      placeholder="https://example.com/image.jpg"
                    />
                  </TabsContent>
                  <TabsContent value="file" className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="profile_image_file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {imageFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {imageFile.name}
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  "Create Business Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
