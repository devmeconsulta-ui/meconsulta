import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CardData {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

interface ProcessCardRequest {
  consulta_id: string;
  card: CardData;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { consulta_id, card } = await req.json() as ProcessCardRequest;
    
    if (!consulta_id || !card) {
      return new Response(
        JSON.stringify({ error: 'consulta_id e card são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing card payment for consulta: ${consulta_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Asaas configuration
    const { data: asaasConfig, error: configError } = await supabase
      .from('config_asaas')
      .select('api_key, base_url, ambiente, ativo')
      .eq('ativo', true)
      .maybeSingle();

    if (configError || !asaasConfig) {
      console.error('Asaas config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração do Asaas não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch consulta with patient data
    const { data: consulta, error: consultaError } = await supabase
      .from('consultas')
      .select(`
        id,
        valor_consulta,
        asaas_payment_id,
        paciente_id,
        pacientes(
          id,
          nome,
          cpf,
          telefone,
          asaas_customer_id,
          usuario_id
        )
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

    const paciente = consulta.pacientes as any;
    if (!paciente?.asaas_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Cliente Asaas não encontrado para este paciente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get patient email if available
    let holderEmail = '';
    if (paciente.usuario_id) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('email')
        .eq('id', paciente.usuario_id)
        .maybeSingle();
      
      if (usuario) {
        holderEmail = usuario.email;
      }
    }

    // Clean CPF
    const cpfClean = paciente.cpf?.replace(/\D/g, '') || '';
    const phoneClean = paciente.telefone?.replace(/\D/g, '') || '';

    console.log('Creating credit card payment...');

    // Due date: today
    const dueDate = new Date().toISOString().split('T')[0];

    // Create payment with credit card
    const paymentPayload = {
      customer: paciente.asaas_customer_id,
      billingType: 'CREDIT_CARD',
      value: consulta.valor_consulta,
      dueDate: dueDate,
      description: `Consulta médica - MeConsulta`,
      externalReference: consulta_id,
      creditCard: {
        holderName: card.holderName,
        number: card.number,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        ccv: card.ccv,
      },
      creditCardHolderInfo: {
        name: paciente.nome,
        email: holderEmail || undefined,
        cpfCnpj: cpfClean,
        phone: phoneClean || undefined,
        mobilePhone: phoneClean || undefined,
        postalCode: undefined,
        addressNumber: undefined,
      },
    };

    console.log('Payment payload (card masked):', JSON.stringify({
      ...paymentPayload,
      creditCard: { ...paymentPayload.creditCard, number: '****', ccv: '***' }
    }));

    const paymentResponse = await fetch(`${asaasConfig.base_url}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasConfig.api_key,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentResult = await paymentResponse.json();
    console.log('Payment response:', JSON.stringify(paymentResult));

    if (!paymentResponse.ok) {
      const errorDesc = paymentResult?.errors?.[0]?.description || 'Erro ao processar pagamento';
      console.error('Payment failed:', paymentResult);
      return new Response(
        JSON.stringify({ error: errorDesc, details: paymentResult }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment was confirmed
    const isConfirmed = paymentResult.status === 'CONFIRMED' || paymentResult.status === 'RECEIVED';

    // Update consulta with payment info
    const updateData: any = {
      asaas_payment_id: paymentResult.id,
    };

    if (isConfirmed) {
      updateData.status_pagamento = 'pago';
      updateData.status_consulta = 'confirmada';
    }

    const { error: updateError } = await supabase
      .from('consultas')
      .update(updateData)
      .eq('id', consulta_id);

    if (updateError) {
      console.error('Error updating consulta:', updateError);
    }

    // Log event
    await supabase.from('consultas_eventos').insert({
      consulta_id: consulta_id,
      tipo_evento: isConfirmed ? 'pagamento_cartao_confirmado' : 'pagamento_cartao_pendente',
      usuario_tipo: 'sistema',
      descricao: `Pagamento via cartão de crédito ${isConfirmed ? 'confirmado' : 'pendente'}: ${paymentResult.id}`,
    });

    console.log(`Card payment ${isConfirmed ? 'confirmed' : 'pending'}: ${paymentResult.id}`);

    return new Response(
      JSON.stringify({
        success: isConfirmed,
        paymentId: paymentResult.id,
        status: paymentResult.status,
        message: isConfirmed ? 'Pagamento confirmado' : 'Pagamento em processamento',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-card-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
