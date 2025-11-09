-- Make provider_id nullable in product_orders to support admin-created products
ALTER TABLE public.product_orders 
ALTER COLUMN provider_id DROP NOT NULL;