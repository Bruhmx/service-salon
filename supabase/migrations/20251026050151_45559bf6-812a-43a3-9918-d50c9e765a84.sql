-- Add admin override policies for comprehensive access control

-- Allow admins to view all bookings
CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all bookings
CREATE POLICY "Admins can manage all bookings"
  ON public.bookings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all service providers
CREATE POLICY "Admins can view all providers"
  ON public.service_providers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all service providers
CREATE POLICY "Admins can manage all providers"
  ON public.service_providers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all services
CREATE POLICY "Admins can manage all services"
  ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all products
CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all reviews
CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));