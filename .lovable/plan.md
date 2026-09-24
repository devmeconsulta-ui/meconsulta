# WhatsApp Oficial (Meta) como instância das Filas

O número oficial passa a aparecer na lista "Instância WhatsApp" das filas e as conversas dele entram no mesmo chat de atendimento do número não oficial.

## O que muda para o usuário
- No formulário **Nova Fila / Editar Fila**, a lista "Instância WhatsApp" mostra também as conexões oficiais, marcadas como "Oficial (Meta)".
- A mesma fila pode ter o número oficial e o não oficial, ou cada um pode ter sua própria fila.
- Mensagens recebidas no número oficial abrem um atendimento na fila vinculada e seguem a mesma distribuição para os agentes, com transferência, finalização e histórico.
- No chat de atendimento, cada conversa mostra um selo indicando o número por onde chegou (oficial ou não oficial).
- As respostas do agente saem pelo mesmo número por onde o paciente entrou em contato.
- A janela de 24h da Meta aparece no chat. Fora dela, o envio de texto livre fica bloqueado e só modelos aprovados podem ser enviados.

## Detalhes técnicos
- Migração: `omni_filas.wac_conexao_id` (FK opcional para `wac_conexoes`) e `omni_atendimentos.wac_conexao_id` (define o canal de saída).
- `wac-webhook`: ao receber uma mensagem, localiza a fila pela conexão, faz o upsert do contato em `omni_contatos`, reutiliza ou abre um atendimento em `omni_atendimentos` e grava a mensagem em `omni_mensagens` (a mensagem continua sendo gravada também em `wac_mensagens`). Os status de entrega atualizam `omni_mensagens` pelo `whatsapp_message_id`.
- Envio: `evolution-send-message` detecta `wac_conexao_id` no atendimento e delega ao `wac-send`. O gatilho `enqueue_agent_message` ignora atendimentos oficiais, para não haver envio duplicado.
- IA: `omni-ai-respond` passa a ser chamada também para atendimentos oficiais quando a fila tem IA ativa, e as respostas saem pelo `wac-send`.
- Frontend: `useOmniFilas` e `OmniFilas.tsx` listam as conexões oficiais no seletor. `OmniWhatsAppChat` ganha o selo de canal e o aviso da janela de 24h.

## Fora do escopo
Nenhuma mudança nas instâncias Evolution existentes.
