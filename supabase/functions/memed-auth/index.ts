import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Memed API credentials from environment
const MEMED_API_KEY = Deno.env.get('MEMED_API_KEY') || "";
const MEMED_SECRET_KEY = Deno.env.get('MEMED_SECRET_KEY') || "";

// Memed Production URLs
const MEMED_API_URL = "https://integrations.api.memed.com.br";
const MEMED_SCRIPT_URL = "https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, medico_id } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'get-token') {
      // Log keys being used (masked for security)
      const apiKeySource = Deno.env.get('MEMED_API_KEY') ? 'ENV' : 'FALLBACK';
      const secretKeySource = Deno.env.get('MEMED_SECRET_KEY') ? 'ENV' : 'FALLBACK';
      console.log(`Using API Key from: ${apiKeySource}, Secret Key from: ${secretKeySource}`);
      console.log(`API Key starts with: ${MEMED_API_KEY.substring(0, 8)}...`);
      console.log(`Secret Key starts with: ${MEMED_SECRET_KEY.substring(0, 8)}...`);
      // Get doctor data from database
      const { data: medico, error: medicoError } = await supabase
        .from('medicos')
        .select('id, nome, crm, usuario_id')
        .eq('id', medico_id)
        .single();

      if (medicoError || !medico) {
        console.error('Error fetching medico:', medicoError);
        return new Response(JSON.stringify({ error: 'Médico não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user email
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('email')
        .eq('id', medico.usuario_id)
        .single();

      // Extract CRM number and state (format: "123456/SP" or "123456-SP" or just "123456")
      let crmNumber = medico.crm || '';
      let crmState = 'SP'; // Default
      
      if (crmNumber.includes('/')) {
        const parts = crmNumber.split('/');
        crmNumber = parts[0].replace(/\D/g, '');
        crmState = parts[1]?.toUpperCase() || 'SP';
      } else if (crmNumber.includes('-')) {
        const parts = crmNumber.split('-');
        crmNumber = parts[0].replace(/\D/g, '');
        crmState = parts[1]?.toUpperCase() || 'SP';
      } else {
        crmNumber = crmNumber.replace(/\D/g, '');
      }

      // First try to get existing user token
      const getUserUrl = `${MEMED_API_URL}/v1/sinapse-prescricao/usuarios/${medico.id}?api-key=${MEMED_API_KEY}&secret-key=${MEMED_SECRET_KEY}`;
      
      console.log('Trying to get existing Memed user...');
      const getUserResponse = await fetch(getUserUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/json',
        },
      });

      if (getUserResponse.ok) {
        const userData = await getUserResponse.json();
        console.log('Existing Memed user found:', userData);
        
        return new Response(JSON.stringify({
          success: true,
          token: userData.data?.attributes?.token,
          scriptUrl: MEMED_SCRIPT_URL,
          medicoNome: medico.nome,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // User doesn't exist, create new one
      console.log('Creating new Memed user...');
      
      const nameParts = medico.nome.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'Doctor';

      const createUserUrl = `${MEMED_API_URL}/v1/sinapse-prescricao/usuarios?api-key=${MEMED_API_KEY}&secret-key=${MEMED_SECRET_KEY}`;
      
      const payload = {
        data: {
          type: "usuarios",
          attributes: {
            external_id: medico.id,
            nome: firstName,
            sobrenome: lastName,
            email: usuario?.email || `medico_${medico.id}@meconsulta.com`,
            board: {
              board_code: "CRM",
              board_number: crmNumber || "123456",
              board_state: crmState,
            },
          },
        },
      };

      console.log('Memed create user payload:', JSON.stringify(payload));

      const createResponse = await fetch(createUserUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const createData = await createResponse.json();
      console.log('Memed create response:', JSON.stringify(createData));

      if (!createResponse.ok) {
        console.error('Memed create error:', createData);
        return new Response(JSON.stringify({ 
          error: 'Erro ao cadastrar no Memed',
          details: createData,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        token: createData.data?.attributes?.token,
        scriptUrl: MEMED_SCRIPT_URL,
        medicoNome: medico.nome,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'get-script-url') {
      // Just return the script URL for loading
      return new Response(JSON.stringify({
        success: true,
        scriptUrl: MEMED_SCRIPT_URL,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in memed-auth function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
