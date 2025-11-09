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

export default function ProviderProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    image_url: "",
  });

  useEffect(() => {
    fetchProviderAndProducts();
  }, []);

  const fetchProviderAndProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (provider) {
      setProviderId(provider.id);
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          *,
          product_images (
            id,
            image_url,
            display_order
          )
        `)
        .eq("provider_id", provider.id);
      
      if (productsData) {
        const productsWithImages = productsData.map((product: any) => ({
          ...product,
          images: product.product_images?.sort((a: any, b: any) => a.display_order - b.display_order) || []
        }));
        setProducts(productsWithImages);
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
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload image: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
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

    if (imageFiles.length < 1 && !editingProduct) {
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

      const action = editingProduct ? 'update' : 'create';
      const data: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: imageUrl,
        provider_id: providerId,
      };

      if (editingProduct) {
        data.id = editingProduct.id;
      }

      const { data: result, error } = await supabase.functions.invoke('manage-product', {
        body: { action, data },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(editingProduct ? "Failed to update product" : "Failed to create product");
        setUploading(false);
        return;
      }

      const productId = result.product?.id || editingProduct?.id;

      if (imageFiles.length > 0 && productId) {
        for (let i = 0; i < imageFiles.length; i++) {
          const uploadedUrl = await uploadImage(imageFiles[i]);
          if (uploadedUrl) {
            await supabase.from("product_images").insert({
              product_id: productId,
              image_url: uploadedUrl,
              display_order: i,
            });
          }
        }
      }

      toast.success(editingProduct ? "Product updated successfully" : "Product created successfully");
      setFormData({ name: "", description: "", price: "", stock_quantity: "", image_url: "" });
      setImageFiles([]);
      setEditingProduct(null);
      setUploading(false);
      fetchProviderAndProducts();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred");
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const { error } = await supabase.functions.invoke('manage-product', {
        body: { action: 'delete', id },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error("Failed to delete product");
        return;
      }

      toast.success("Product deleted successfully");
      fetchProviderAndProducts();
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
        <h1 className="text-3xl font-bold">My Products</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingProduct(null); setImageFiles([]); setFormData({ name: "", description: "", price: "", stock_quantity: "", image_url: "" }); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Product Name</Label>
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
                <Label>Stock Quantity</Label>
                <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} required />
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
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <>{editingProduct ? "Update" : "Create"} Product</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const imageUrls = product.images?.map((img: any) => img.image_url) || [];
          if (product.image_url && imageUrls.length === 0) {
            imageUrls.push(product.image_url);
          }
          
          return (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {imageUrls.length > 0 && (
                  <div className="mb-4">
                    <ImageCarousel images={imageUrls} alt={product.name} />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                <p className="font-semibold">₱{product.price}</p>
                <p className="text-sm">Stock: {product.stock_quantity}</p>
                <div className="flex gap-2 mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => { setEditingProduct(product); setImageFiles([]); setFormData({ ...product, price: product.price.toString(), stock_quantity: product.stock_quantity.toString() }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label>Product Name</Label>
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
                          <Label>Stock Quantity</Label>
                          <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} required />
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
                          {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Update Product"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
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