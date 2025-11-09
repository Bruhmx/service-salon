-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('service-images', 'service-images', true),
  ('product-images', 'product-images', true),
  ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for service images
CREATE POLICY "Service images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'service-images');

CREATE POLICY "Admins can upload service images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'service-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

CREATE POLICY "Admins can update service images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'service-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

CREATE POLICY "Admins can delete service images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'service-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

-- Create storage policies for product images
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

CREATE POLICY "Admins can update product images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

CREATE POLICY "Admins can delete product images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

-- Create storage policies for equipment images
CREATE POLICY "Equipment images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'equipment-images');

CREATE POLICY "Admins can upload equipment images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'equipment-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

CREATE POLICY "Admins can update equipment images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'equipment-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

CREATE POLICY "Admins can delete equipment images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'equipment-images' AND (
  SELECT has_role(auth.uid(), 'admin'::app_role)
));

-- Make provider_id nullable for admin-created items
ALTER TABLE services ALTER COLUMN provider_id DROP NOT NULL;
ALTER TABLE products ALTER COLUMN provider_id DROP NOT NULL;
ALTER TABLE equipment ALTER COLUMN provider_id DROP NOT NULL;