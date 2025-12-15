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

// Validate CPF using algorithm
function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[9])) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[10])) return false;
  
  return true;
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

    // Validate CPF before proceeding
    const cpfClean = paciente.cpf?.replace(/\D/g, '') || '';
    if (!cpfClean || !isValidCPF(cpfClean)) {
      console.error(`CPF inválido para paciente ${paciente.id}: ${cpfClean}`);
      return new Response(
        JSON.stringify({ 
          error: 'CPF inválido. Por favor, atualize seu CPF no perfil antes de continuar.',
          code: 'INVALID_CPF'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    
    // Helper function to create a new customer
    const createAsaasCustomer = async (): Promise<string | null> => {
      console.log('Creating new Asaas customer...');
      
      const customerPayload = {
        name: paciente.nome,
        cpfCnpj: cpfClean,
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
        return null;
      }

      const customerResult = await customerResponse.json();
      console.log('Customer response:', JSON.stringify(customerResult));

      if (!customerResponse.ok) {
        // Check if customer already exists (by CPF)
        if (customerResult.errors?.[0]?.description?.includes('já cadastrado') ||
            customerResult.errors?.[0]?.description?.includes('já existe')) {
          // Try to find existing customer
          console.log('Customer may already exist, searching by CPF...');
          const searchResponse = await fetch(
            `${config.base_url}/customers?cpfCnpj=${cpfClean}`,
            {
              headers: { 'access_token': config.api_key },
            }
          );
          const searchResult = await searchResponse.json();
          
          if (searchResult.data?.[0]?.id) {
            console.log('Found existing customer:', searchResult.data[0].id);
            return searchResult.data[0].id;
          }
        }
        
        console.error('Failed to create customer:', customerResult);
        return null;
      }
      
      return customerResult.id;
    };

    // If no customer ID stored, create new customer
    if (!asaasCustomerId) {
      asaasCustomerId = await createAsaasCustomer();
      
      if (!asaasCustomerId) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar cliente no Asaas. Verifique seus dados cadastrais.',
            code: 'ASAAS_CUSTOMER_ERROR'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Save customer ID to paciente
      await supabase
        .from('pacientes')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', paciente.id);
      
      console.log('Saved Asaas customer ID to paciente:', asaasCustomerId);
    }

    // 6. Create payment with PIX as primary (disabling Boleto)
    const createPayment = async (customerId: string) => {
      console.log('Creating payment with PIX and Card options only (no Boleto)...');
      
      // Due date: 3 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      // Using PIX as billingType - Asaas will show PIX QR code and also allow card payment
      // BOLETO is excluded by not using 'UNDEFINED' or 'BOLETO'
      const paymentPayload = {
        customer: customerId,
        billingType: 'PIX', // PIX payment - invoice page will also show card option
        value: consulta.valor_consulta,
        dueDate: dueDateStr,
        description: `Consulta médica - MeConsulta`,
        externalReference: consulta.id,
        postalService: false, // Disable postal service for boleto
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
        return { ok: false, error: 'Erro na API do Asaas', result: null, dueDate: dueDateStr };
      }

      const paymentResult = await paymentResponse.json();
      console.log('Payment response:', JSON.stringify(paymentResult));

      return { ok: paymentResponse.ok, result: paymentResult, dueDate: dueDateStr };
    };

    // Try to create payment with existing customer
    let paymentData = await createPayment(asaasCustomerId!);
    
    // If failed due to removed customer, create new customer and retry
    if (!paymentData.ok && paymentData.result?.errors?.[0]?.code === 'invalid_customer') {
      console.log('Customer was removed from Asaas, creating new customer...');
      
      // Clear old customer ID and create new one
      asaasCustomerId = await createAsaasCustomer();
      
      if (!asaasCustomerId) {
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao criar cliente no Asaas. Verifique seus dados cadastrais.',
            code: 'ASAAS_CUSTOMER_ERROR'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Save new customer ID to paciente
      await supabase
        .from('pacientes')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', paciente.id);
      
      console.log('Saved new Asaas customer ID to paciente:', asaasCustomerId);
      
      // Retry payment with new customer
      paymentData = await createPayment(asaasCustomerId);
    }

    if (!paymentData.ok) {
      console.error('Failed to create payment:', paymentData.result);
      const errorDesc = paymentData.result?.errors?.[0]?.description || 'Erro ao criar cobrança';
      return new Response(
        JSON.stringify({ error: errorDesc, details: paymentData.result }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentResult = paymentData.result;
    const dueDateStr = paymentData.dueDate;

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
