
# Migração Z-API → Evolution API v2

Substituição completa. Z-API sai, Evolution v2 entra como único provedor. Histórico migrado.

## Pré-requisitos (você precisa confirmar)

1. **EVOLUTION_API_URL** e **EVOLUTION_API_KEY** já existem nos secrets ✅
2. Confirmar que esses secrets apontam pra uma instância **Evolution v2** funcional (não v1).
3. Webhook público do Supabase será registrado na Evolution — sem firewall bloqueando.

## Escopo das mudanças

### 1. Banco de dados (migration)

- Adicionar colunas em `managed_instances`:
  - `evolution_instance_name TEXT` (nome da instância na Evolution)
  - `evolution_api_key TEXT` (hash/token por instância retornado no create)
  - `provider TEXT DEFAULT 'evolution'` (flag de origem)
- Manter `external_instance_id` / `external_token` como aliases já existentes (compatibilidade outbox).
- Em `omni_mensagens`: nenhuma mudança estrutural (já é provider-agnóstico).
- Backfill: instâncias Z-API ativas marcadas `provider='zapi_legacy'` e desabilitadas (status `offline`) — usuário recria via QR Evolution.

### 2. Edge Functions — CRIAR (novas, padrão Evolution v2)

```text
supabase/functions/
├── evolution-v2-create-instance/     # POST /instance/create
├── evolution-v2-connect-instance/    # GET /instance/connect/{name} -> QR
├── evolution-v2-connection-status/   # GET /instance/connectionState/{name}
├── evolution-v2-disconnect/          # DELETE /instance/logout/{name}
├── evolution-v2-delete-instance/     # DELETE /instance/delete/{name}
├── evolution-v2-send-message/        # POST /message/sendText|sendMedia|sendWhatsAppAudio
├── evolution-v2-webhook/             # Recebe message.upsert, connection.update, etc
├── evolution-v2-sync-history/        # POST /chat/findMessages + import
└── evolution-v2-set-webhook/         # POST /webhook/set/{name} (config inicial)
```

### 3. Edge Functions — REESCREVER (mantêm nome, troca lógica)

- `process-outbox` → trocar endpoints Z-API por Evolution v2 (`/message/sendText/{instance}`, `/message/sendMedia/{instance}`, `/message/sendWhatsAppAudio/{instance}`).
- `evolution-send-message` → já tem o nome certo, vira wrapper do v2.
- `evolution-webhook` → redirecionar pro novo `evolution-v2-webhook` (compat com webhooks já cadastrados externamente).

### 4. Edge Functions — DEPRECAR/DELETAR

```text
zapi-adapter
zapi-create-instance
zapi-manage
zapi-sync-history
zapi-test-send
zapi-webhook
evolution-connect-instance        (era Z-API por dentro)
evolution-connection-status       (era Z-API)
evolution-delete-instance         (era Z-API)
evolution-delete-message          (era Z-API)
evolution-disconnect-instance     (era Z-API)
evolution-edit-message            (era Z-API)
```

Vamos manter os arquivos por 1 deploy e depois deletar, ou deletar já. Recomendo **deletar já** já que escopo é substituição total.

### 5. Frontend

- `OmniIntegracoes.tsx` — formulário de instância: remover campos Z-API (instance_id/token), adicionar campo "nome da instância" Evolution.
- `OmniWhatsAppChat.tsx`, hooks de status (`useOmniConnectionMonitor`) — trocar invocação para `evolution-v2-*`.
- `OmniAtendimentos.tsx` painel de admin — trocar botões "QR Code"/"Desconectar" pras novas funções.

### 6. Webhooks na Evolution (configuração externa)

Cada instância nova chama `evolution-v2-set-webhook` que registra:
```
URL: https://dwqceailivjjacvqzfnh.supabase.co/functions/v1/evolution-v2-webhook
Eventos: MESSAGES_UPSERT, MESSAGES_UPDATE, CONNECTION_UPDATE, CONTACTS_UPSERT, PRESENCE_UPDATE, SEND_MESSAGE
```

### 7. Migração de histórico

Script edge function `migrate-zapi-to-evolution-history`:
- Para cada instância antiga Z-API com `omni_atendimentos` ativos
- Lê contatos/atendimentos/mensagens existentes (já estão no Supabase, provider-agnóstico)
- Após usuário conectar nova instância Evolution com o mesmo número, vincula `instance_id` dos atendimentos antigos à nova instância.
- Opcional: importar últimos 30 dias da Evolution via `/chat/findMessages` pra preencher gaps.

## Ordem de execução (rollout seguro)

```text
Fase 1: DB migration (colunas evolution_*, provider)
Fase 2: Criar evolution-v2-* edge functions (paralelo, sem afetar Z-API)
Fase 3: Frontend toggle "usar Evolution" + criação de nova instância
Fase 4: Você testa: cria instância, conecta QR, envia texto, recebe texto, envia áudio, recebe áudio, envia imagem
Fase 5: Validado → script de re-vinculação de histórico
Fase 6: Deletar funções Z-API + colunas zapi_* (migration de cleanup)
```

## Riscos

- **Áudio**: Evolution v2 envia áudio como `/message/sendWhatsAppAudio` com base64 OGG/Opus — comportamento diferente do Z-API. Mesma lógica do player (Web Audio API decodeAudioData) deve funcionar.
- **Webhook payload**: estrutura `data.key.remoteJid`, `data.message.conversation`, etc — completamente diferente do Z-API. Mapeamento novo necessário.
- **IDs de mensagem**: Evolution usa `key.id` (formato Baileys), Z-API usava `messageId`. `omni_mensagens.whatsapp_message_id` aceita ambos.
- **Instâncias ativas Z-API**: vão parar de funcionar no momento do deploy. Cliente precisa reescanear QR. Recomendo aviso prévio.

## Validação por etapa

Cada fase só avança após teste manual seu na preview:
- Fase 2: `curl` nas funções novas → 200 OK
- Fase 4: ciclo completo texto + mídia + áudio + status entrega
- Fase 5: histórico antigo aparece na nova instância

## O que preciso de você antes de começar

1. Confirmar que `EVOLUTION_API_URL` aponta pra v2 (geralmente `https://seu-server.com` sem `/manager`).
2. Confirmar `EVOLUTION_API_KEY` é a **API key global** (Authorization header `apikey`), não por instância.
3. Aviso aos usuários ativos de Z-API que vão precisar reescanear.

Posso começar pela **Fase 1 (migration) + Fase 2 (edge functions novas)** num único pacote, sem tocar no que está em produção, pra você testar isolado antes de virar a chave?
