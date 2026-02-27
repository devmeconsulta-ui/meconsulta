import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgenteIA {
  id: string;
  nome: string;
  descricao: string;
  modelo: string;
  comunicacao: string;
  comportamento: string;
  finalidade: string;
  produto: string;
  site_url: string;
  descricao_produto: string;
  transferir_para_humano: boolean;
  usar_emojis: boolean;
  assinar_nome: boolean;
  restringir_temas: boolean;
  dividir_resposta: boolean;
  permitir_lembretes: boolean;
  busca_treinamento: boolean;
  timezone: string;
  tempo_resposta: number;
  limite_interacoes: number;
  palavras_chave_transferencia: string[];
  fila_transferencia_id: string | null;
  acoes_followup: AcaoFollowUp[];
  permitir_agendamento: boolean;
}

interface AcaoFollowUp {
  id: string;
  tempo_minutos: number;
  acao: "mensagem" | "encerrar" | "transferir";
  mensagem: string;
  ativa: boolean;
}

interface Treinamento {
  conteudo: string;
  tipo: string;
}

interface AIRequest {
  atendimento_id: string;
  mensagem: string;
  clinica_id: string;
}

interface ActionCall {
  action: string;
  params: Record<string, any>;
}

// Mapeamento de modelos para o Lovable AI Gateway
const MODEL_MAPPING: Record<string, string> = {
  // Modelos Gemini (atuais)
  "gemini-3-flash": "google/gemini-3-flash-preview",
  "gemini-3-pro": "google/gemini-3-pro-preview",
  "gemini-2.5-pro": "google/gemini-2.5-pro",
  "gemini-2.5-flash": "google/gemini-2.5-flash",
  "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
  // Modelos GPT (atuais)
  "gpt-5": "openai/gpt-5",
  "gpt-5-mini": "openai/gpt-5-mini",
  "gpt-5-nano": "openai/gpt-5-nano",
  // Modelos legados (compatibilidade retroativa)
  "gpt-4o-mini": "openai/gpt-5-mini",
  "gpt-4o": "openai/gpt-5",
  "gpt-4-turbo": "openai/gpt-5",
  "claude-3-opus": "google/gemini-2.5-pro",
  "claude-3-sonnet": "google/gemini-2.5-flash",
  "claude-3-haiku": "google/gemini-2.5-flash-lite",
  "gemini-1.5-pro": "google/gemini-2.5-pro",
  "gemini-1.5-flash": "google/gemini-2.5-flash",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { atendimento_id, mensagem, clinica_id }: AIRequest = await req.json();

    console.log(`[AI] Processing message for atendimento ${atendimento_id}`);

    // Buscar atendimento com fila
    const { data: atendimento, error: atendimentoError } = await supabase
      .from("omni_atendimentos")
      .select("*, contato:omni_contatos(*), fila_id")
      .eq("id", atendimento_id)
      .single();

    if (atendimentoError || !atendimento) {
      console.error("Atendimento not found:", atendimentoError);
      return new Response(JSON.stringify({ error: "Atendimento not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar agente de IA configurado para a fila
    console.log(`[AI] Looking for AI agent for fila_id: ${atendimento.fila_id}`);
    
    const { data: agente, error: agenteError } = await supabase
      .from("omni_ia_agentes")
      .select("*")
      .eq("clinica_id", clinica_id)
      .eq("fila_operacao_id", atendimento.fila_id)
      .eq("ativo", true)
      .single();

    if (agenteError || !agente) {
      console.log("[AI] No active AI agent configured for this queue, error:", agenteError?.message);
      return new Response(JSON.stringify({ ai_active: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agenteIA = agente as AgenteIA;
    
    // Buscar configuração de agendamento se habilitado
    let agendamentoConfig: any = null;
    if (agenteIA.permitir_agendamento) {
      const { data: configData } = await supabase
        .from("omni_ia_agendamentos_config")
        .select("*")
        .eq("agente_id", agenteIA.id)
        .single();
      agendamentoConfig = configData;
    }
    
    // Mapear modelo para o Lovable AI Gateway
    const modeloGateway = MODEL_MAPPING[agenteIA.modelo] || "google/gemini-3-flash-preview";
    console.log(`[AI] Found agent: ${agenteIA.nome}, model: ${agenteIA.modelo} -> ${modeloGateway}, scheduling: ${agenteIA.permitir_agendamento}`);

    // Buscar conversa de IA existente ou criar nova
    let { data: conversa } = await supabase
      .from("omni_ia_conversas")
      .select("*")
      .eq("atendimento_id", atendimento_id)
      .eq("agente_id", agenteIA.id)
      .single();

    if (!conversa) {
      const { data: novaConversa, error: novaConversaError } = await supabase
        .from("omni_ia_conversas")
        .insert({
          atendimento_id,
          agente_id: agenteIA.id,
          mensagens: [],
          interacoes_count: 0,
        })
        .select()
        .single();

      if (novaConversaError) {
        console.error("Error creating conversa:", novaConversaError);
        throw novaConversaError;
      }
      conversa = novaConversa;
    }

    // Verificar se já foi transferido para humano ou se humano assumiu
    if (conversa.transferido_para_humano || conversa.humano_assumiu) {
      console.log("[AI] Conversa already handled by human, AI stopping");
      return new Response(JSON.stringify({ ai_active: false, reason: "human_takeover" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar limite de interações
    if (agenteIA.limite_interacoes > 0 && conversa.interacoes_count >= agenteIA.limite_interacoes) {
      console.log("[AI] Interaction limit reached, transferring to human");
      
      if (agenteIA.transferir_para_humano) {
        await transferirParaHumano(supabase, atendimento_id, agenteIA, conversa.id);
      }
      
      return new Response(JSON.stringify({ ai_active: false, reason: "limit_reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar palavras-chave de transferência
    if (agenteIA.palavras_chave_transferencia && agenteIA.palavras_chave_transferencia.length > 0) {
      const mensagemLower = mensagem.toLowerCase();
      const deveTransferir = agenteIA.palavras_chave_transferencia.some(
        (palavra) => mensagemLower.includes(palavra.toLowerCase())
      );
      
      if (deveTransferir && agenteIA.transferir_para_humano) {
        console.log("[AI] Transfer keyword detected, transferring to human");
        await transferirParaHumano(supabase, atendimento_id, agenteIA, conversa.id);
        
        return new Response(JSON.stringify({ 
          ai_active: false, 
          reason: "transfer_keyword",
          mensagem: "Entendido! Vou transferir você para um atendente humano. Aguarde um momento..."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Buscar treinamentos
    const { data: treinamentos } = await supabase
      .from("omni_ia_treinamentos")
      .select("conteudo, tipo")
      .eq("agente_id", agenteIA.id)
      .eq("status", "treinado");

    // Buscar dados extras para agendamento se habilitado
    let dadosAgendamento: any = null;
    if (agenteIA.permitir_agendamento) {
      // Get specialists list
      const { data: medicos } = await supabase
        .from("clinicas_medicos")
        .select("medico:medicos(nome, especialidade)")
        .eq("clinica_id", clinica_id)
        .eq("ativo", true);
      
      // Get convenios
      const { data: convenios } = await supabase
        .from("convenios")
        .select("nome")
        .eq("clinica_id", clinica_id)
        .eq("ativo", true);

      dadosAgendamento = {
        medicos: medicos?.map((m: any) => `${m.medico?.nome} (${m.medico?.especialidade})`).filter(Boolean) || [],
        especialidades: [...new Set(medicos?.map((m: any) => m.medico?.especialidade).filter(Boolean))] || [],
        convenios: convenios?.map((c: any) => c.nome) || [],
      };
    }

    // Construir o system prompt baseado nas configurações
    const systemPrompt = buildSystemPrompt(agenteIA, treinamentos || [], atendimento.contato, agenteIA.permitir_agendamento, dadosAgendamento, agendamentoConfig);

    // Construir histórico de mensagens
    const historicoMensagens = (conversa.mensagens as any[]) || [];
    historicoMensagens.push({ role: "user", content: mensagem });

    console.log(`[AI] Calling Lovable AI Gateway with model: ${modeloGateway}`);

    // Get Z-API config for typing indicator
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

    // Buscar instância para enviar typing para o WhatsApp do cliente
    let zapiInstanceId: string | null = null;
    let zapiToken: string | null = null;
    let clientPhone: string | null = atendimento.contato?.telefone || null;
    
    if (ZAPI_CLIENT_TOKEN && atendimento.fila_id) {
      const { data: fila } = await supabase
        .from("omni_filas")
        .select("instancia:omni_instancias(zapi_instance_id, zapi_token)")
        .eq("id", atendimento.fila_id)
        .single();
      
      zapiInstanceId = (fila as any)?.instancia?.zapi_instance_id || null;
      zapiToken = (fila as any)?.instancia?.zapi_token || null;
    }

    // Broadcast AI typing indicator via Supabase Realtime (para painel interno)
    const broadcastTypingInternal = async (isTyping: boolean) => {
      try {
        await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            topic: `ai-typing:${atendimento_id}`,
            event: "ai_typing",
            payload: {
              is_typing: isTyping,
              agente_nome: agenteIA.nome,
            },
          }),
        });
      } catch (err) {
        console.error("[AI] Error broadcasting internal typing:", err);
      }
    };

    // Send typing indicator to WhatsApp (para o cliente ver "escrevendo...")
    // Note: Using fire-and-forget pattern to avoid blocking
    const sendWhatsAppTyping = (isTyping: boolean) => {
      if (!ZAPI_CLIENT_TOKEN || !zapiInstanceId || !zapiToken || !clientPhone) {
        return;
      }
      
      const phone = clientPhone.replace(/\D/g, "");
      const phoneNorm = phone.length <= 11 ? `55${phone}` : phone;
      
      // Fire-and-forget - don't await
      // Z-API doesn't have a direct typing endpoint, but we can use update-presence
      // For now, skip typing indicator on Z-API as it's not critical
      // The internal Supabase Realtime typing still works
    };

    // Start typing indicators (fire-and-forget, non-blocking)
    broadcastTypingInternal(true);
    sendWhatsAppTyping(true);

    // Aplicar tempo de resposta (delay) APENAS se > 0 e de forma não-bloqueante para a primeira resposta
    const tempoResposta = agenteIA.tempo_resposta || 0;
    if (tempoResposta > 0) {
      console.log(`[AI] Will apply ${tempoResposta}s delay before sending response`);
    }

    // Build tools for scheduling if enabled
    const tools = agenteIA.permitir_agendamento ? buildSchedulingTools() : undefined;

    // Chamar a IA via Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modeloGateway,
        messages: [
          { role: "system", content: systemPrompt },
          ...historicoMensagens.slice(-20),
        ],
        ...(tools ? { tools, tool_choice: "auto" } : {}),
      }),
    });

    // Stop typing indicators (fire-and-forget)
    broadcastTypingInternal(false);
    sendWhatsAppTyping(false);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", ai_active: false }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required", ai_active: false }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message;
    let respostaIA = aiMessage?.content || "";

    // Check if AI requested tool calls (scheduling actions)
    const toolCalls = aiMessage?.tool_calls;
    if (toolCalls && toolCalls.length > 0 && agenteIA.permitir_agendamento) {
      console.log(`[AI] Processing ${toolCalls.length} tool calls for scheduling`);
      
      const toolResults: { tool_call_id: string; role: string; content: string }[] = [];
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function?.name;
        let functionArgs: Record<string, any> = {};
        
        try {
          functionArgs = JSON.parse(toolCall.function?.arguments || "{}");
        } catch (e) {
          console.error("[AI] Error parsing tool arguments:", e);
          continue;
        }

        console.log(`[AI] Calling action: ${functionName}`, functionArgs);

        // Call omni-ai-actions edge function
        const actionResponse = await fetch(`${SUPABASE_URL}/functions/v1/omni-ai-actions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: functionName,
            params: functionArgs,
            clinica_id: clinica_id,
            contato_telefone: atendimento.contato?.telefone,
            atendimento_id: atendimento_id,
            agente_id: agenteIA.id,
          }),
        });

        if (actionResponse.ok) {
          const actionResult = await actionResponse.json();
          console.log(`[AI] Action result:`, actionResult);

          // Store tool result for follow-up call
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify(actionResult),
          });
        } else {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({ success: false, error: "Action failed" }),
          });
        }
      }
      
      // Make a follow-up call to the AI with the tool results so it can generate a proper response
      if (toolResults.length > 0) {
        console.log(`[AI] Making follow-up call with ${toolResults.length} tool results`);
        
        const followUpMessages = [
          { role: "system", content: systemPrompt },
          ...historicoMensagens.slice(-20),
          aiMessage, // Include the assistant message with tool_calls
          ...toolResults, // Include tool results
        ];
        
        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modeloGateway,
            messages: followUpMessages,
            tools, // Keep tools available for multi-step actions
            tool_choice: "auto",
          }),
        });
        
        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          const followUpMessage = followUpData.choices?.[0]?.message;
          
          // Check if AI wants to call more tools (multi-step flow)
          const moreToolCalls = followUpMessage?.tool_calls;
          if (moreToolCalls && moreToolCalls.length > 0) {
            console.log(`[AI] Follow-up requires ${moreToolCalls.length} more tool calls`);
            
            // Process additional tool calls recursively (limit to prevent infinite loops)
            const maxDepth = 5;
            let currentDepth = 0;
            let currentMessage = followUpMessage;
            let currentMessages = [...followUpMessages];
            
            while (currentMessage?.tool_calls && currentMessage.tool_calls.length > 0 && currentDepth < maxDepth) {
              currentDepth++;
              console.log(`[AI] Processing tool calls depth ${currentDepth}`);
              
              const nestedToolResults: { tool_call_id: string; role: string; content: string }[] = [];
              
              for (const nestedToolCall of currentMessage.tool_calls) {
                const nestedFunctionName = nestedToolCall.function?.name;
                let nestedFunctionArgs: Record<string, any> = {};
                
                try {
                  nestedFunctionArgs = JSON.parse(nestedToolCall.function?.arguments || "{}");
                } catch (e) {
                  continue;
                }
                
                console.log(`[AI] Nested action (depth ${currentDepth}): ${nestedFunctionName}`, nestedFunctionArgs);
                
                const nestedActionResponse = await fetch(`${SUPABASE_URL}/functions/v1/omni-ai-actions`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    action: nestedFunctionName,
                    params: nestedFunctionArgs,
                    clinica_id: clinica_id,
                    contato_telefone: atendimento.contato?.telefone,
                    atendimento_id: atendimento_id,
                    agente_id: agenteIA.id,
                  }),
                });
                
                if (nestedActionResponse.ok) {
                  const nestedResult = await nestedActionResponse.json();
                  console.log(`[AI] Nested action result:`, nestedResult);
                  nestedToolResults.push({
                    tool_call_id: nestedToolCall.id,
                    role: "tool",
                    content: JSON.stringify(nestedResult),
                  });
                } else {
                  nestedToolResults.push({
                    tool_call_id: nestedToolCall.id,
                    role: "tool",
                    content: JSON.stringify({ success: false, error: "Action failed" }),
                  });
                }
              }
              
              // Add current message and results to conversation
              currentMessages = [...currentMessages, currentMessage, ...nestedToolResults];
              
              // Call AI again
              const nextResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: modeloGateway,
                  messages: currentMessages,
                  tools,
                  tool_choice: "auto",
                }),
              });
              
              if (nextResponse.ok) {
                const nextData = await nextResponse.json();
                currentMessage = nextData.choices?.[0]?.message;
              } else {
                break;
              }
            }
            
            // Use final message content
            respostaIA = currentMessage?.content || respostaIA;
          } else {
            // No more tool calls, use the follow-up response
            respostaIA = followUpMessage?.content || respostaIA;
          }
        } else {
          console.error("[AI] Follow-up call failed:", await followUpResponse.text());
        }
      }
    }

    console.log(`[AI] Got response: ${respostaIA.substring(0, 100)}...`);

    // Processar resposta baseado nas configurações
    if (!agenteIA.usar_emojis) {
      respostaIA = respostaIA.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    }

    // Adicionar assinatura se configurado
    if (agenteIA.assinar_nome) {
      respostaIA = `*${agenteIA.nome}*\n\n${respostaIA}`;
    }

    // Atualizar histórico de conversa
    historicoMensagens.push({ role: "assistant", content: respostaIA });
    
    await supabase
      .from("omni_ia_conversas")
      .update({
        mensagens: historicoMensagens,
        interacoes_count: conversa.interacoes_count + 1,
        ultima_interacao: new Date().toISOString(),
      })
      .eq("id", conversa.id);

    // Registrar próximos follow-ups de inatividade se configurados
    if (agenteIA.acoes_followup && agenteIA.acoes_followup.length > 0) {
      const acoesAtivas = agenteIA.acoes_followup.filter(a => a.ativa);
      if (acoesAtivas.length > 0) {
        console.log(`[AI] Scheduling ${acoesAtivas.length} follow-up actions`);
        // O agendamento de follow-ups será tratado por um job separado
        await supabase
          .from("omni_ia_conversas")
          .update({
            followup_pendentes: acoesAtivas,
            ultima_mensagem_cliente: new Date().toISOString(),
          })
          .eq("id", conversa.id);
      }
    }

    // Dividir resposta em partes se configurado - APENAS se muito longa e com parágrafos claros
    let mensagensParaEnviar: string[] = [];
    
    // Limite mais alto (700 chars) para evitar divisões desnecessárias - mais humanizado
    const LIMITE_DIVISAO = 700;
    // Máximo de 3 mensagens para não parecer spam
    const MAX_MENSAGENS = 3;
    
    if (agenteIA.dividir_resposta && respostaIA.length > LIMITE_DIVISAO) {
      // Dividir apenas por parágrafos (dupla quebra de linha) - forma mais natural
      const paragrafos = respostaIA.split(/\n\n+/).filter(p => p.trim());
      
      if (paragrafos.length > 1 && paragrafos.length <= MAX_MENSAGENS) {
        // Se tem poucos parágrafos bem definidos, usar eles
        mensagensParaEnviar = paragrafos;
      } else if (paragrafos.length > MAX_MENSAGENS) {
        // Se tem muitos parágrafos, agrupar para não exceder MAX_MENSAGENS
        const tamanhoPorMensagem = Math.ceil(paragrafos.length / MAX_MENSAGENS);
        for (let i = 0; i < MAX_MENSAGENS; i++) {
          const inicio = i * tamanhoPorMensagem;
          const fim = Math.min((i + 1) * tamanhoPorMensagem, paragrafos.length);
          if (inicio < paragrafos.length) {
            mensagensParaEnviar.push(paragrafos.slice(inicio, fim).join("\n\n"));
          }
        }
      } else {
        // Texto longo mas sem parágrafos claros - enviar como uma única mensagem
        // É melhor uma mensagem longa do que várias cortadas no meio
        mensagensParaEnviar = [respostaIA];
      }
    } else {
      // Resposta curta ou divisão desativada - enviar tudo junto
      mensagensParaEnviar = [respostaIA];
    }
    
    // Limpar mensagens vazias
    mensagensParaEnviar = mensagensParaEnviar.filter(m => m.trim());

    return new Response(JSON.stringify({ 
      ai_active: true, 
      mensagens: mensagensParaEnviar,
      agente_nome: agenteIA.nome,
      tempo_resposta: agenteIA.tempo_resposta || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AI] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(
  agente: AgenteIA, 
  treinamentos: Treinamento[], 
  contato: any,
  permitirAgendamento: boolean = false,
  dadosAgendamento: any = null,
  agendamentoConfig: any = null
): string {
  const estilos = {
    formal: "Você deve usar linguagem formal, profissional e cortês. Evite gírias e coloquialismos. Use 'você' em vez de 'vc', escreva de forma completa.",
    normal: "Você deve usar uma linguagem amigável e profissional, equilibrada entre formal e casual. Seja acessível mas mantenha o profissionalismo.",
    descontraida: "Você deve usar uma linguagem leve, descontraída e amigável, como um amigo conversando. Use expressões coloquiais quando apropriado.",
  };

  const finalidades = {
    suporte: "Seu objetivo é ajudar o cliente com dúvidas e suporte sobre nossos serviços. Seja prestativo e resolva problemas.",
    vendas: "Seu objetivo é ajudar o cliente e, quando apropriado, apresentar nossos serviços e agendar consultas ou procedimentos. Seja persuasivo mas não insistente.",
    pessoal: "Você é um assistente pessoal para ajudar com diversas necessidades do cliente.",
  };

  let prompt = `Você é ${agente.nome}`;
  
  if (agente.descricao) {
    prompt += `, ${agente.descricao}`;
  }
  
  prompt += `. Você é um assistente virtual de atendimento.

`;

  // ===== INSTRUÇÕES DE COMPORTAMENTO - PRIORIDADE MÁXIMA =====
  // Estas instruções definidas pelo administrador devem ter PRIORIDADE ABSOLUTA
  if (agente.comportamento && agente.comportamento.trim()) {
    prompt += `## 🚨 INSTRUÇÕES PRIORITÁRIAS DO ADMINISTRADOR (OBEDEÇA SEMPRE)
As instruções abaixo foram definidas pelo administrador da clínica e têm PRIORIDADE ABSOLUTA sobre qualquer outra diretriz. Siga-as rigorosamente:

${agente.comportamento}

---

`;
  }

  prompt += `## Estilo de Comunicação
${estilos[agente.comunicacao as keyof typeof estilos] || estilos.normal}

## Objetivo Principal
${finalidades[agente.finalidade as keyof typeof finalidades] || finalidades.suporte}

`;

  // AGENDAMENTO AUTOMÁTICO - apenas se habilitado E se a finalidade for apropriada
  if (permitirAgendamento && dadosAgendamento) {
    prompt += `## 🗓️ AGENDAMENTO DE CONSULTAS

### Profissionais e Especialidades:
${dadosAgendamento.medicos?.slice(0, 10).join("\n") || "Nenhum cadastrado"}

### Convênios: ${dadosAgendamento.convenios?.length > 0 ? dadosAgendamento.convenios.join(", ") + " e Particular" : "Apenas Particular"}

### 🚨 FLUXO NATURAL DE ATENDIMENTO (SIGA ESTA ORDEM):

**PASSO 1 - BOAS VINDAS E ENTENDER NECESSIDADE:**
- Cumprimente educadamente
- Pergunte: "Como posso ajudar você hoje?"
- AGUARDE o cliente dizer o que precisa (agendar, dúvida, informação)
- NÃO pule direto para perguntar dados pessoais!

**PASSO 2 - ESPECIALIDADE/MÉDICO (se quiser agendar):**
- Pergunte qual especialidade ou médico deseja
- Ex: "Qual especialidade você precisa?" ou "Com qual médico deseja consultar?"
- Use buscar_medicos se precisar verificar disponibilidade

**PASSO 3 - DATA E HORÁRIO:**
- Se o cliente perguntar sobre horários disponíveis, USE buscar_horarios IMEDIATAMENTE
- NÃO fique perguntando "manhã ou tarde" repetidamente - se o cliente pedir horários, BUSQUE E MOSTRE!
- Se o cliente NÃO especificar data, busque para os PRÓXIMOS 7 DIAS automaticamente
- Use buscar_horarios com data_inicio = hoje e data_fim = hoje + 7 dias
- Apresente 3-5 opções organizadas por data de forma clara
- Ex: "Temos: Segunda 10h, Terça 14h, Quarta 9h. Qual prefere?"

**⚠️ REGRA ANTI-REPETIÇÃO:**
- Se o cliente pedir "horários" ou "datas" 2x, NÃO pergunte preferência - BUSQUE DIRETO!
- Se o cliente disser "me manda os horários", USE buscar_horarios AGORA, sem perguntar mais nada
- NUNCA repita a mesma pergunta se o cliente já respondeu ou insistiu

**PASSO 4 - TIPO DE ATENDIMENTO:**
- Após confirmar horário, pergunte: "Será Particular ou Convênio?"
- Se convênio, pergunte qual (use buscar_convenios se precisar)

**PASSO 5 - IDENTIFICAR PACIENTE (SÓ AGORA!):**
- Use buscar_paciente SEM parâmetros (busca automática pelo telefone)
- Se encontrar cadastro: "Confirmando, é o(a) [NOME]?"
- Se NÃO encontrar: Pergunte o nome completo primeiro, depois CPF

**PASSO 6 - COLETA DE DADOS (APENAS se não tiver cadastro):**
- Pergunte NOME COMPLETO (uma pergunta)
- Depois pergunte CPF${agendamentoConfig?.exigir_cpf ? " (obrigatório)" : " (opcional)"}
- Use criar_paciente com nome, cpf e telefone

**PASSO 7 - FINALIZAR AGENDAMENTO:**
- Confirme todos os dados: "Vou agendar [ESPECIALIDADE] com [MÉDICO] para [DATA] às [HORA], [TIPO ATENDIMENTO]. Confirma?"
- Se confirmar, use agendar_consulta com TODOS os dados
- Aguarde confirmação de sucesso (agendamento_confirmado: true)
- Envie a mensagem de confirmação completa com todos os detalhes

### 🚫 REGRAS CRÍTICAS:
- NUNCA peça nome/CPF no início da conversa!
- NUNCA pergunte dados pessoais antes de entender o que o cliente quer
- NUNCA combine "qual especialidade E qual seu nome" na mesma mensagem
- NUNCA repita a mesma pergunta mais de 1 vez - se o cliente insistir, FAÇA A AÇÃO!
- Se o cliente pedir horários, USE buscar_horarios - não fique perguntando preferência
- Primeiro entenda a necessidade, depois busque horários, POR ÚLTIMO colete dados
- Após agendamento com sucesso, NUNCA busque horários novamente
- O agendamento está CONFIRMADO se recebeu agendamento_confirmado: true

### DICAS DE BUSCA DE HORÁRIOS:
- Se o cliente pedir "quais horários vocês têm", busque os próximos 7 dias automaticamente
- SEMPRE passe data_inicio e data_fim para buscar horários
- Se cliente pedir "segunda" ou "amanhã", calcule a data exata
- Se não encontrar na data pedida, ofereça datas próximas
- Se o cliente não especificar preferência, mostre as opções disponíveis!

`;
  }

  // Informações sobre o produto/serviço
  if (agente.produto || agente.descricao_produto) {
    prompt += `## Sobre Nosso Produto/Serviço
`;
    if (agente.produto) {
      prompt += `Nome do Produto/Serviço: ${agente.produto}
`;
    }
    if (agente.descricao_produto) {
      prompt += `Descrição: ${agente.descricao_produto}
`;
    }
    if (agente.site_url) {
      prompt += `Site: ${agente.site_url}
`;
    }
    prompt += `
`;
  }

  // Configurações de emojis
  if (agente.usar_emojis) {
    prompt += `✅ Você PODE e DEVE usar emojis nas suas respostas para tornar a conversa mais amigável e visual.

`;
  } else {
    prompt += `⚠️ IMPORTANTE: NÃO use nenhum emoji em suas respostas. Mantenha o texto limpo.

`;
  }

  // Restrição de temas
  if (agente.restringir_temas) {
    prompt += `## Restrição de Temas
ATENÇÃO: Você deve APENAS responder perguntas relacionadas ao nosso produto/serviço e ao atendimento. 
Se o cliente perguntar sobre outros assuntos não relacionados, educadamente redirecione a conversa dizendo algo como:
"Desculpe, mas não posso ajudar com esse assunto. Posso te ajudar com informações sobre nossos serviços ou agendar um atendimento?"

`;
  }

  // Lembretes
  if (agente.permitir_lembretes) {
    prompt += `## Lembretes
Você pode oferecer para registrar lembretes para o cliente quando apropriado. 
Por exemplo, lembrar de um retorno médico, tomar medicação, etc.

`;
  }

  // Transferência para humano
  if (agente.transferir_para_humano) {
    prompt += `## Transferência para Atendente Humano
Se você não conseguir resolver o problema do cliente ou se ele solicitar falar com um humano, informe educadamente que vai transferir para um atendente.
`;
    if (agente.palavras_chave_transferencia && agente.palavras_chave_transferencia.length > 0) {
      prompt += `Palavras que indicam necessidade de transferência: ${agente.palavras_chave_transferencia.join(", ")}

`;
    }
  }

  // Timezone
  if (agente.timezone) {
    prompt += `## Fuso Horário
Use o fuso horário ${agente.timezone} para qualquer referência a datas e horários.

`;
  }

  // Base de conhecimento dos treinamentos
  if (treinamentos.length > 0) {
    prompt += `## Base de Conhecimento (Treinamentos)
Use as informações abaixo para responder perguntas dos clientes:

`;
    for (const t of treinamentos) {
      if (t.tipo === "texto") {
        prompt += `${t.conteudo}

`;
      } else if (t.tipo === "website") {
        prompt += `[Informações do site: ${t.conteudo}]

`;
      } else if (t.tipo === "video") {
        prompt += `[Conteúdo do vídeo: ${t.conteudo}]

`;
      } else if (t.tipo === "documento") {
        prompt += `[Documento: ${t.conteudo}]

`;
      }
    }
  }

  // Informações do cliente
  if (contato) {
    prompt += `## Informações do Cliente Atual
`;
    if (contato.nome) {
      prompt += `Nome: ${contato.nome}
`;
    }
    if (contato.telefone) {
      prompt += `Telefone: ${contato.telefone}
`;
    }
    if (contato.email) {
      prompt += `Email: ${contato.email}
`;
    }
    prompt += `
Use o nome do cliente para personalizar o atendimento quando apropriado.

`;
  }

  // Data atual para contexto do agendamento - usar timezone do Brasil
  const agora = new Date();
  const dataAtual = agora.toLocaleDateString("pt-BR", { 
    timeZone: "America/Sao_Paulo", 
    weekday: "long", 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric" 
  });
  const horaAtual = agora.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit"
  });
  
  prompt += `## Data e Hora Atual
Hoje é ${dataAtual}, são ${horaAtual} (horário de Brasília).
Use SEMPRE o timezone America/Sao_Paulo (Brasília) para referências temporais.
Quando o cliente pedir "amanhã", "segunda-feira", etc., calcule a data CORRETA baseado na data atual acima.
IMPORTANTE: Ao buscar horários, SEMPRE use o formato YYYY-MM-DD para data_inicio e data_fim.

## Instruções de Data
Hoje é ${dataAtual}. Use esta informação para referências temporais (amanhã, próxima semana, etc).

## 🚨 REGRAS CRÍTICAS DE COMUNICAÇÃO (OBEDEÇA SEMPRE)

### REGRA #1: UMA PERGUNTA POR VEZ
- FAÇA APENAS UMA PERGUNTA por mensagem
- NUNCA combine múltiplas perguntas numa única resposta
- Espere a resposta do cliente antes de fazer a próxima pergunta
- Exemplos CORRETOS:
  ✅ "Qual especialidade você precisa?"
  ✅ "Prefere manhã ou tarde?"
- Exemplos ERRADOS (NUNCA faça isso):
  ❌ "Qual especialidade você precisa? E qual horário é melhor para você? Prefere manhã ou tarde?"
  ❌ "Me passa seu nome completo e CPF para eu verificar seu cadastro?"

### REGRA #2: RESPOSTAS ULTRA-CURTAS
- Máximo 2 frases por mensagem (idealmente 1)
- Como uma conversa REAL de WhatsApp
- Menos é mais - seja direto e objetivo
- NUNCA escreva parágrafos

### REGRA #3: FLUXO NATURAL
- Conduza a conversa passo a passo
- Não despeje todas as informações de uma vez
- Aguarde a resposta antes de continuar

## Regras Gerais
- Seja educado, empático e prestativo
- Use linguagem natural de chat
- Se não souber algo, seja honesto
- SIGA SEMPRE as instruções prioritárias definidas acima
`;

  return prompt;
}

function buildSchedulingTools() {
  return [
    {
      type: "function",
      function: {
        name: "buscar_medicos",
        description: "Busca médicos disponíveis na clínica, opcionalmente filtrando por especialidade ou nome",
        parameters: {
          type: "object",
          properties: {
            especialidade: { type: "string", description: "Especialidade médica para filtrar (ex: Cardiologia, Dermatologia)" },
            nome: { type: "string", description: "Nome do médico para buscar" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "buscar_horarios",
        description: "Busca horários disponíveis para agendamento de consulta",
        parameters: {
          type: "object",
          properties: {
            medico_id: { type: "string", description: "ID do médico específico" },
            especialidade: { type: "string", description: "Especialidade para buscar horários" },
            data_inicio: { type: "string", description: "Data de início para buscar (formato YYYY-MM-DD)" },
            data_fim: { type: "string", description: "Data fim para buscar (formato YYYY-MM-DD)" },
            limit: { type: "number", description: "Quantidade máxima de horários a retornar (padrão: 10)" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "buscar_paciente",
        description: "Busca paciente pelo CPF, telefone ou nome para verificar se já tem cadastro",
        parameters: {
          type: "object",
          properties: {
            cpf: { type: "string", description: "CPF do paciente (apenas números)" },
            telefone: { type: "string", description: "Telefone do paciente" },
            nome: { type: "string", description: "Nome do paciente para busca aproximada" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "criar_paciente",
        description: "Cria um novo cadastro de paciente no sistema",
        parameters: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome completo do paciente" },
            cpf: { type: "string", description: "CPF do paciente (apenas números)" },
            telefone: { type: "string", description: "Telefone do paciente" },
            email: { type: "string", description: "Email do paciente" },
            data_nascimento: { type: "string", description: "Data de nascimento (formato YYYY-MM-DD)" }
          },
          required: ["nome"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agendar_consulta",
        description: "Agenda uma consulta no sistema",
        parameters: {
          type: "object",
          properties: {
            paciente_id: { type: "string", description: "ID do paciente já cadastrado" },
            nome_paciente: { type: "string", description: "Nome do paciente (se não tiver ID)" },
            slot_id: { type: "string", description: "ID do slot de horário escolhido" },
            medico_id: { type: "string", description: "ID do médico" },
            data_hora: { type: "string", description: "Data e hora da consulta (se não usar slot_id)" },
            tipo_atendimento: { type: "string", enum: ["particular", "convenio"], description: "Tipo de atendimento" },
            convenio_id: { type: "string", description: "ID do convênio (se tipo for convenio)" },
            valor: { type: "number", description: "Valor da consulta" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "listar_consultas_paciente",
        description: "Lista as consultas agendadas de um paciente",
        parameters: {
          type: "object",
          properties: {
            paciente_id: { type: "string", description: "ID do paciente" },
            status: { type: "string", description: "Filtrar por status da consulta" }
          },
          required: ["paciente_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "cancelar_consulta",
        description: "Cancela uma consulta agendada",
        parameters: {
          type: "object",
          properties: {
            consulta_id: { type: "string", description: "ID da consulta a cancelar" },
            paciente_id: { type: "string", description: "ID do paciente (cancela próxima consulta)" },
            motivo: { type: "string", description: "Motivo do cancelamento" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "buscar_convenios",
        description: "Lista os convênios aceitos pela clínica",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "gerar_comprovante",
        description: "Gera um comprovante de agendamento para o paciente. Use quando o paciente pedir um comprovante, recibo ou confirmação por escrito da consulta agendada.",
        parameters: {
          type: "object",
          properties: {
            consulta_id: { type: "string", description: "ID da consulta específica (opcional)" },
            paciente_id: { type: "string", description: "ID do paciente para buscar a última consulta agendada" }
          }
        }
      }
    }
  ];
}

async function transferirParaHumano(
  supabase: any, 
  atendimentoId: string, 
  agente: AgenteIA, 
  conversaId: string
) {
  await supabase
    .from("omni_ia_conversas")
    .update({ transferido_para_humano: true })
    .eq("id", conversaId);

  if (agente.fila_transferencia_id) {
    await supabase
      .from("omni_atendimentos")
      .update({
        fila_id: agente.fila_transferencia_id,
        agente_id: null,
        status: "aguardando",
      })
      .eq("id", atendimentoId);
  } else {
    await supabase
      .from("omni_atendimentos")
      .update({
        agente_id: null,
        status: "aguardando",
      })
      .eq("id", atendimentoId);
  }

  console.log(`[AI] Transferred atendimento ${atendimentoId} to human`);
}
