
# Plano de Correção: Sistema de Agendamento IA WhatsApp

## Problemas Identificados

### 1. IA Não Verifica Sucesso do Agendamento
A IA envia a confirmação ANTES de verificar se a consulta foi realmente criada no banco. Se houver erro, o paciente recebe confirmação falsa.

### 2. IA Busca Horário Recém-Agendado
Após agendar, a IA busca horários novamente e não encontra o slot (porque foi marcado como indisponível), fazendo parecer que não agendou.

### 3. Coleta Incompleta de Dados
A IA só pede CPF, mas o modal de agendamento interno coleta: nome, telefone, CPF, tipo de atendimento, local, etc.

### 4. Não Puxa Dados do Cadastro Existente
Se o paciente já tem cadastro, a IA deveria usar os dados automaticamente sem pedir novamente.

---

## Solucao Proposta

### Fase 1: Verificacao Pos-Agendamento (Critico)

**Arquivo**: `supabase/functions/omni-ai-actions/index.ts`

Adicionar verificacao de sucesso apos inserir a consulta:

```text
1. Inserir consulta no banco
2. VERIFICAR se consulta existe com SELECT
3. Se nao encontrar -> retornar erro "Agendamento falhou"
4. Se encontrar -> retornar confirmacao com dados verificados
```

### Fase 2: Fluxo de Coleta de Dados Completo

**Arquivo**: `supabase/functions/omni-ai-respond/index.ts`

Atualizar o prompt do agente para seguir o fluxo do modal interno:

```text
FLUXO CORRETO:
1. Perguntar especialidade/medico
2. Buscar horarios disponiveis
3. Confirmar horario escolhido
4. Verificar cadastro (buscar_paciente pelo telefone)
5. Se NAO encontrar cadastro:
   a) Pedir NOME COMPLETO
   b) Pedir CPF (se exigir_cpf)
   c) Criar cadastro (criar_paciente)
6. Se ENCONTRAR cadastro:
   - Confirmar: "Voce e [NOME], correto?"
   - Usar dados existentes
7. Perguntar tipo de atendimento (Particular/Convenio)
8. Finalizar agendamento
```

### Fase 3: Melhoria no Buscar Paciente

**Arquivo**: `supabase/functions/omni-ai-actions/index.ts`

A funcao `buscar_paciente` ja recebe `contato_telefone` automaticamente. Modificar para:

1. Primeiro buscar pelo telefone do WhatsApp (ja disponivel)
2. Se encontrar, retornar dados completos
3. Se nao encontrar, indicar que precisa coletar dados

### Fase 4: Prevenir Busca Duplicada de Horarios

**Arquivo**: `supabase/functions/omni-ai-respond/index.ts`

Adicionar instrucao no prompt:

```text
APOS AGENDAR COM SUCESSO:
- NAO busque horarios novamente
- NAO confirme disponibilidade novamente  
- Finalize a conversa com a mascara de confirmacao
```

---

## Detalhes Tecnicos

### Modificacoes em `omni-ai-actions/index.ts`

**Funcao `agendarConsulta`** (linha ~490-600):

```typescript
// APOS inserir consulta, adicionar verificacao:

const { data: consulta, error: consultaError } = await supabase
  .from("consultas")
  .insert({...})
  .select("id, data_hora, ...")
  .single();

if (consultaError) throw consultaError;

// NOVA VERIFICACAO - Garantir que foi criada
const { data: consultaVerificada, error: verifyError } = await supabase
  .from("consultas")
  .select("id, data_hora, medico:medicos!consultas_medico_id_fkey(nome)")
  .eq("id", consulta.id)
  .single();

if (verifyError || !consultaVerificada) {
  console.error("[agendarConsulta] Verification failed:", verifyError);
  return { 
    success: false, 
    error: "Nao foi possivel confirmar o agendamento. Por favor, tente novamente." 
  };
}
```

**Funcao `buscarPaciente`** (linha ~325-371):

```typescript
// Modificar para buscar automaticamente pelo telefone do contato
async function buscarPaciente(supabase, clinicaId, params, contato_telefone) {
  // Se nenhum param foi passado, usar telefone do WhatsApp
  if (!params.cpf && !params.telefone && !params.nome && contato_telefone) {
    params.telefone = contato_telefone;
  }
  
  // ... resto da logica existente
  
  // Retornar mais dados quando encontrar
  return {
    success: true,
    data: {
      id: data.id,
      nome: data.nome,
      cpf: data.cpf,
      telefone: data.telefone || data.celular,
      email: data.email,
      data_nascimento: data.data_nascimento,
      tem_cadastro: true,  // NOVO CAMPO
    },
    message: `Encontrei seu cadastro: ${data.nome}. Podemos continuar!`,
  };
}
```

### Modificacoes em `omni-ai-respond/index.ts`

**Funcao `buildSystemPrompt`** (linha ~668-901):

Atualizar a secao de agendamento para incluir:

```typescript
### FLUXO OBRIGATORIO DE AGENDAMENTO:

PASSO 1 - IDENTIFICAR PACIENTE:
- Use buscar_paciente SEM parametros (buscara pelo telefone do WhatsApp automaticamente)
- Se encontrar cadastro: "Ola [NOME]! Vi que voce ja tem cadastro conosco."
- Se NAO encontrar: Continuar para coleta de dados

PASSO 2 - COLETA DE DADOS (se nao tiver cadastro):
a) Perguntar NOME COMPLETO
b) Perguntar CPF (apenas digitos)
c) Usar criar_paciente com os dados

PASSO 3 - ESPECIALIDADE/MEDICO:
- Perguntar qual especialidade ou medico deseja

PASSO 4 - BUSCAR HORARIOS:
- Usar buscar_horarios com data especifica
- Apresentar 3-5 opcoes

PASSO 5 - TIPO DE ATENDIMENTO:
- Perguntar: "Sera Particular ou Convenio?"
- Se convenio, usar buscar_convenios e confirmar qual

PASSO 6 - FINALIZAR:
- Usar agendar_consulta com TODOS os dados
- Aguardar confirmacao de sucesso
- Enviar mascara de confirmacao

### APOS AGENDAMENTO COM SUCESSO:
- NUNCA busque horarios novamente
- NUNCA duvide do agendamento que acabou de fazer
- Finalize cordialmente a conversa
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `omni-ai-actions/index.ts` | Verificacao pos-agendamento, melhoria buscar_paciente |
| `omni-ai-respond/index.ts` | Fluxo completo no prompt, prevenir busca duplicada |

## Resultado Esperado

1. Consultas serao verificadas antes de confirmar ao paciente
2. IA coletara todos os dados necessarios em sequencia
3. Pacientes com cadastro terao dados puxados automaticamente
4. IA nao ficara "confusa" apos agendar com sucesso
5. Paridade total com agendamentos manuais do painel
