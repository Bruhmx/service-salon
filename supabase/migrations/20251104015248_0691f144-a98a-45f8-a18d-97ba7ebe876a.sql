-- Create a function to get booking availability for a provider
-- This returns only dates and times without customer information
CREATE OR REPLACE FUNCTION get_provider_booking_availability(provider_uuid uuid, start_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  booking_date date,
  booking_time time
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT b.booking_date, b.booking_time
  FROM bookings b
  WHERE b.provider_id = provider_uuid
    AND b.status != 'cancelled'
    AND b.booking_date >= start_date
  ORDER BY b.booking_date, b.booking_time;
END;
$$;