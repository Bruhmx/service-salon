import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    )

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { rentalId, newStatus } = await req.json()
    console.log('Updating rental:', rentalId, 'to status:', newStatus)

    if (!rentalId || !newStatus) {
      return new Response(
        JSON.stringify({ error: 'Missing rentalId or newStatus' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'active', 'completed', 'cancelled']
    if (!validStatuses.includes(newStatus)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the rental details including equipment_id
    const { data: rental, error: rentalFetchError } = await supabaseClient
      .from('equipment_rentals')
      .select('equipment_id, status, provider_id')
      .eq('id', rentalId)
      .single()

    if (rentalFetchError || !rental) {
      console.error('Error fetching rental:', rentalFetchError)
      return new Response(
        JSON.stringify({ error: 'Rental not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user owns this provider
    const { data: provider, error: providerError } = await supabaseClient
      .from('service_providers')
      .select('id')
      .eq('id', rental.provider_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (providerError || !provider) {
      console.error('Provider verification failed:', providerError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not your rental' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update rental status
    const { error: updateError } = await supabaseClient
      .from('equipment_rentals')
      .update({ status: newStatus })
      .eq('id', rentalId)

    if (updateError) {
      console.error('Error updating rental status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update rental status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update equipment availability based on status
    let shouldBeAvailable = true
    
    if (newStatus === 'active') {
      // Equipment is now rented out, make it unavailable
      shouldBeAvailable = false
      console.log('Setting equipment to unavailable (active rental)')
    } else if (newStatus === 'completed' || newStatus === 'cancelled') {
      // Equipment returned or rental cancelled, make it available
      shouldBeAvailable = true
      console.log('Setting equipment to available (completed/cancelled)')
    }

    const { error: equipmentError } = await supabaseClient
      .from('equipment')
      .update({ is_available: shouldBeAvailable })
      .eq('id', rental.equipment_id)

    if (equipmentError) {
      console.error('Error updating equipment availability:', equipmentError)
      // Don't fail the whole operation if equipment update fails
      // Status was already updated successfully
    }

    console.log('Successfully updated rental status and equipment availability')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Rental status updated successfully',
        equipmentAvailability: shouldBeAvailable 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
