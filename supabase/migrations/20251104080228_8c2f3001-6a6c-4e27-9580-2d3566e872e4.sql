-- Create tables for storing multiple images for services, products, and equipment

-- Service images table
CREATE TABLE IF NOT EXISTS public.service_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipment images table
CREATE TABLE IF NOT EXISTS public.equipment_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.service_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_images
CREATE POLICY "Anyone can view service images"
  ON public.service_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.services
    WHERE services.id = service_images.service_id
    AND services.is_active = true
  ));

CREATE POLICY "Service providers can manage own service images"
  ON public.service_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services
    JOIN public.service_providers ON services.provider_id = service_providers.id
    WHERE services.id = service_images.service_id
    AND service_providers.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all service images"
  ON public.service_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for product_images
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = product_images.product_id
    AND products.is_active = true
  ));

CREATE POLICY "Service providers can manage own product images"
  ON public.product_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products
    JOIN public.service_providers ON products.provider_id = service_providers.id
    WHERE products.id = product_images.product_id
    AND service_providers.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all product images"
  ON public.product_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for equipment_images
CREATE POLICY "Anyone can view equipment images"
  ON public.equipment_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.equipment
    WHERE equipment.id = equipment_images.equipment_id
    AND equipment.is_active = true
  ));

CREATE POLICY "Service providers can manage own equipment images"
  ON public.equipment_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.equipment
    JOIN public.service_providers ON equipment.provider_id = service_providers.id
    WHERE equipment.id = equipment_images.equipment_id
    AND service_providers.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all equipment images"
  ON public.equipment_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_service_images_service_id ON public.service_images(service_id);
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_equipment_images_equipment_id ON public.equipment_images(equipment_id);