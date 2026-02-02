
# Plano de Otimização do Omnichannel

## Visão Geral

Este plano aborda todas as melhorias solicitadas para o sistema de Omnichannel, baseado na análise do código existente e nas referências visuais fornecidas.

## Problemas Identificados e Soluções

### 1. Lógica de Permissão Admin vs Usuário Clínica

**Problema**: Não existe diferenciação clara entre a visualização do Admin (somente leitura) e a do usuário da clínica (pode responder).

**Solução**: 
- A área Admin (`/admin`) NÃO possui rotas para o Omnichannel - isso está correto
- A área da Clínica (`/clinica/omnichannel/whatsapp`) permite responder - isso está correto
- Apenas adicionar o `VisualizarConversaModal` para histórico de conversas finalizadas com modo somente leitura

### 2. Otimização do Envio de Mensagem (Enter/Click Lento)

**Problema**: O `handleSendMessage` está usando `await` para enviar mensagem, bloqueando a UI.

**Solução em `OmniWhatsAppChat.tsx` e `AtendenteChat.tsx`**:
- Adicionar optimistic UI update (mostrar mensagem imediatamente antes da confirmação)
- Usar estado `sending` corretamente para evitar duplo envio
- Limpar input imediatamente após envio (antes do await)
- Adicionar `useRef` para input com foco automático

### 3. Encerrar Atendimento com Reabertura Agendada

**Problema**: Ao encerrar atendimento, não há opção de agendar reabertura.

**Solução**:
- Criar modal `EncerrarAtendimentoModal.tsx` com opções:
  - Encerrar definitivamente
  - Encerrar com mensagem pré-definida
  - Agendar reabertura (data/hora + mensagem automática)
- Adicionar campos na tabela `omni_atendimentos`:
  - `data_reabertura` - Data/hora para reabrir
  - `mensagem_reabertura` - Mensagem a ser enviada
  - `reabertura_agendada` - Boolean

### 4. Remover Atendimentos Finalizados da Lista Lateral

**Problema**: Atendimentos encerrados devem sumir da lista e ir para histórico.

**Solução**:
- Já está correto! O filtro usa `status: ["aguardando", "em_atendimento"]`
- Ao finalizar, o `setSelectedAtendimento(null)` já deseleciona
- O fetch automático via real-time já remove da lista

### 5. Funcionalidades Extras (Baseadas nos Prints)

#### 5.1. Barra de Ferramentas do Chat (Ícones na Área de Input)
**Referência**: Print 1 mostra ícones: Emoji, Anexar, Resposta Rápida, Assinatura

**Adicionar em `OmniWhatsAppChat.tsx` e `AtendenteChat.tsx`**:
- Ícone de Emoji (já existe)
- Ícone de Anexar arquivo (já existe)
- Ícone de Respostas Rápidas (novo - modal com templates)
- Ícone de Assinatura (toggle para incluir assinatura automática)

#### 5.2. Menu de Ações do Header (Três Pontos)
**Referência**: Prints 4-5 mostram opções: Transferir chat, Encerrar chat, Mídias, Pesquisar

**Adicionar dropdown com**:
- Pesquisar mensagens (últimos 60 dias)
- Ver mídias compartilhadas
- Transferir chat
- Encerrar atendimento
- Oportunidades associadas (CRM)
- Etiquetas do contato

#### 5.3. Busca de Mensagens Anteriores
**Referência**: Print 2-3 mostra painel lateral de busca

**Adicionar**:
- Botão de lupa no header
- Painel lateral que busca em `omni_mensagens` dos últimos 60 dias
- Filtra por atendimentos do mesmo contato

#### 5.4. Assinatura Automática
**Referência**: Print 6 mostra tooltip "Assinatura habilitada"

**Implementar**:
- Toggle de assinatura por agente
- Assinatura anexada automaticamente ao final das mensagens de saída
- Configuração em `omni_agentes.assinatura_texto`

### 6. Transferência de Atendimento

**Status**: Já implementado corretamente com modal de tabs (Agentes/Filas)

**Verificar**:
- Modal `TransferirAtendimentoModal.tsx` - OK
- Função `handleTransferirAtendimento` - OK
- Atualiza `agente_id`, `fila_id`, `status` - OK

---

## Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `src/pages/clinica/omnichannel/OmniWhatsAppChat.tsx` | Otimizar envio, adicionar menu expandido, busca de mensagens |
| `src/pages/atendente/AtendenteChat.tsx` | Otimizar envio, adicionar ferramentas do chat |
| `src/hooks/useOmniAtendimentos.ts` | Adicionar suporte a reabertura agendada |
| `src/components/clinica/omnichannel/atendimentos/EncerrarAtendimentoModal.tsx` | NOVO - Modal de encerramento com opções |
| `src/pages/clinica/omnichannel/OmniRelatorios.tsx` | Buscar atendimentos com reabertura agendada |

---

## Detalhes Técnicos

### Correção 1: Otimizar Envio de Mensagem

```text
Arquivo: OmniWhatsAppChat.tsx (linhas 303-319)

ANTES:
- await enviarMensagem(...)
- setMessageInput("") // Depois do await

DEPOIS:
- setMessageInput("") // Limpar imediatamente
- Adicionar mensagem "fake" otimista ao estado local
- await enviarMensagem(...)
- Real-time atualiza com mensagem real
```

### Correção 2: Adicionar Menu Expandido no Header

```text
Arquivo: OmniWhatsAppChat.tsx (linhas 503-514)

Adicionar DropdownMenu com:
- DropdownMenuItem: Pesquisar mensagens
- DropdownMenuItem: Ver mídias
- DropdownMenuItem: Transferir chat (já existe botão, adicionar aqui também)
- DropdownMenuItem: Encerrar atendimento (abre modal com opções)
- DropdownMenuSeparator
- DropdownMenuItem: Adicionar etiqueta
- DropdownMenuItem: Ver oportunidades (CRM)
```

### Correção 3: Criar Modal de Encerramento

```text
NOVO ARQUIVO: src/components/clinica/omnichannel/atendimentos/EncerrarAtendimentoModal.tsx

Props:
- open: boolean
- onClose: () => void
- atendimento: OmniAtendimento
- onEncerrar: (motivo: string, reaberturaData?: Date, mensagemReabertura?: string) => Promise<void>

UI:
- RadioGroup: 
  - Encerrar definitivamente
  - Encerrar e agendar reabertura
- Se agendar reabertura:
  - DateTimePicker para data/hora
  - Textarea para mensagem de reabertura
- Select de motivo de encerramento (problema resolvido, cliente não respondeu, etc.)
- Botão Confirmar
```

### Correção 4: Adicionar Painel de Busca

```text
Arquivo: OmniWhatsAppChat.tsx

Estado novo:
- const [searchPanelOpen, setSearchPanelOpen] = useState(false)
- const [searchMessagesQuery, setSearchMessagesQuery] = useState("")
- const [searchResults, setSearchResults] = useState<OmniMensagem[]>([])

UI: Painel lateral que aparece sobre o chat
- Input de busca
- Lista de resultados com preview de mensagem
- Clique navega para a mensagem (scroll)
```

### Correção 5: Adicionar Indicador de Assinatura

```text
Arquivo: OmniWhatsAppChat.tsx

Novo ícone na barra de input:
- PenLine icon com tooltip
- Toggle que adiciona assinatura ao final das mensagens
- Tooltip: "Desabilitar a assinatura funciona apenas para uma única mensagem"
```

---

## Ordem de Implementação

1. **Otimizar envio de mensagem** - Crítico para UX
2. **Menu expandido no header** - Agrupa funcionalidades
3. **Modal de encerramento com reabertura** - Nova funcionalidade
4. **Painel de busca de mensagens** - Melhoria de produtividade
5. **Toggle de assinatura** - Funcionalidade adicional

---

## Resultado Esperado

Após as correções:
- Envio de mensagem instantâneo (sem delay perceptível)
- Menu de ações completo no header do chat
- Opção de agendar reabertura ao encerrar
- Atendimentos finalizados saem da lista lateral automaticamente
- Busca de mensagens anteriores funcionando
- Toggle de assinatura automática
- Todas as funcionalidades mostradas nos prints disponíveis
