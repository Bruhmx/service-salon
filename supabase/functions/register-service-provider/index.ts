import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema matching database constraints
const serviceProviderSchema = z.object({
  businessName: z.string()
    .trim()
    .min(2, { message: "Business name must be at least 2 characters" })
    .max(200, { message: "Business name must be less than 200 characters" })
    .regex(/^[a-zA-Z0-9\s\-'&.]+$/, { message: "Business name contains invalid characters" }),
  description: z.string()
    .trim()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(2000, { message: "Description must be less than 2000 characters" })
    .optional()
    .nullable(),
  address: z.string()
    .trim()
    .min(5, { message: "Address must be at least 5 characters" })
    .max(500, { message: "Address must be less than 500 characters" }),
  zipCode: z.string()
    .trim()
    .min(4, { message: "Zip code must be at least 4 characters" })
    .max(20, { message: "Zip code must be less than 20 characters" })
    .regex(/^[a-zA-Z0-9\s\-]+$/, { message: "Invalid zip code format" }),
  phone: z.string()
    .trim()
    .min(10, { message: "Phone number must be at least 10 characters" })
    .max(20, { message: "Phone number must be less than 20 characters" })
    .regex(/^[\d\s\-+()\\.]+$/, { message: "Invalid phone number format" })
    .optional()
    .nullable(),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    console.log('Received registration request for user:', user.id);

    const validated = serviceProviderSchema.parse(body);

    // Sanitize HTML/special characters in text fields
    const sanitize = (text: string | null | undefined): string | null => {
      if (!text) return null;
      return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    // Check if user already has a service provider profile
    const { data: existing, error: checkError } = await supabaseClient
      .from('service_providers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing provider:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing provider profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Service provider profile already exists for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Insert service provider profile with sanitized data
    const { data, error } = await supabaseClient
      .from('service_providers')
      .insert([
        {
          user_id: user.id,
          business_name: sanitize(validated.businessName),
          description: sanitize(validated.description),
          address: sanitize(validated.address),
          zip_code: validated.zipCode.toUpperCase(), // Normalize zip code
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Provide user-friendly error messages based on constraint violations
      if (error.message.includes('business_name_length')) {
        return new Response(
          JSON.stringify({ error: 'Business name must be between 2 and 200 characters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      if (error.message.includes('description_length')) {
        return new Response(
          JSON.stringify({ error: 'Description must be between 10 and 2000 characters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      if (error.message.includes('address_length')) {
        return new Response(
          JSON.stringify({ error: 'Address must be between 5 and 500 characters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      if (error.message.includes('zip_length')) {
        return new Response(
          JSON.stringify({ error: 'Zip code must be between 4 and 20 characters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create service provider profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Update profile with phone if provided
    if (validated.phone) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ phone: validated.phone })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update phone:', profileError);
        // Don't fail the whole operation for phone update
      }
    }

    console.log('Successfully created service provider:', data.id);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in register-service-provider:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
