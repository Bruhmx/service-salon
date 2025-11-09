-- Update RLS policy for reviews to only allow customers who have booked the provider
DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;

CREATE POLICY "Customers can create reviews if they have bookings" 
ON public.reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = customer_id 
  AND EXISTS (
    SELECT 1 
    FROM bookings 
    WHERE bookings.customer_id = auth.uid() 
    AND bookings.provider_id = reviews.provider_id
    AND bookings.status IN ('completed', 'confirmed')
  )
);