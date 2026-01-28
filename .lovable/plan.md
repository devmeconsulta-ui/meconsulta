
# Plano: Sistema de Confirmacao de Agenda via WhatsApp

## Visao Geral

Criar uma pagina completa para envio automatizado de confirmacoes de consultas via WhatsApp, integrada ao modulo omnichannel existente. O sistema permitira selecionar consultas, enviar mensagens personalizadas com link de confirmacao, e receber respostas dos pacientes em tempo real.

---

## Arquitetura do Sistema

```text
+-------------------+     +----------------------+     +------------------+
|   Frontend        |     |   Edge Functions     |     |   Evolution API  |
|   OmniConfirmacao |<--->|   send-confirmation  |<--->|   (WhatsApp)     |
+-------------------+     +----------------------+     +------------------+
        |                         |                           |
        v                         v                           v
+-------------------+     +----------------------+     +------------------+
|   Supabase DB     |     |   Webhook            |     |   Pagina Publica |
|   confirmacoes    |<----|   (respostas)        |<----|   Confirmacao    |
+-------------------+     +----------------------+     +------------------+
```

---

## Fase 1: Nova Tabela no Banco de Dados

### Tabela: confirmacoes_agenda

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| clinica_id | uuid | FK para clinicas |
| consulta_id | uuid | FK para consultas |
| paciente_id | uuid | FK para pacientes |
| fila_id | uuid | FK para omni_filas (fila de envio) |
| telefone | text | Telefone do paciente |
| mensagem_enviada | text | Conteudo da mensagem |
| link_confirmacao | text | Link unico gerado |
| token_confirmacao | text | Token unico para validacao |
| status | text | pendente/enviada/confirmada/recusada/erro/expirada |
| data_envio | timestamp | Quando foi enviada |
| data_resposta | timestamp | Quando o paciente respondeu |
| whatsapp_message_id | text | ID da mensagem no WhatsApp |
| erro_descricao | text | Descricao do erro (se houver) |
| created_at | timestamp | |

**Indices**: consulta_id, clinica_id, token_confirmacao, status

---

## Fase 2: Edge Functions

### 1. send-confirmation-batch (Nova)

Responsavel por enviar confirmacoes em lote com controle de throttling:

- Recebe lista de consulta_ids e fila_id
- Busca dados das consultas (paciente, medico, horario, local)
- Gera token unico para cada confirmacao
- Monta mensagem personalizada com variaveis
- Envia via Evolution API com delay configuravel entre mensagens (ex: 3-5 segundos)
- Salva registros na tabela confirmacoes_agenda
- Retorna estatisticas de envio

**Parametros de throttling**:
- intervalo_minimo: 3000ms (3 segundos entre mensagens)
- intervalo_maximo: 5000ms (aleatorio para parecer humano)
- lote_maximo: 50 mensagens por execucao

### 2. confirmation-response (Nova)

Endpoint publico para processar resposta do paciente:

- Recebe token via query param
- Valida token e verifica se nao expirou (24h)
- Retorna dados da consulta para exibir na pagina
- Permite acao de confirmar ou recusar
- Atualiza status na tabela confirmacoes_agenda
- Atualiza status_consulta na tabela consultas (confirmada ou cancelada)
- Notifica clinica via clinica_notificacoes

---

## Fase 3: Pagina Publica de Confirmacao

### Rota: /confirmar-consulta/:token

Pagina publica (sem autenticacao) que sera acessada pelo paciente ao clicar no link:

**Layout**:
- Logo da clinica (opcional)
- Card com dados da consulta:
  - Nome do paciente
  - Nome do medico + especialidade
  - Data e hora
  - Local (endereco)
  - Lembrete: "Chegue 15 minutos antes"
- Dois botoes grandes:
  - Confirmar Presenca (verde)
  - Nao Poderei Comparecer (vermelho)
- Feedback visual apos acao
- Mensagem de agradecimento

**Estados**:
- loading: Carregando dados
- valid: Exibindo formulario
- confirmed: Consulta confirmada com sucesso
- declined: Consulta recusada
- expired: Link expirado
- error: Erro ao processar

---

## Fase 4: Pagina Principal - OmniConfirmacaoAgenda

### Rota: /clinica/omnichannel/confirmacao-agenda

### Estrutura da Pagina

**1. Dashboard de Metricas (Cards)**

Cards modernos com gradientes (seguindo padrao existente):
- Total Enviadas (azul)
- Confirmadas (verde)
- Recusadas (vermelho)
- Aguardando Resposta (amarelo)
- Taxa de Confirmacao (% com indicador de tendencia)
- Falhas de Envio (rose)

**2. Filtros**

- Periodo: Hoje, Amanha, Proximos 7 dias, Proximos 30 dias
- Medico (select com lista de medicos da clinica)
- Status da consulta (aguardando_pagamento, confirmada, etc)
- Status da confirmacao (pendente, enviada, confirmada, recusada)

**3. Configuracao de Envio**

Card lateral com:
- Selecionar Fila de Envio (dropdown de omni_filas conectadas)
- Intervalo entre mensagens (slider: 3-10 segundos)
- Mensagem personalizada (textarea com variaveis disponiveis)

Variaveis disponiveis:
- {{nome_paciente}}
- {{nome_medico}}
- {{especialidade}}
- {{data}}
- {{horario}}
- {{local}}
- {{link_confirmacao}}

Mensagem padrao:
```
Ola {{nome_paciente}}! 

Lembramos que voce tem uma consulta agendada:

Medico: {{nome_medico}} ({{especialidade}})
Data: {{data}} as {{horario}}
Local: {{local}}

Por favor, chegue 15 minutos antes do horario.

Confirme sua presenca clicando no link abaixo:
{{link_confirmacao}}

Clinica XYZ
```

**4. Lista de Consultas para Envio**

Tabela com checkbox para selecao:
- [ ] Selecionar todos
- Paciente (nome)
- Telefone
- Medico
- Data/Hora
- Status Consulta
- Status Confirmacao
- Acoes (enviar individual, ver detalhes)

**5. Botao de Envio em Lote**

- "Enviar Confirmacao para Selecionados (X)"
- Barra de progresso durante envio
- Toast com resultado: "X enviadas, Y falhas"

**6. Historico de Envios**

Aba ou accordion com:
- Lista de confirmacoes enviadas
- Filtros por status
- Detalhes de cada envio (horario, resposta, etc)

---

## Fase 5: Graficos e Visualizacoes

### Graficos no Dashboard

1. **Grafico de Area**: Confirmacoes por hora/dia
   - Linha para enviadas
   - Linha para confirmadas
   - Linha para recusadas

2. **Grafico de Pizza/Donut**: Distribuicao por status
   - Confirmadas vs Recusadas vs Sem resposta

3. **Grafico de Barras**: Performance por medico
   - Taxa de confirmacao por medico

---

## Detalhes Tecnicos

### Sincronizacao com Consultas

Quando paciente confirma:
```sql
UPDATE consultas SET status_consulta = 'confirmada' WHERE id = consulta_id;
UPDATE confirmacoes_agenda SET status = 'confirmada', data_resposta = now() WHERE token = token;
```

Quando paciente recusa:
```sql
UPDATE consultas SET status_consulta = 'cancelada' WHERE id = consulta_id;
UPDATE confirmacoes_agenda SET status = 'recusada', data_resposta = now() WHERE token = token;
```

### Prevencao de Bloqueio do WhatsApp

1. Delay aleatorio entre 3-5 segundos por mensagem
2. Maximo de 50 mensagens por lote
3. Pausas maiores a cada 20 mensagens (10-15 segundos)
4. Horario comercial apenas (configuravel por fila)
5. Limite diario por instancia (configuravel)

### Seguranca

- Tokens de confirmacao com UUID v4 (dificil de adivinhar)
- Tokens expiram em 24h antes da consulta
- Rate limiting na pagina publica
- Nao expor dados sensiveis no link

---

## Arquivos a Criar/Modificar

### Novos Arquivos

1. `src/pages/clinica/omnichannel/OmniConfirmacaoAgenda.tsx` - Pagina principal
2. `src/pages/ConfirmarConsulta.tsx` - Pagina publica de confirmacao
3. `src/components/clinica/omnichannel/confirmacao/ConfirmacaoMetricsCards.tsx` - Cards do dashboard
4. `src/components/clinica/omnichannel/confirmacao/ConfirmacaoEnvioConfig.tsx` - Config de envio
5. `src/components/clinica/omnichannel/confirmacao/ConfirmacaoConsultasList.tsx` - Lista de consultas
6. `src/hooks/useConfirmacaoAgenda.ts` - Hook para gerenciar confirmacoes
7. `supabase/functions/send-confirmation-batch/index.ts` - Edge function envio
8. `supabase/functions/confirmation-response/index.ts` - Edge function resposta
9. `supabase/migrations/XXXX_create_confirmacoes_agenda.sql` - Migration

### Arquivos a Modificar

1. `src/App.tsx` - Adicionar rotas
2. `src/components/clinica/ClinicaSidebar.tsx` - Adicionar link no menu omnichannel (se houver submenu)
3. `supabase/config.toml` - Registrar novas edge functions

---

## Ordem de Implementacao

**Sprint 1: Fundacao**
1. Criar migration para tabela confirmacoes_agenda
2. Criar edge function send-confirmation-batch
3. Criar edge function confirmation-response

**Sprint 2: Pagina Publica**
4. Criar pagina ConfirmarConsulta.tsx
5. Adicionar rota publica no App.tsx

**Sprint 3: Pagina Principal**
6. Criar hook useConfirmacaoAgenda
7. Criar componentes de UI (cards, lista, config)
8. Criar pagina OmniConfirmacaoAgenda.tsx
9. Adicionar rota no App.tsx

**Sprint 4: Refinamentos**
10. Implementar graficos
11. Adicionar historico de envios
12. Testes e ajustes finais

---

## Consideracoes de UX

- Cards devem seguir exatamente o padrao visual do OmniDashAtendimentos (gradientes, icones, cores)
- Graficos devem usar a mesma paleta de cores CHART_COLORS
- Feedback visual claro durante envio (barra de progresso, contagem)
- Mensagens de erro amigaveis
- Mobile-first para a pagina publica de confirmacao
- Botoes grandes e claros na pagina do paciente
