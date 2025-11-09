-- Create equipment/rental items table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_day NUMERIC NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create equipment rentals/bookings table
CREATE TABLE public.equipment_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  rental_start_date DATE NOT NULL,
  rental_end_date DATE NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product orders table
CREATE TABLE public.product_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on equipment table
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment
CREATE POLICY "Anyone can view active equipment"
ON public.equipment FOR SELECT
USING (is_active = true);

CREATE POLICY "Service providers can manage own equipment"
ON public.equipment FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = equipment.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all equipment"
ON public.equipment FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on equipment_rentals table
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_rentals
CREATE POLICY "Customers can view own rentals"
ON public.equipment_rentals FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create rentals"
ON public.equipment_rentals FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Providers can view their rentals"
ON public.equipment_rentals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = equipment_rentals.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their rentals"
ON public.equipment_rentals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = equipment_rentals.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all rentals"
ON public.equipment_rentals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on product_orders table
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_orders
CREATE POLICY "Customers can view own orders"
ON public.product_orders FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create orders"
ON public.product_orders FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Providers can view their orders"
ON public.product_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = product_orders.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their orders"
ON public.product_orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE service_providers.id = product_orders.provider_id
    AND service_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all orders"
ON public.product_orders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));