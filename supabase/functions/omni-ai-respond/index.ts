import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

app.use("/*", cors({
  origin: "*",
  allowHeaders: ["authorization", "x-client-info", "apikey", "content-type"],
}));

interface AgenteIA {
  id: string;
  nome: string;
  modelo: string;
  comunicacao: string;
  comportamento: string;
  finalidade: string;
  produto: string;
  descricao_produto: string;
  transferir_para_humano: boolean;
  usar_emojis: boolean;
  assinar_nome: boolean;
  restringir_temas: boolean;
  dividir_resposta: boolean;
  palavras_chave_transferencia: string[];
  fila_transferencia_id: string | null;
  limite_interacoes: number;
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
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4-turbo": "openai/gpt-4-turbo",
  "claude-3-opus": "anthropic/claude-3-opus",
  "claude-3-sonnet": "anthropic/claude-3-sonnet",
  "claude-3-haiku": "anthropic/claude-3-haiku",
  "gemini-1.5-pro": "google/gemini-1.5-pro",
  "gemini-1.5-flash": "google/gemini-1.5-flash",
  "gemini-2.0-flash": "google/gemini-2.0-flash",
  "llama-3.1-70b": "groq/llama-3.1-70b-versatile",
  "mixtral-8x7b": "groq/mixtral-8x7b-32768",
};

app.post("/", async (c) => {
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
      return c.json({ error: "Atendimento not found" }, 404);
    }

    // Buscar agente de IA configurado para a fila
    const { data: agente, error: agenteError } = await supabase
      .from("omni_ia_agentes")
      .select("*")
      .eq("clinica_id", clinica_id)
      .eq("fila_operacao_id", atendimento.fila_id)
      .eq("ativo", true)
      .single();

    if (agenteError || !agente) {
      console.log("[AI] No active AI agent configured for this queue");
      return c.json({ ai_active: false });
    }

    const agenteIA = agente as AgenteIA;
    
    // Mapear modelo para o Lovable AI Gateway
    const modeloGateway = MODEL_MAPPING[agenteIA.modelo] || "google/gemini-2.0-flash";
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
      return c.json({ ai_active: false, reason: "transferred" });
    }

    // Verificar limite de interações
    if (agenteIA.limite_interacoes > 0 && conversa.interacoes_count >= agenteIA.limite_interacoes) {
      console.log("[AI] Interaction limit reached, transferring to human");
      
      if (agenteIA.transferir_para_humano) {
        await transferirParaHumano(supabase, atendimento_id, agenteIA, conversa.id);
      }
      
      return c.json({ ai_active: false, reason: "limit_reached" });
    }

    // Verificar palavras-chave de transferência
    if (agenteIA.palavras_chave_transferencia.length > 0) {
      const mensagemLower = mensagem.toLowerCase();
      const deveTransferir = agenteIA.palavras_chave_transferencia.some(
        (palavra) => mensagemLower.includes(palavra.toLowerCase())
      );
      
      if (deveTransferir && agenteIA.transferir_para_humano) {
        console.log("[AI] Transfer keyword detected, transferring to human");
        await transferirParaHumano(supabase, atendimento_id, agenteIA, conversa.id);
        
        return c.json({ 
          ai_active: false, 
          reason: "transfer_keyword",
          mensagem: "Entendido! Vou transferir você para um atendente humano. Aguarde um momento..."
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
          ...historicoMensagens.slice(-20), // Últimas 20 mensagens para contexto
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return c.json({ error: "Rate limited", ai_active: false }, 429);
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let respostaIA = aiData.choices?.[0]?.message?.content || "";

    console.log(`[AI] Got response: ${respostaIA.substring(0, 100)}...`);

    // Processar resposta baseado nas configurações
    if (!agenteIA.usar_emojis) {
      // Remover emojis
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
      })
      .eq("id", conversa.id);

    // Dividir resposta em partes se configurado
    let mensagensParaEnviar: string[] = [];
    
    if (agenteIA.dividir_resposta && respostaIA.length > 300) {
      // Dividir em parágrafos ou sentenças
      const paragrafos = respostaIA.split(/\n\n+/).filter(p => p.trim());
      
      if (paragrafos.length > 1) {
        mensagensParaEnviar = paragrafos;
      } else {
        // Dividir em sentenças se não houver parágrafos
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

    return c.json({ 
      ai_active: true, 
      mensagens: mensagensParaEnviar,
      agente_nome: agenteIA.nome,
    });

  } catch (error) {
    console.error("[AI] Error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

app.options("/", (c) => c.text("", 204));

Deno.serve(app.fetch);

function buildSystemPrompt(agente: AgenteIA, treinamentos: Treinamento[], contato: any): string {
  const estilos = {
    formal: "Você deve usar linguagem formal, profissional e cortês. Evite gírias e coloquialismos.",
    normal: "Você deve usar uma linguagem amigável e profissional, equilibrada entre formal e casual.",
    descontraida: "Você deve usar uma linguagem leve, descontraída e amigável, como um amigo conversando.",
  };

  const finalidades = {
    suporte: "Seu objetivo é ajudar o cliente com dúvidas e suporte sobre nossos serviços.",
    vendas: "Seu objetivo é ajudar o cliente e, quando apropriado, apresentar nossos serviços e agendar consultas.",
    pessoal: "Você é um assistente pessoal para ajudar com diversas necessidades.",
  };

  let prompt = `Você é ${agente.nome}, um assistente virtual de atendimento.

## Estilo de Comunicação
${estilos[agente.comunicacao as keyof typeof estilos] || estilos.normal}

## Objetivo
${finalidades[agente.finalidade as keyof typeof finalidades] || finalidades.suporte}

`;

  if (agente.comportamento) {
    prompt += `## Instruções Específicas
${agente.comportamento}

`;
  }

  if (agente.produto) {
    prompt += `## Sobre Nosso Produto/Serviço
Produto: ${agente.produto}
${agente.descricao_produto || ""}

`;
  }

  if (!agente.usar_emojis) {
    prompt += `IMPORTANTE: NÃO use emojis em suas respostas.

`;
  }

  if (agente.restringir_temas) {
    prompt += `IMPORTANTE: Você deve APENAS responder perguntas relacionadas ao nosso produto/serviço. 
Se o cliente perguntar sobre outros assuntos, educadamente redirecione a conversa para nossos serviços.

`;
  }

  if (agente.transferir_para_humano && agente.palavras_chave_transferencia.length > 0) {
    prompt += `Se o cliente mencionar palavras como: ${agente.palavras_chave_transferencia.join(", ")}, 
você deve indicar que vai transferir para um atendente humano.

`;
  }

  // Adicionar treinamentos como contexto
  if (treinamentos.length > 0) {
    prompt += `## Base de Conhecimento
`;
    for (const t of treinamentos) {
      prompt += `${t.conteudo}

`;
    }
  }

  // Adicionar info do contato
  if (contato) {
    prompt += `## Informações do Cliente
Nome: ${contato.nome || "Não informado"}
Telefone: ${contato.telefone || "Não informado"}

`;
  }

  prompt += `## Regras Gerais
- Seja sempre educado e prestativo
- Responda de forma objetiva e clara
- Se não souber algo, seja honesto e ofereça alternativas
- Mantenha as respostas concisas (máximo 3-4 parágrafos)
`;

  return prompt;
}

async function transferirParaHumano(
  supabase: any, 
  atendimentoId: string, 
  agente: AgenteIA, 
  conversaId: string
) {
  // Marcar conversa como transferida
  await supabase
    .from("omni_ia_conversas")
    .update({ transferido_para_humano: true })
    .eq("id", conversaId);

  // Se tiver fila de transferência configurada, transferir
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
    // Apenas remover agente e colocar em aguardando
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
