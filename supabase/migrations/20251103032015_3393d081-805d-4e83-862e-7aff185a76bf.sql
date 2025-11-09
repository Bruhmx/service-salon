-- Storage policies for equipment-images bucket
CREATE POLICY "Providers can upload equipment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'equipment-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their equipment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'equipment-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their equipment images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'equipment-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

-- Storage policies for service-images bucket
CREATE POLICY "Providers can upload service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their service images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their service images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

-- Storage policies for product-images bucket
CREATE POLICY "Providers can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE user_id = auth.uid()
  )
);