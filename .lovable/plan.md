# Integração WhatsApp Cloud API (Meta) — independente

Nova integração oficial com a API do WhatsApp da Meta, totalmente separada de qualquer conexão existente. Cada número cadastrado tem suas próprias credenciais, sua própria caixa de entrada e seu próprio histórico.

## O que será criado

### 1. Administração de números
Nova tela em **Omnichannel > WhatsApp Oficial**:
- Cadastrar, editar e remover conexões
- Campos: nome da conexão, WABA ID, Phone Number ID, token de acesso, token de verificação do webhook
- Status visual: ativo, inativo, erro
- Botão "Testar conexão" que consulta a Meta e mostra o número e o nome de exibição reais
- Endereço do webhook pronto para copiar e colar no painel da Meta

### 2. Caixa de entrada
- Lista de números conectados; ao escolher um, aparecem apenas as conversas daquele número
- Conversa em tempo real, campo de resposta, histórico completo
- Indicadores de enviado, entregue, lido e falhou
- Envio de texto, imagem, documento, áudio, vídeo e modelos (templates) aprovados

### 3. Segurança
- Tokens gravados criptografados; nunca retornam para a tela (só um trecho mascarado)
- Todas as ações administrativas exigem login
- Assinatura do webhook conferida com o App Secret
- Cada envio usa obrigatoriamente o Phone Number ID da conexão escolhida

## Detalhes técnicos

**Tabelas novas** (prefixo `wac_`, sem tocar nas tabelas omni existentes):
- `wac_conexoes` — nome, waba_id, phone_number_id, display_phone, verify_token, `access_token_enc` (criptografado), status, clinica_id
- `wac_contatos` — wa_id, nome, conexao_id
- `wac_conversas` — conexao_id, contato_id, última mensagem, não lidas, janela de 24h
- `wac_mensagens` — conversa_id, direção, tipo, conteúdo, media_url, wamid, status
- `wac_eventos` — wamid, status, timestamp, erro

RLS por `clinica_id` com as políticas e GRANTs padrão do projeto; `wac_conexoes` sem acesso direto do cliente ao token (view/coluna mascarada via função security definer).

**Edge Functions** (Graph API v21.0):
- `wac-admin` — CRUD de conexões, teste de conexão (`GET /{phone_number_id}`), rotação de token
- `wac-send` — texto, mídia (imagem/documento/áudio/vídeo) e template; resolve credenciais pela conexão
- `wac-webhook` — verificação `hub.mode`/`hub.verify_token`/`hub.challenge`, validação `X-Hub-Signature-256`, persistência de mensagens recebidas e de status de entrega, realtime para a UI

**Criptografia**: AES-GCM via Web Crypto com `STORE_ENCRYPTION_KEY`; token nunca sai do backend.

**Secrets necessários**: `META_APP_ID`, `META_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `STORE_ENCRYPTION_KEY` (pedidos na hora da implementação).

## Fora do escopo
Nenhuma alteração nas conexões e configurações já existentes do projeto.
