import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { consulta_id } = await req.json();

    if (!consulta_id) {
      return new Response(
        JSON.stringify({ error: 'consulta_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados da consulta com médico e clínica
    const { data: consulta, error: consultaError } = await supabase
      .from('consultas')
      .select(`
        *,
        medicos (
          id,
          nome,
          pix_key,
          pix_key_type,
          percentual_repasse
        ),
        clinicas (
          id,
          nome_fantasia,
          pix_key,
          pix_key_type
        )
      `)
      .eq('id', consulta_id)
      .single();

    if (consultaError || !consulta) {
      console.error('Erro ao buscar consulta:', consultaError);
      return new Response(
        JSON.stringify({ error: 'Consulta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é elegível para repasse
    if (!consulta.elegivel_repasse) {
      console.log('Consulta não é elegível para repasse');
      return new Response(
        JSON.stringify({ error: 'Consulta não elegível para repasse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já foi incluída em repasse
    if (consulta.incluida_em_repasse) {
      console.log('Consulta já incluída em repasse');
      return new Response(
        JSON.stringify({ error: 'Consulta já foi incluída em repasse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se consulta é online (apenas online gera repasse)
    if (consulta.origem !== 'online') {
      console.log('Apenas consultas online geram repasse automático');
      return new Response(
        JSON.stringify({ error: 'Apenas consultas online geram repasse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const medico = consulta.medicos;
    const clinica = consulta.clinicas;

    if (!medico) {
      return new Response(
        JSON.stringify({ error: 'Médico não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar para quem transferir: clínica (se tiver PIX) ou médico
    let destinatarioPix = null;
    let destinatarioNome = "";
    let destinatarioTipo = "";

    if (clinica && clinica.pix_key) {
      // Transferir para a clínica
      destinatarioPix = {
        pix_key: clinica.pix_key,
        pix_key_type: clinica.pix_key_type
      };
      destinatarioNome = clinica.nome_fantasia;
      destinatarioTipo = "clinica";
      console.log(`Transferindo para CLÍNICA: ${clinica.nome_fantasia}`);
    } else if (medico.pix_key) {
      // Transferir para o médico
      destinatarioPix = {
        pix_key: medico.pix_key,
        pix_key_type: medico.pix_key_type
      };
      destinatarioNome = medico.nome;
      destinatarioTipo = "medico";
      console.log(`Transferindo para MÉDICO: ${medico.nome}`);
    } else {
      console.log('Nem clínica nem médico possuem chave PIX configurada');
      return new Response(
        JSON.stringify({ error: 'Destinatário não possui chave PIX configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração do Asaas
    const { data: configAsaas, error: configError } = await supabase
      .from('config_asaas')
      .select('*')
      .eq('ativo', true)
      .single();

    if (configError || !configAsaas) {
      console.error('Erro ao buscar config Asaas:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração Asaas não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular valor do repasse
    const valorRepasse = consulta.valor_medico;
    console.log(`Valor do repasse: R$ ${valorRepasse} para ${destinatarioNome} (${destinatarioTipo})`);

    // Mapear tipo de chave PIX para Asaas
    const pixKeyTypeMap: Record<string, string> = {
      'cpf': 'CPF',
      'cnpj': 'CNPJ',
      'email': 'EMAIL',
      'telefone': 'PHONE',
      'aleatoria': 'EVP',
    };

    const asaasPixKeyType = pixKeyTypeMap[destinatarioPix.pix_key_type || 'aleatoria'] || 'EVP';

    // Realizar transferência PIX via Asaas
    console.log(`Realizando transferência PIX de R$ ${valorRepasse} para ${destinatarioNome}`);
    
    const transferResponse = await fetch(
      `${configAsaas.base_url}/transfers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': configAsaas.api_key,
        },
        body: JSON.stringify({
          value: valorRepasse,
          pixAddressKey: destinatarioPix.pix_key,
          pixAddressKeyType: asaasPixKeyType,
          description: `Repasse consulta ${consulta_id} - ${destinatarioNome}`,
          scheduleDate: null, // Transferência imediata
        }),
      }
    );

    const transferData = await transferResponse.json();
    console.log('Resposta da transferência Asaas:', transferData);

    if (!transferResponse.ok) {
      console.error('Erro ao realizar transferência:', transferData);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar transferência no Asaas', details: transferData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar registro de repasse
    const hoje = new Date().toISOString().split('T')[0];
    const { data: repasse, error: repasseError } = await supabase
      .from('repasses_medico')
      .insert({
        medico_id: medico.id,
        periodo_inicio: hoje,
        periodo_fim: hoje,
        valor_total: valorRepasse,
        status: 'pago',
        data_pagamento: new Date().toISOString(),
        asaas_transfer_id: transferData.id,
        observacoes: `Transferência automática para ${destinatarioTipo === 'clinica' ? 'clínica' : 'médico'} - Consulta ${consulta_id}`,
      })
      .select()
      .single();

    if (repasseError) {
      console.error('Erro ao criar registro de repasse:', repasseError);
    }

    // Criar item do repasse
    if (repasse) {
      await supabase
        .from('repasses_itens')
        .insert({
          repasse_id: repasse.id,
          consulta_id: consulta_id,
          valor_medico: valorRepasse,
        });
    }

    // Atualizar consulta
    const { error: updateError } = await supabase
      .from('consultas')
      .update({
        incluida_em_repasse: true,
        status_repasse: 'pago',
      })
      .eq('id', consulta_id);

    if (updateError) {
      console.error('Erro ao atualizar consulta:', updateError);
    }

    // Registrar evento
    await supabase
      .from('consultas_eventos')
      .insert({
        consulta_id: consulta_id,
        tipo_evento: 'repasse_realizado',
        descricao: `Transferência PIX de R$ ${valorRepasse} realizada para ${destinatarioTipo === 'clinica' ? 'clínica' : 'médico'}: ${destinatarioNome}`,
        usuario_tipo: 'sistema',
      });

    console.log(`Transferência realizada com sucesso para ${destinatarioNome}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transferência realizada com sucesso',
        transfer_id: transferData.id,
        valor: valorRepasse,
        destinatario: destinatarioNome,
        tipo_destinatario: destinatarioTipo
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na transferência:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
