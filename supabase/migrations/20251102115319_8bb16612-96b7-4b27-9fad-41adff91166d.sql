-- Add background_image_url column to service_providers table
ALTER TABLE public.service_providers
ADD COLUMN background_image_url TEXT;

-- Create storage bucket for provider backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider_backgrounds', 'provider_backgrounds', true);

-- RLS policies for provider_backgrounds bucket
CREATE POLICY "Providers can view their own backgrounds"
ON storage.objects
FOR SELECT
USING (bucket_id = 'provider_backgrounds' AND auth.uid() IN (
  SELECT user_id FROM service_providers WHERE id::text = (storage.foldername(name))[1]
));

CREATE POLICY "Providers can upload their own backgrounds"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'provider_backgrounds' AND auth.uid() IN (
  SELECT user_id FROM service_providers WHERE id::text = (storage.foldername(name))[1]
));

CREATE POLICY "Providers can update their own backgrounds"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'provider_backgrounds' AND auth.uid() IN (
  SELECT user_id FROM service_providers WHERE id::text = (storage.foldername(name))[1]
));

CREATE POLICY "Providers can delete their own backgrounds"
ON storage.objects
FOR DELETE
USING (bucket_id = 'provider_backgrounds' AND auth.uid() IN (
  SELECT user_id FROM service_providers WHERE id::text = (storage.foldername(name))[1]
));

CREATE POLICY "Anyone can view public backgrounds"
ON storage.objects
FOR SELECT
USING (bucket_id = 'provider_backgrounds');