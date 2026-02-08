import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcaoFollowUp {
  id: string;
  tempo_minutos: number;
  acao: "mensagem" | "encerrar" | "transferir";
  mensagem: string;
  ativa: boolean;
}

interface ConversaIA {
  id: string;
  atendimento_id: string;
  agente_id: string;
  ultima_mensagem_cliente: string;
  followup_pendentes: AcaoFollowUp[];
  followup_executados: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("[Followup] Starting follow-up processing...");

    // Buscar conversas de IA que têm follow-ups pendentes e não foram transferidas
    const { data: conversas, error: conversasError } = await supabase
      .from("omni_ia_conversas")
      .select(`
        id,
        atendimento_id,
        agente_id,
        ultima_mensagem_cliente,
        followup_pendentes,
        followup_executados
      `)
      .eq("transferido_para_humano", false)
      .not("followup_pendentes", "is", null)
      .neq("followup_pendentes", "[]");

    if (conversasError) {
      console.error("[Followup] Error fetching conversas:", conversasError);
      throw conversasError;
    }

    if (!conversas || conversas.length === 0) {
      console.log("[Followup] No conversations with pending follow-ups");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Followup] Found ${conversas.length} conversations to check`);

    let processedCount = 0;
    const agora = new Date();

    for (const conversa of conversas) {
      const c = conversa as ConversaIA;
      
      if (!c.ultima_mensagem_cliente || !c.followup_pendentes || c.followup_pendentes.length === 0) {
        continue;
      }

      const ultimaMensagem = new Date(c.ultima_mensagem_cliente);
      const minutosInativos = Math.floor((agora.getTime() - ultimaMensagem.getTime()) / 60000);
      
      // Ordenar follow-ups por tempo
      const followupsPendentes = c.followup_pendentes
        .filter((f: AcaoFollowUp) => f.ativa && !c.followup_executados?.includes(f.id))
        .sort((a: AcaoFollowUp, b: AcaoFollowUp) => a.tempo_minutos - b.tempo_minutos);

      if (followupsPendentes.length === 0) {
        continue;
      }

      // Verificar qual follow-up deve ser executado
      const followupParaExecutar = followupsPendentes.find(
        (f: AcaoFollowUp) => minutosInativos >= f.tempo_minutos
      );

      if (!followupParaExecutar) {
        continue;
      }

      console.log(`[Followup] Processing follow-up ${followupParaExecutar.id} for conversa ${c.id} after ${minutosInativos} minutes`);

      // Buscar dados do atendimento
      const { data: atendimento, error: atendimentoError } = await supabase
        .from("omni_atendimentos")
        .select(`
          id, 
          clinica_id, 
          status,
          contato:omni_contatos(id, telefone, nome),
          fila:omni_filas(id, nome, instancia:omni_instancias(id, evolution_instance_name))
        `)
        .eq("id", c.atendimento_id)
        .single();

      if (atendimentoError || !atendimento) {
        console.error(`[Followup] Atendimento not found: ${c.atendimento_id}`);
        continue;
      }

      // Verificar se atendimento ainda está ativo
      if (!["aguardando", "em_atendimento"].includes(atendimento.status)) {
        console.log(`[Followup] Atendimento ${c.atendimento_id} no longer active, skipping`);
        continue;
      }

      const contato = atendimento.contato as any;
      const fila = atendimento.fila as any;
      const instancia = fila?.instancia;

      // Executar a ação do follow-up
      try {
        switch (followupParaExecutar.acao) {
          case "mensagem": {
            if (!followupParaExecutar.mensagem || !instancia?.evolution_instance_name) {
              console.log("[Followup] Missing message or instance, skipping");
              break;
            }

            // Personalizar mensagem com nome do contato
            let mensagem = followupParaExecutar.mensagem;
            if (contato?.nome) {
              mensagem = mensagem.replace(/\{nome\}/gi, contato.nome);
            }

            // Enviar mensagem via Evolution API
            if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
              const sendResponse = await fetch(
                `${EVOLUTION_API_URL}/message/sendText/${instancia.evolution_instance_name}`,
                {
                  method: "POST",
                  headers: {
                    "apikey": EVOLUTION_API_KEY,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    number: contato.telefone,
                    text: mensagem,
                  }),
                }
              );

              if (sendResponse.ok) {
                const sendData = await sendResponse.json();
                console.log(`[Followup] Sent follow-up message to ${contato.telefone}`);

                // Salvar mensagem no banco
                await supabase
                  .from("omni_mensagens")
                  .insert({
                    atendimento_id: atendimento.id,
                    contato_id: contato.id,
                    tipo: "texto",
                    direcao: "saida",
                    conteudo: mensagem,
                    whatsapp_message_id: sendData?.key?.id,
                    status: "enviada",
                    agente_nome: "Sistema (Follow-up)",
                  });
              } else {
                console.error("[Followup] Failed to send message:", await sendResponse.text());
              }
            }
            break;
          }

          case "encerrar": {
            // Encerrar o atendimento
            await supabase
              .from("omni_atendimentos")
              .update({
                status: "encerrado",
                motivo_fechamento: "Encerrado automaticamente por inatividade",
                data_fechamento: new Date().toISOString(),
              })
              .eq("id", atendimento.id);

            // Marcar conversa como transferida (para parar processamento)
            await supabase
              .from("omni_ia_conversas")
              .update({ transferido_para_humano: true })
              .eq("id", c.id);

            console.log(`[Followup] Closed atendimento ${atendimento.id} due to inactivity`);
            break;
          }

          case "transferir": {
            // Buscar agente de IA para saber a fila de transferência
            const { data: agente } = await supabase
              .from("omni_ia_agentes")
              .select("fila_transferencia_id")
              .eq("id", c.agente_id)
              .single();

            // Transferir para humano
            const updateData: any = {
              agente_id: null,
              status: "aguardando",
            };

            if (agente?.fila_transferencia_id) {
              updateData.fila_id = agente.fila_transferencia_id;
            }

            await supabase
              .from("omni_atendimentos")
              .update(updateData)
              .eq("id", atendimento.id);

            await supabase
              .from("omni_ia_conversas")
              .update({ transferido_para_humano: true })
              .eq("id", c.id);

            console.log(`[Followup] Transferred atendimento ${atendimento.id} to human due to inactivity`);
            break;
          }
        }

        // Marcar follow-up como executado
        const executados = [...(c.followup_executados || []), followupParaExecutar.id];
        await supabase
          .from("omni_ia_conversas")
          .update({
            followup_executados: executados,
            ultima_interacao: new Date().toISOString(),
          })
          .eq("id", c.id);

        processedCount++;
      } catch (acaoError) {
        console.error(`[Followup] Error executing action:`, acaoError);
      }
    }

    console.log(`[Followup] Completed. Processed ${processedCount} follow-ups`);

    return new Response(JSON.stringify({ processed: processedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Followup] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
