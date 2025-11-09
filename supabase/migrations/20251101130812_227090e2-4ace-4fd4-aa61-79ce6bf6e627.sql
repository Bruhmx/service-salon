-- Add constraints for input validation at database level

-- Products table constraints
ALTER TABLE public.products
ADD CONSTRAINT products_name_length CHECK (char_length(name) > 0 AND char_length(name) <= 200),
ADD CONSTRAINT products_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
ADD CONSTRAINT products_price_range CHECK (price > 0 AND price <= 999999),
ADD CONSTRAINT products_stock_range CHECK (stock_quantity >= 0 AND stock_quantity <= 1000000);

-- Services table constraints
ALTER TABLE public.services
ADD CONSTRAINT services_name_length CHECK (char_length(name) > 0 AND char_length(name) <= 200),
ADD CONSTRAINT services_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
ADD CONSTRAINT services_price_range CHECK (price > 0 AND price <= 999999),
ADD CONSTRAINT services_duration_range CHECK (duration_minutes > 0 AND duration_minutes <= 1440);

-- Equipment table constraints
ALTER TABLE public.equipment
ADD CONSTRAINT equipment_name_length CHECK (char_length(name) > 0 AND char_length(name) <= 200),
ADD CONSTRAINT equipment_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
ADD CONSTRAINT equipment_price_range CHECK (price_per_day > 0 AND price_per_day <= 99999);

-- Service providers table constraints for registration data
ALTER TABLE public.service_providers
ADD CONSTRAINT service_providers_business_name_length CHECK (char_length(business_name) >= 2 AND char_length(business_name) <= 200),
ADD CONSTRAINT service_providers_description_length CHECK (description IS NULL OR char_length(description) >= 10 AND char_length(description) <= 2000),
ADD CONSTRAINT service_providers_address_length CHECK (char_length(address) >= 5 AND char_length(address) <= 500),
ADD CONSTRAINT service_providers_zip_length CHECK (char_length(zip_code) >= 4 AND char_length(zip_code) <= 20);