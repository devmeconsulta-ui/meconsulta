
# Plano: IA com Agendamento Automático de Consultas

## Objetivo
Transformar a IA em uma assistente inteligente capaz de:
- Buscar profissionais disponíveis na clínica
- Consultar horários livres em tempo real
- Identificar/cadastrar pacientes automaticamente
- Agendar consultas diretamente no sistema
- Distribuir atendimentos entre atendentes (round-robin)
- Sugerir alternativas quando não houver disponibilidade

---

## Arquitetura da Solução

```text
+----------------+     +---------------------+     +------------------+
|   WhatsApp     | --> | omni-ai-respond     | --> | omni-ai-actions  |
|   (Paciente)   |     | (Processa intenção) |     | (Executa ações)  |
+----------------+     +---------------------+     +------------------+
                                |                          |
                                v                          v
                    +---------------------+     +------------------+
                    |  Lovable AI Gateway |     |   Supabase DB    |
                    |  (Gera resposta)    |     |  (Consultas,     |
                    +---------------------+     |   Pacientes,     |
                                                |   Slots, etc)    |
                                                +------------------+
```

---

## Fase 1: Configurações no Banco de Dados

### 1.1 Nova coluna na tabela `omni_ia_agentes`
Adicionar campo `permitir_agendamento` (boolean) para habilitar/desabilitar a funcionalidade por agente.

### 1.2 Nova tabela `omni_ia_agendamentos_config`
Configurações específicas de agendamento por agente:
- `agente_id` - Referência ao agente
- `tipos_atendimento` - Particular, Convênio, ambos
- `valor_padrao` - Valor padrão se não encontrar
- `distribuicao_atendentes` - Modo de distribuição (round-robin, fixa, etc.)
- `mensagens_confirmacao` - Templates customizáveis
- `exigir_cpf` - Se CPF é obrigatório
- `permitir_encaixe` - Permitir encaixes em horários lotados
- `antecedencia_minima_horas` - Mínimo de horas para agendar
- `antecedencia_maxima_dias` - Máximo de dias no futuro

---

## Fase 2: Nova Edge Function `omni-ai-actions`

Responsável por executar ações no sistema. A IA não faz queries diretamente - ela solicita ações estruturadas.

### 2.1 Ações Disponíveis

| Ação | Descrição |
|------|-----------|
| `buscar_medicos` | Lista médicos/especialidades disponíveis |
| `buscar_horarios` | Consulta slots disponíveis |
| `buscar_paciente` | Busca paciente por CPF/telefone |
| `criar_paciente` | Cadastra novo paciente |
| `agendar_consulta` | Cria consulta no sistema |
| `cancelar_consulta` | Cancela consulta existente |
| `listar_consultas_paciente` | Histórico do paciente |

### 2.2 Fluxo de Execução

```text
1. IA detecta intenção de agendamento
2. IA gera JSON com ação desejada
3. omni-ai-respond parseia resposta
4. Chama omni-ai-actions com a ação
5. Resultado é injetado no contexto da IA
6. IA formata resposta humanizada
```

---

## Fase 3: Modificações no `omni-ai-respond`

### 3.1 System Prompt Expandido
Adicionar instruções específicas para agendamento:
- Como coletar dados do paciente
- Quando buscar horários
- Como apresentar opções
- Fluxo de confirmação

### 3.2 Detecção de Intenções
A IA usará um formato especial para solicitar ações:

```json
{"action": "buscar_horarios", "params": {"especialidade": "Cardiologia", "data": "2026-02-10"}}
```

### 3.3 Contexto Enriquecido
Injetar dados da clínica no prompt:
- Lista de especialidades disponíveis
- Horários de funcionamento
- Políticas de agendamento
- Convênios aceitos

---

## Fase 4: Interface de Configuração (OmniIA.tsx)

### 4.1 Nova Seção "Agendamento"
- Toggle para ativar agendamento automático
- Seleção de tipos de atendimento
- Configuração de distribuição
- Templates de mensagens
- Regras de antecedência

### 4.2 Campos de Configuração
- Exigir CPF para agendar
- Permitir encaixes
- Valor padrão de consulta
- Horário mínimo/máximo

---

## Fase 5: Fluxo Completo de Agendamento

### Cenário: Novo Paciente

```text
Paciente: "Oi, quero marcar uma consulta"
IA: "Olá! Claro, posso te ajudar. Qual especialidade você precisa?"

Paciente: "Cardiologia"
[IA executa: buscar_medicos(especialidade=Cardiologia)]
IA: "Temos 2 cardiologistas: Dr. João Silva e Dra. Maria Santos. Tem preferência?"

Paciente: "Tanto faz, o que tiver horário primeiro"
[IA executa: buscar_horarios(especialidade=Cardiologia, limit=5)]
IA: "Temos esses horários disponíveis:
- Ter 11/02 às 09:00 com Dr. João
- Ter 11/02 às 10:30 com Dra. Maria
Qual prefere?"

Paciente: "09:00 terça"
IA: "Perfeito! Para confirmar o agendamento, preciso de alguns dados.
Qual seu nome completo?"

Paciente: "Carlos Eduardo Souza"
IA: "E seu CPF?"

Paciente: "123.456.789-00"
[IA executa: buscar_paciente(cpf=12345678900)]
# Não encontrado - vai criar novo
IA: "Confirma os dados?
- Nome: Carlos Eduardo Souza
- CPF: 123.456.789-00
- Telefone: (11) 99999-9999 (captado do WhatsApp)
- Data: Ter 11/02 às 09:00
- Médico: Dr. João Silva
- Valor: R$ 250,00 (particular)"

Paciente: "Confirma"
[IA executa: criar_paciente(...)]
[IA executa: agendar_consulta(...)]
IA: "Pronto! Sua consulta foi agendada. Você receberá uma confirmação por WhatsApp 24h antes. Até lá!"
```

### Cenário: Paciente Existente

```text
Paciente: "Oi"
[Sistema já tem telefone do contato]
[IA executa: buscar_paciente(telefone=11999999999)]
IA: "Olá Carlos! Tudo bem? Como posso te ajudar?"
```

---

## Detalhes Técnicos

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/omni-ai-actions/index.ts` | CRIAR - Nova edge function |
| `supabase/functions/omni-ai-respond/index.ts` | MODIFICAR - Integrar ações |
| `src/pages/clinica/omnichannel/OmniIA.tsx` | MODIFICAR - UI de config |
| `supabase/migrations/xxx.sql` | CRIAR - Schema de config |
| `supabase/config.toml` | MODIFICAR - Registrar function |

### Estrutura da Edge Function `omni-ai-actions`

```typescript
interface ActionRequest {
  action: string;
  params: Record<string, any>;
  clinica_id: string;
  contato_telefone?: string;
}

interface ActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string; // Mensagem formatada para a IA
}
```

### Ações Detalhadas

#### `buscar_medicos`
- Input: `{ especialidade?: string, nome?: string }`
- Output: Lista de médicos com nome, especialidade, valor

#### `buscar_horarios`
- Input: `{ medico_id?: string, especialidade?: string, data_inicio: string, data_fim?: string, limit?: number }`
- Output: Lista de slots disponíveis formatados

#### `buscar_paciente`
- Input: `{ cpf?: string, telefone?: string, nome?: string }`
- Output: Dados do paciente ou null

#### `criar_paciente`
- Input: `{ nome: string, cpf?: string, telefone: string, data_nascimento?: string }`
- Output: ID do paciente criado

#### `agendar_consulta`
- Input: `{ paciente_id: string, slot_id?: string, medico_id: string, data_hora: string, tipo_atendimento: string, convenio_id?: string, valor?: number }`
- Output: Dados da consulta criada

---

## Segurança e Validações

1. **Validação de CPF** - Verificar formato válido
2. **Conflito de Horários** - Checar se slot ainda está disponível antes de confirmar
3. **Antecedência Mínima** - Não permitir agendamento muito próximo
4. **Limite Diário** - Opcional: limitar agendamentos por paciente
5. **Bloqueio de Duplicatas** - Não agendar se já tem consulta próxima

---

## Distribuição de Atendentes (Round-Robin)

Para consultas agendadas pela IA, o campo `usuario_clinica_id` será preenchido automaticamente usando lógica de distribuição:

```typescript
async function getProximoAtendente(clinicaId: string): Promise<string | null> {
  // Buscar atendentes ativos
  // Contar agendamentos do dia
  // Retornar o com menos atendimentos
}
```

---

## Estimativa de Implementação

1. **Migration + Tabela de Config** - 30 min
2. **Edge Function omni-ai-actions** - 2h
3. **Modificar omni-ai-respond** - 1.5h
4. **Interface de Configuração** - 1h
5. **Testes e Ajustes** - 1h

**Total estimado: ~6 horas de desenvolvimento**

---

## Próximos Passos Após Aprovação

1. Criar migration com nova coluna e tabela de config
2. Implementar `omni-ai-actions` com todas as ações
3. Modificar `omni-ai-respond` para detectar e executar ações
4. Atualizar interface de configuração
5. Testar fluxo completo end-to-end
