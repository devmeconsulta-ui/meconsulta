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
  installments?: number;
}

// Luhn algorithm to validate credit card number
function isValidCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Validate card expiry
function isValidExpiry(month: string, year: string): boolean {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  
  if (isNaN(m) || isNaN(y)) return false;
  if (m < 1 || m > 12) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear() % 100; // Get last 2 digits
  const currentMonth = now.getMonth() + 1;
  
  // Year can be 2 or 4 digits
  const fullYear = y < 100 ? y : y % 100;
  
  if (fullYear < currentYear) return false;
  if (fullYear === currentYear && m < currentMonth) return false;
  
  return true;
}

// Validate CVV
function isValidCVV(cvv: string): boolean {
  const cleaned = cvv.replace(/\D/g, '');
  return cleaned.length >= 3 && cleaned.length <= 4;
}

// Validate holder name
function isValidHolderName(name: string): boolean {
  const trimmed = name.trim();
  // Name should have at least 3 characters and contain only letters, spaces, and common accents
  return trimmed.length >= 3 && /^[a-zA-ZÀ-ÿ\s]+$/.test(trimmed);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { consulta_id, card, installments = 1 } = await req.json() as ProcessCardRequest;
    
    // Basic required field validation
    if (!consulta_id || !card) {
      return new Response(
        JSON.stringify({ error: 'consulta_id e card são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format for consulta_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(consulta_id)) {
      return new Response(
        JSON.stringify({ error: 'consulta_id inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate card data
    if (!card.number || !card.holderName || !card.expiryMonth || !card.expiryYear || !card.ccv) {
      return new Response(
        JSON.stringify({ error: 'Todos os dados do cartão são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate card number with Luhn algorithm
    if (!isValidCardNumber(card.number)) {
      return new Response(
        JSON.stringify({ error: 'Número do cartão inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate expiry date
    if (!isValidExpiry(card.expiryMonth, card.expiryYear)) {
      return new Response(
        JSON.stringify({ error: 'Data de validade inválida ou cartão expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate CVV
    if (!isValidCVV(card.ccv)) {
      return new Response(
        JSON.stringify({ error: 'CVV inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate holder name
    if (!isValidHolderName(card.holderName)) {
      return new Response(
        JSON.stringify({ error: 'Nome do titular inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate installments (1-12)
    const validInstallments = Math.min(Math.max(1, installments), 12);

    // Log only non-sensitive info
    console.log(`Processing card payment for consulta: ${consulta_id}, installments: ${validInstallments}`);

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
      console.error('Asaas config error');
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
      console.error('Consulta not found');
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

    // Clean CPF and phone (only digits)
    const cpfClean = paciente.cpf?.replace(/\D/g, '') || '';
    const phoneClean = paciente.telefone?.replace(/\D/g, '') || '';

    console.log('Processing credit card payment...');

    // If there's an existing PIX payment, cancel it first
    if (consulta.asaas_payment_id) {
      console.log('Cancelling existing payment...');
      try {
        const cancelResponse = await fetch(
          `${asaasConfig.base_url}/payments/${consulta.asaas_payment_id}`,
          {
            method: 'DELETE',
            headers: {
              'access_token': asaasConfig.api_key,
            },
          }
        );
        console.log(`Cancel payment response: ${cancelResponse.status}`);
      } catch (cancelError) {
        console.log('Could not cancel existing payment, proceeding anyway');
      }
    }

    // Due date: today
    const dueDate = new Date().toISOString().split('T')[0];

    // Calculate credit card fees to pass to customer
    const CARD_FEE_PERCENTAGE = 2.99;
    const CARD_FEE_FIXED = 0.49;
    const INSTALLMENT_FEE_PER_MONTH = 1.99;
    
    const originalValue = consulta.valor_consulta;
    const percentageFee = originalValue * (CARD_FEE_PERCENTAGE / 100);
    let totalFees = percentageFee + CARD_FEE_FIXED;
    
    if (validInstallments > 1) {
      const installmentFee = originalValue * (INSTALLMENT_FEE_PER_MONTH / 100) * validInstallments;
      totalFees += installmentFee;
    }
    
    const valueWithFees = Math.round((originalValue + totalFees) * 100) / 100;
    
    // Log only non-sensitive financial info
    console.log(`Value: R$ ${originalValue}, Fees: R$ ${totalFees.toFixed(2)}, Total: R$ ${valueWithFees}`);

    // Clean card number (only digits)
    const cardNumberClean = card.number.replace(/\D/g, '');

    // Create payment payload - card data sent directly to Asaas, never stored
    const paymentPayload: any = {
      customer: paciente.asaas_customer_id,
      billingType: 'CREDIT_CARD',
      value: valueWithFees,
      dueDate: dueDate,
      description: validInstallments > 1 
        ? `Consulta médica - MeConsulta (${validInstallments}x)`
        : `Consulta médica - MeConsulta`,
      externalReference: consulta_id,
      creditCard: {
        holderName: card.holderName.trim().toUpperCase(),
        number: cardNumberClean,
        expiryMonth: card.expiryMonth.padStart(2, '0'),
        expiryYear: card.expiryYear.length === 2 ? card.expiryYear : card.expiryYear.slice(-2),
        ccv: card.ccv.replace(/\D/g, ''),
      },
      creditCardHolderInfo: {
        name: paciente.nome,
        email: holderEmail || undefined,
        cpfCnpj: cpfClean,
        phone: phoneClean || undefined,
        mobilePhone: phoneClean || undefined,
      },
    };

    if (validInstallments > 1) {
      paymentPayload.installmentCount = validInstallments;
    }

    // SECURITY: Log only that we're making the request, no sensitive data
    console.log('Sending payment request to Asaas...');

    const paymentResponse = await fetch(`${asaasConfig.base_url}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasConfig.api_key,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentResult = await paymentResponse.json();
    
    // Log only payment ID and status, no sensitive data
    console.log(`Payment response: ${paymentResult.id || 'error'}, status: ${paymentResult.status || 'failed'}`);

    if (!paymentResponse.ok) {
      const errorDesc = paymentResult?.errors?.[0]?.description || 'Erro ao processar pagamento';
      console.error('Payment failed:', errorDesc);
      return new Response(
        JSON.stringify({ error: errorDesc }),
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
      console.error('Error updating consulta');
    }

    // Log event (no sensitive data)
    await supabase.from('consultas_eventos').insert({
      consulta_id: consulta_id,
      tipo_evento: isConfirmed ? 'pagamento_cartao_confirmado' : 'pagamento_cartao_pendente',
      usuario_tipo: 'sistema',
      descricao: `Pagamento via cartão ${isConfirmed ? 'confirmado' : 'pendente'}`,
    });

    console.log(`Payment ${isConfirmed ? 'confirmed' : 'pending'}`);

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
    console.error('Error in process-card-payment');
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
