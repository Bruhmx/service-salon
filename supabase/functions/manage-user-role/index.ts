import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'customer', 'service_provider']),
  action: z.enum(['add', 'remove']),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin status using the security definer function
    const { data: isAdmin, error: roleCheckError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleCheckError || !isAdmin) {
      console.error('Admin verification failed:', roleCheckError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const validated = roleSchema.parse(body);

    // Prevent admin from removing their own admin role
    if (validated.action === 'remove' && validated.role === 'admin' && validated.userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot remove your own admin role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (validated.action === 'remove' && validated.role === 'admin') {
      // Check if this is the last admin
      const { count, error: countError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (countError) {
        console.error('Error counting admins:', countError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify admin count' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (count && count <= 1) {
        return new Response(
          JSON.stringify({ error: 'Cannot remove the last admin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Perform the role change
    if (validated.action === 'add') {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: validated.userId, role: validated.role }]);
      
      if (error) {
        console.error('Error adding role:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to add role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin ${user.id} added role ${validated.role} to user ${validated.userId}`);
    } else {
      // Remove role
      const { data: roleData, error: fetchError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', validated.userId)
        .eq('role', validated.role)
        .single();
      
      if (fetchError || !roleData) {
        console.error('Error fetching role:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Role not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleData.id);
      
      if (error) {
        console.error('Error removing role:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to remove role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin ${user.id} removed role ${validated.role} from user ${validated.userId}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Role updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Unexpected error in manage-user-role:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
