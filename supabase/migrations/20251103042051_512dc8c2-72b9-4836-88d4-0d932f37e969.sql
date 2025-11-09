-- Add new order statuses for better tracking
-- Update the existing status check to include new statuses for product orders

-- First, let's add a comment to document the expected statuses
COMMENT ON COLUMN product_orders.status IS 'Order status: pending (awaiting payment), processing (payment confirmed, preparing), shipped (out for delivery), completed (delivered and confirmed), cancelled';

-- Add the same for equipment rentals
COMMENT ON COLUMN equipment_rentals.status IS 'Rental status: pending (awaiting confirmation), confirmed (confirmed by provider), completed (rental returned), cancelled';

-- Add for bookings
COMMENT ON COLUMN bookings.status IS 'Booking status: pending (awaiting confirmation), confirmed (confirmed by provider), completed (service completed), cancelled';