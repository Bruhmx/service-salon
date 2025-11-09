-- Add gcash_qr_code_url column to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN gcash_qr_code_url TEXT;