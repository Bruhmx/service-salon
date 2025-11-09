-- Add customer_phone column to bookings table for contact information
ALTER TABLE public.bookings 
ADD COLUMN customer_phone text;