-- Fix: Add unique constraint to prevent double-bookings (booking_slot_race)
ALTER TABLE bookings 
ADD CONSTRAINT unique_booking_slot 
UNIQUE (provider_id, booking_date, booking_time);