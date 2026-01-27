
# Plano de Implementacao - Modulo Omnichannel WhatsApp

## Visao Geral

Implementar um sistema completo de gestao de atendimento via WhatsApp integrado com Evolution API, permitindo que clinicas gerenciem multiplos atendentes, filas de atendimento e conversas com clientes em tempo real.

## Arquitetura do Sistema

```text
+------------------+     +-------------------+     +------------------+
|   Frontend       |     |   Edge Functions  |     |   Evolution API  |
|   (React)        |<--->|   (Supabase)      |<--->|   (WhatsApp)     |
+------------------+     +-------------------+     +------------------+
        |                        |
        v                        v
+------------------+     +-------------------+
|   Supabase       |     |   Webhooks        |
|   Realtime       |     |   (Mensagens)     |
+------------------+     +-------------------+
```

---

## Fase 1: Estrutura do Banco de Dados

### Novas Tabelas

**1. omni_instancias** - Gerenciar instancias WhatsApp
- id, clinica_id, nome, numero_whatsapp, evolution_instance_name
- status (disconnected, connecting, connected)
- webhook_url, api_key_hash
- servidor_url, configuracoes (JSON)
- created_at, updated_at

**2. omni_filas** - Filas de atendimento
- id, clinica_id, instancia_id, nome, descricao
- numero_whatsapp, cor
- atendimentos_max_agente, estrategia_distribuicao
- fechar_por_inatividade_minutos
- mensagem_boas_vindas, mensagem_fora_horario
- mensagem_fechamento, mensagem_espera
- horario_funcionamento (JSON: {inicio, fim, dias_semana})
- ativo, created_at, updated_at

**3. omni_agentes** - Agentes por fila
- id, fila_id, usuario_clinica_id
- status (online, offline, pausa, ocupado)
- motivo_pausa, max_atendimentos_simultaneos
- tempo_logado_hoje, atendimentos_hoje
- created_at, updated_at

**4. omni_contatos** - Contatos/Clientes
- id, clinica_id, nome, telefone, documento
- email, instagram, foto_url, etiquetas (array)
- agente_preferencial_id, empresa
- observacoes, dados_extras (JSON)
- paciente_id (FK opcional)
- created_at, updated_at

**5. omni_atendimentos** - Conversas/Tickets
- id, clinica_id, fila_id, contato_id, agente_id
- protocolo (numero sequencial)
- status (aguardando, em_atendimento, finalizado, abandonado)
- canal (whatsapp, instagram, telegram)
- prioridade (baixa, normal, alta, urgente)
- motivo_fechamento, avaliacao_nota, avaliacao_comentario
- tempo_primeira_resposta, tempo_total_atendimento
- data_abertura, data_primeira_resposta, data_fechamento
- transferido_de_agente_id, transferido_de_fila_id
- etiquetas (array), created_at, updated_at

**6. omni_mensagens** - Mensagens das conversas
- id, atendimento_id, contato_id, agente_id
- tipo (texto, imagem, audio, video, documento, localizacao, contato, sticker)
- direcao (entrada, saida)
- conteudo, arquivo_url, arquivo_nome, arquivo_tipo
- whatsapp_message_id, status (enviada, entregue, lida, erro)
- erro_descricao, quoted_message_id
- created_at, updated_at

**7. omni_mensagens_rapidas** - Templates de resposta
- id, clinica_id, fila_id, titulo, atalho, conteudo
- categoria, variaveis (JSON), ativo
- created_at, updated_at

**8. omni_etiquetas** - Etiquetas para contatos/atendimentos
- id, clinica_id, nome, cor, descricao
- created_at

**9. omni_pausas_tipos** - Tipos de pausa (almoco, banheiro, etc)
- id, clinica_id, nome, tempo_max_minutos
- ativo, created_at

**10. omni_agente_pausas** - Historico de pausas
- id, agente_id, tipo_pausa_id
- inicio, fim, duracao_segundos
- created_at

---

## Fase 2: Edge Functions (Supabase)

### 1. evolution-create-instance
- Cria nova instancia na Evolution API
- Configura webhook automaticamente
- Salva dados no banco

### 2. evolution-connect-instance
- Gera QR Code para conexao
- Retorna dados para exibir no frontend

### 3. evolution-disconnect-instance
- Desconecta instancia
- Atualiza status no banco

### 4. evolution-webhook
- Recebe eventos da Evolution API
- Processa mensagens recebidas
- Atualiza status de mensagens
- Dispara notificacoes em tempo real

### 5. evolution-send-message
- Envia mensagens (texto, midia, documentos)
- Suporta mensagens com variaveis

### 6. evolution-connection-status
- Verifica status da conexao

---

## Fase 3: Novas Paginas (Frontend)

### Rotas na Clinica
```text
/clinica/omnichannel              -> Dashboard Omnichannel
/clinica/omnichannel/filas        -> Gestao de Filas
/clinica/omnichannel/agentes      -> Painel de Agentes
/clinica/omnichannel/atendimentos -> Painel de Atendimentos
/clinica/omnichannel/contatos     -> Gestao de Contatos
/clinica/omnichannel/relatorios   -> Relatorios e Metricas
/clinica/omnichannel/configuracoes -> Configuracoes
```

### Componentes Principais

**1. OmniDashboard** - Visao geral
- Cards: Total atendimentos, clientes unicos, msgs enviadas/recebidas, TMA
- Grafico por hora/dia
- Atendimentos por fila/canal
- Performance dos agentes

**2. OmniFilas** - Gestao de filas
- Lista de filas com status de conexao
- Modal para criar/editar fila
- Abas: Conexao, Configuracoes, Mensagens, Webhooks
- Conexao com QR Code

**3. OmniPainelAgentes** - Monitoramento em tempo real
- Lista de agentes por fila
- Status atual (online/pausa/offline)
- Metricas: atendimentos hoje, msgs enviadas/recebidas, TMA
- Funcoes: pausar, transferir, monitorar

**4. OmniPainelAtendimentos** - Lista de atendimentos
- Filtros por status, agente, fila, periodo
- Acoes: atribuir, transferir, finalizar
- Indicadores visuais de tempo de espera

**5. OmniContatos** - CRM de contatos
- Lista paginada com busca
- Campos: nome, telefone, documento, etiquetas
- Vinculacao com pacientes do sistema
- Exportar/importar

**6. OmniChat** - Interface de atendimento (para atendentes)
- Sidebar com lista de atendimentos
- Area de mensagens
- Painel lateral com dados do contato
- Respostas rapidas, transferir, finalizar

---

## Fase 4: Sistema de Permissoes

### Novas Permissoes para usuarios_clinica
- "omnichannel_dashboard" - Ver dashboard
- "omnichannel_filas" - Gerenciar filas
- "omnichannel_agentes" - Ver painel agentes
- "omnichannel_atendimentos" - Ver todos atendimentos
- "omnichannel_contatos" - Gerenciar contatos
- "omnichannel_atender" - Realizar atendimentos
- "omnichannel_configuracoes" - Configuracoes avancadas

### Atualizacao do ClinicaUsuarios
- Adicionar checkbox para cada permissao omnichannel
- Permissoes controlam visibilidade no menu

---

## Fase 5: Integracao Realtime

### Channels Supabase
- omni_atendimentos_{clinica_id} - Novos atendimentos
- omni_mensagens_{atendimento_id} - Mensagens em tempo real
- omni_agentes_{clinica_id} - Status dos agentes
- omni_typing_{atendimento_id} - Indicador de digitacao

### Notificacoes
- Som ao receber nova mensagem
- Badge com contador no menu
- Toast para novos atendimentos

---

## Fase 6: Hooks Customizados

### useOmniChannel
- Gerenciar estado global do omnichannel
- Conectar/desconectar instancias
- Enviar mensagens

### useOmniAtendimentos
- CRUD de atendimentos
- Transferencias
- Finalizacao

### useOmniMensagens
- Buscar mensagens de um atendimento
- Enviar mensagens
- Marcar como lido

### useOmniAgentes
- Status dos agentes
- Pausas
- Distribuicao

### useOmniFilas
- CRUD de filas
- Configuracoes

---

## Ordem de Implementacao

**Sprint 1: Fundacao (Banco + Edge Functions)**
1. Criar migrations para todas as tabelas
2. Implementar edge functions da Evolution API
3. Configurar webhooks

**Sprint 2: Interface Administrativa**
1. Pagina de Filas (criar/editar/conectar)
2. Pagina de Contatos
3. Dashboard basico

**Sprint 3: Atendimento**
1. Painel de Atendimentos
2. Interface de Chat para atendentes
3. Sistema de filas e distribuicao

**Sprint 4: Monitoramento**
1. Painel de Agentes
2. Relatorios
3. Metricas em tempo real

**Sprint 5: Refinamentos**
1. Permissoes detalhadas
2. Mensagens rapidas
3. Integracao com CRM existente
4. Notificacoes push

---

## Secrets Necessarios

Serao necessarios os seguintes secrets no Supabase:
- **EVOLUTION_API_URL**: URL do servidor Evolution API
- **EVOLUTION_API_KEY**: API Key global da Evolution

---

## Consideracoes Tecnicas

### Isolamento de Dados
- Todas as tabelas terao clinica_id obrigatorio
- RLS policies para garantir isolamento
- Cada clinica gerencia suas proprias filas e instancias

### Performance
- Indexar campos de busca frequente (telefone, status, created_at)
- Paginacao em todas as listagens
- Realtime apenas para dados criticos

### Seguranca
- Webhook com validacao de origem
- Tokens de instancia hasheados no banco
- Rate limiting nas edge functions

---

## Proximo Passo

Confirme a aprovacao deste plano para iniciar a implementacao. Comecaremos pela Fase 1 (estrutura do banco de dados) e Fase 2 (edge functions), que sao a fundacao do sistema.
