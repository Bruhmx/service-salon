-- Add valid_id_url column to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN valid_id_url TEXT;

-- Create storage bucket for valid IDs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('valid-ids', 'valid-ids', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for valid-ids bucket
CREATE POLICY "Service providers can upload their own valid ID"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'valid-ids' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service providers can view their own valid ID"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'valid-ids' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all valid IDs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'valid-ids' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);