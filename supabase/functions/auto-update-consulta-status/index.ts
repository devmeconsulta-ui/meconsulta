import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function que atualiza automaticamente o status das consultas ONLINE
 * para "aguardando" quando chega a data/hora da consulta.
 * 
 * - Consultas ONLINE: status muda automaticamente
 * - Consultas INTERNAS: status é alterado manualmente
 * 
 * Esta função deve ser chamada periodicamente (via cron) ou quando
 * o usuário acessa a página de consultas.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    
    console.log(`Auto-updating consulta status at ${now}`);

    // Buscar consultas ONLINE que estão confirmadas e já chegou a hora
    // Mudar para "aguardando"
    const { data: consultasParaAguardando, error: errorAguardando } = await supabase
      .from('consultas')
      .update({ status_consulta: 'aguardando' })
      .eq('origem', 'online')
      .eq('status_consulta', 'confirmada')
      .lte('data_hora', now)
      .select('id');

    if (errorAguardando) {
      console.error('Erro ao atualizar para aguardando:', errorAguardando);
    } else {
      console.log(`Consultas atualizadas para aguardando: ${consultasParaAguardando?.length || 0}`);
    }

    // Também verificar se há consultas "agendada" com pagamento confirmado
    // que já passaram da hora - mudar para "aguardando"
    const { data: agendadasParaAguardando, error: errorAgendadas } = await supabase
      .from('consultas')
      .update({ status_consulta: 'aguardando' })
      .eq('origem', 'online')
      .eq('status_consulta', 'agendada')
      .eq('status_pagamento', 'pago')
      .lte('data_hora', now)
      .select('id');

    if (errorAgendadas) {
      console.error('Erro ao atualizar agendadas para aguardando:', errorAgendadas);
    } else {
      console.log(`Consultas agendadas atualizadas para aguardando: ${agendadasParaAguardando?.length || 0}`);
    }

    const totalUpdated = (consultasParaAguardando?.length || 0) + (agendadasParaAguardando?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: totalUpdated,
        message: `${totalUpdated} consulta(s) atualizada(s) para status 'aguardando'`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
