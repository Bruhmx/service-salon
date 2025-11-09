-- Allow service providers to view profiles of customers who have bookings with them
CREATE POLICY "Providers can view customer profiles from bookings"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM bookings b
    JOIN service_providers sp ON b.provider_id = sp.id
    WHERE b.customer_id = profiles.id
    AND sp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM product_orders po
    JOIN service_providers sp ON po.provider_id = sp.id
    WHERE po.customer_id = profiles.id
    AND sp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM equipment_rentals er
    JOIN service_providers sp ON er.provider_id = sp.id
    WHERE er.customer_id = profiles.id
    AND sp.user_id = auth.uid()
  )
);