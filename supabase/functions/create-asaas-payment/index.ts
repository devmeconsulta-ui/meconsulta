import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasConfig {
  api_key: string;
  base_url: string;
  ambiente: string;
  ativo: boolean;
}

interface CreatePaymentRequest {
  consulta_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { consulta_id } = await req.json() as CreatePaymentRequest;
    
    if (!consulta_id) {
      return new Response(
        JSON.stringify({ error: 'consulta_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating Asaas payment for consulta: ${consulta_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Asaas configuration
    const { data: asaasConfig, error: configError } = await supabase
      .from('config_asaas')
      .select('api_key, base_url, ambiente, ativo')
      .eq('ativo', true)
      .maybeSingle();

    if (configError || !asaasConfig) {
      console.error('Asaas config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração do Asaas não encontrada ou inativa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = asaasConfig as AsaasConfig;
    console.log(`Using Asaas ${config.ambiente} environment`);

    // 2. Fetch consulta with patient data
    const { data: consulta, error: consultaError } = await supabase
      .from('consultas')
      .select(`
        id,
        valor_consulta,
        nome_paciente_consulta,
        paciente_id,
        medico_id,
        data_hora
      `)
      .eq('id', consulta_id)
      .maybeSingle();

    if (consultaError || !consulta) {
      console.error('Consulta error:', consultaError);
      return new Response(
        JSON.stringify({ error: 'Consulta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum value for Asaas (R$ 5,00)
    if (consulta.valor_consulta < 5) {
      console.error(`Valor da consulta (R$ ${consulta.valor_consulta}) abaixo do mínimo permitido (R$ 5,00)`);
      return new Response(
        JSON.stringify({ 
          error: `O valor mínimo para pagamento é R$ 5,00. O valor desta consulta é R$ ${Number(consulta.valor_consulta).toFixed(2)}.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch patient data
    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .select(`
        id,
        nome,
        cpf,
        telefone,
        asaas_customer_id,
        usuario_id
      `)
      .eq('id', consulta.paciente_id)
      .maybeSingle();

    if (pacienteError || !paciente) {
      console.error('Paciente error:', pacienteError);
      return new Response(
        JSON.stringify({ error: 'Paciente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch patient email from usuarios table
    let pacienteEmail = '';
    if (paciente.usuario_id) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('email')
        .eq('id', paciente.usuario_id)
        .maybeSingle();
      
      if (usuario) {
        pacienteEmail = usuario.email;
      }
    }

    // 5. Create or get Asaas customer
    let asaasCustomerId = paciente.asaas_customer_id;

    if (!asaasCustomerId) {
      console.log('Creating new Asaas customer...');
      
      // Format CPF - remove non-numeric characters
      const cpfFormatted = paciente.cpf?.replace(/\D/g, '') || '';
      
      const customerPayload = {
        name: paciente.nome,
        cpfCnpj: cpfFormatted,
        email: pacienteEmail || undefined,
        phone: paciente.telefone?.replace(/\D/g, '') || undefined,
        notificationDisabled: false,
      };

      console.log('Customer payload:', JSON.stringify(customerPayload));

      const customerResponse = await fetch(`${config.base_url}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': config.api_key,
        },
        body: JSON.stringify(customerPayload),
      });

      // Check if response is JSON
      const contentType = customerResponse.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const textResponse = await customerResponse.text();
        console.error('Asaas returned non-JSON response:', textResponse.substring(0, 500));
        console.error('Status:', customerResponse.status);
        console.error('URL used:', `${config.base_url}/customers`);
        return new Response(
          JSON.stringify({ 
            error: 'Erro na API do Asaas', 
            details: `Status: ${customerResponse.status}. A API retornou uma resposta inesperada. Verifique a API Key e URL.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customerResult = await customerResponse.json();
      console.log('Customer response:', JSON.stringify(customerResult));

      if (!customerResponse.ok) {
        // Check if customer already exists (by CPF)
        if (customerResult.errors?.[0]?.code === 'invalid_cpfCnpj' || 
            customerResult.errors?.[0]?.description?.includes('já cadastrado')) {
          // Try to find existing customer
          const searchResponse = await fetch(
            `${config.base_url}/customers?cpfCnpj=${cpfFormatted}`,
            {
              headers: { 'access_token': config.api_key },
            }
          );
          const searchResult = await searchResponse.json();
          
          if (searchResult.data?.[0]?.id) {
            asaasCustomerId = searchResult.data[0].id;
            console.log('Found existing customer:', asaasCustomerId);
          }
        }
        
        if (!asaasCustomerId) {
          console.error('Failed to create customer:', customerResult);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar cliente no Asaas', details: customerResult }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        asaasCustomerId = customerResult.id;
      }

      // Save customer ID to paciente
      await supabase
        .from('pacientes')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', paciente.id);
      
      console.log('Saved Asaas customer ID to paciente:', asaasCustomerId);
    }

    // 6. Create payment with UNDEFINED billing type (allows PIX, Card, Boleto)
    console.log('Creating payment with multiple payment options...');
    
    // Due date: 3 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Allows customer to choose between PIX, Card, or Boleto
      value: consulta.valor_consulta,
      dueDate: dueDateStr,
      description: `Consulta médica - MeConsulta`,
      externalReference: consulta.id,
    };

    console.log('Payment payload:', JSON.stringify(paymentPayload));

    const paymentResponse = await fetch(`${config.base_url}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': config.api_key,
      },
      body: JSON.stringify(paymentPayload),
    });

    // Check if response is JSON
    const paymentContentType = paymentResponse.headers.get('content-type');
    if (!paymentContentType?.includes('application/json')) {
      const textResponse = await paymentResponse.text();
      console.error('Asaas payments returned non-JSON response:', textResponse.substring(0, 500));
      console.error('Status:', paymentResponse.status);
      return new Response(
        JSON.stringify({ 
          error: 'Erro na API do Asaas', 
          details: `Status: ${paymentResponse.status}. Verifique a API Key.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentResult = await paymentResponse.json();
    console.log('Payment response:', JSON.stringify(paymentResult));

    if (!paymentResponse.ok) {
      console.error('Failed to create payment:', paymentResult);
      
      // Check for specific error messages
      const errorDesc = paymentResult.errors?.[0]?.description || 'Erro ao criar cobrança';
      return new Response(
        JSON.stringify({ error: errorDesc, details: paymentResult }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Update consulta with payment info
    const { error: updateError } = await supabase
      .from('consultas')
      .update({
        asaas_payment_id: paymentResult.id,
        asaas_invoice_url: paymentResult.invoiceUrl,
      })
      .eq('id', consulta.id);

    if (updateError) {
      console.error('Error updating consulta:', updateError);
    }

    console.log(`Payment created successfully: ${paymentResult.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentResult.id,
        invoiceUrl: paymentResult.invoiceUrl,
        dueDate: dueDateStr,
        value: consulta.valor_consulta,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-asaas-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
