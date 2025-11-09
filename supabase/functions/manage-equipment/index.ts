import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const equipmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().trim().max(2000, 'Description must be less than 2000 characters').optional().nullable(),
  price_per_day: z.number().positive('Price must be positive').max(99999, 'Price too high').finite(),
  image_url: z.string().trim().url('Invalid image URL').max(500).optional().nullable(),
  provider_id: z.string().uuid('Invalid provider ID').optional().nullable(),
  is_active: z.boolean().optional(),
  is_available: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid('Invalid equipment ID'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    console.log(`Equipment management action: ${action} by user ${user.id}`);

    if (action === 'create' || action === 'update') {
      const validationResult = equipmentSchema.safeParse(body.data);
      if (!validationResult.success) {
        console.error('Validation error:', validationResult.error.format());
        return new Response(JSON.stringify({ 
          error: 'Validation failed', 
          details: validationResult.error.format() 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const equipmentData = validationResult.data;

      if (action === 'create') {
        const { data, error } = await supabase
          .from('equipment')
          .insert(equipmentData)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Equipment created: ${data.id}`);
        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const { id, ...updateData } = equipmentData;
        const { data, error } = await supabase
          .from('equipment')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Equipment updated: ${id}`);
        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (action === 'delete') {
      const validationResult = deleteSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ 
          error: 'Invalid equipment ID',
          details: validationResult.error.format() 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', validationResult.data.id);

      if (error) {
        console.error('Database error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Equipment deleted: ${validationResult.data.id}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
