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
    
    // Mapear modelo para o Lovable AI Gateway
    const modeloGateway = MODEL_MAPPING[agenteIA.modelo] || "google/gemini-3-flash-preview";
    console.log(`[AI] Found agent: ${agenteIA.nome}, model: ${agenteIA.modelo} -> ${modeloGateway}`);

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

    // Verificar se já foi transferido para humano
    if (conversa.transferido_para_humano) {
      console.log("[AI] Conversa already transferred to human");
      return new Response(JSON.stringify({ ai_active: false, reason: "transferred" }), {
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

    // Construir o system prompt baseado nas configurações
    const systemPrompt = buildSystemPrompt(agenteIA, treinamentos || [], atendimento.contato);

    // Construir histórico de mensagens
    const historicoMensagens = (conversa.mensagens as any[]) || [];
    historicoMensagens.push({ role: "user", content: mensagem });

    console.log(`[AI] Calling Lovable AI Gateway with model: ${modeloGateway}`);

    // Aplicar tempo de resposta (delay) se configurado
    if (agenteIA.tempo_resposta && agenteIA.tempo_resposta > 0) {
      console.log(`[AI] Waiting ${agenteIA.tempo_resposta} seconds before responding...`);
      await new Promise(resolve => setTimeout(resolve, agenteIA.tempo_resposta * 1000));
    }

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
      }),
    });

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
    let respostaIA = aiData.choices?.[0]?.message?.content || "";

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

    // Dividir resposta em partes se configurado
    let mensagensParaEnviar: string[] = [];
    
    if (agenteIA.dividir_resposta && respostaIA.length > 300) {
      const paragrafos = respostaIA.split(/\n\n+/).filter(p => p.trim());
      
      if (paragrafos.length > 1) {
        mensagensParaEnviar = paragrafos;
      } else {
        const sentencas = respostaIA.match(/[^.!?]+[.!?]+/g) || [respostaIA];
        let mensagemAtual = "";
        
        for (const sentenca of sentencas) {
          if ((mensagemAtual + sentenca).length > 300) {
            if (mensagemAtual) mensagensParaEnviar.push(mensagemAtual.trim());
            mensagemAtual = sentenca;
          } else {
            mensagemAtual += sentenca;
          }
        }
        if (mensagemAtual) mensagensParaEnviar.push(mensagemAtual.trim());
      }
    } else {
      mensagensParaEnviar = [respostaIA];
    }

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

function buildSystemPrompt(agente: AgenteIA, treinamentos: Treinamento[], contato: any): string {
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

## Estilo de Comunicação
${estilos[agente.comunicacao as keyof typeof estilos] || estilos.normal}

## Objetivo Principal
${finalidades[agente.finalidade as keyof typeof finalidades] || finalidades.suporte}

`;

  // Instruções específicas de comportamento (campo mais importante)
  if (agente.comportamento) {
    prompt += `## Instruções Específicas de Comportamento
${agente.comportamento}

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

  prompt += `## Regras Gerais de Atendimento
- Seja sempre educado, empático e prestativo
- Responda de forma objetiva e clara
- Se não souber algo, seja honesto e ofereça alternativas
- Mantenha as respostas concisas (máximo 3-4 parágrafos por mensagem)
- Não invente informações que não estão na sua base de conhecimento
- Se o cliente parecer frustrado, demonstre empatia antes de oferecer soluções
- Sempre confirme se entendeu corretamente antes de dar respostas definitivas
`;

  return prompt;
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
