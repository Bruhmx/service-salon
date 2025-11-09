-- Allow customers to cancel their own orders/rentals/bookings by updating status to 'cancelled'

-- Product Orders: let customers update their own rows only to set status='cancelled'
CREATE POLICY "Customers can cancel own orders"
ON public.product_orders
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id AND status = 'cancelled');

-- Equipment Rentals: let customers update their own rows only to set status='cancelled'
CREATE POLICY "Customers can cancel own rentals"
ON public.equipment_rentals
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id AND status = 'cancelled');

-- Bookings: let customers update their own rows only to set status='cancelled'
CREATE POLICY "Customers can cancel own bookings"
ON public.bookings
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id AND status = 'cancelled');