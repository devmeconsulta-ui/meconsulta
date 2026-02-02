
# Plano: Ajustes do OmniHeader e Páginas de Configuração Admin

## Resumo das Solicitações

1. **Remover botão WhatsApp do painel da clínica** - O botão só deve existir no painel do atendente
2. **Corrigir espaçamento entre OmniHeader e conteúdo** - Ajustar altura de linha
3. **Scroll apenas no conteúdo abaixo do OmniHeader** - O header deve ficar fixo
4. **Criar páginas de configuração no Admin** - API, Webhooks, Automações
5. **Remover Configurações do OmniHeader** - Tirar o ícone de configurações do header omnichannel

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/clinica/omnichannel/OmniHeader.tsx` | Remover botão WhatsApp e ícone de Configurações |
| `src/components/clinica/omnichannel/OmniLayout.tsx` | Corrigir scroll e espaçamento |
| `src/pages/admin/AdminIntegracoes.tsx` | Expandir com abas (API, Webhooks, Automações) |
| `src/App.tsx` | Não precisa alterar - já tem rota `/admin/integracoes` |

---

## Detalhes Técnicos

### 1. Remover Botão WhatsApp do OmniHeader (Painel Clínica)

**Arquivo:** `src/components/clinica/omnichannel/OmniHeader.tsx`

**Alterações:**
- Remover o bloco JSX do botão WhatsApp (linhas 104-133)
- Remover o item "Configurações" da lista `navItems` (linha 32)
- Remover a prop `atendimentosCount` pois não será mais usada
- Manter apenas os itens de navegação: Dashboard, Agentes, Chat, CRM, Contatos, Filas, Relatórios, Confirmação Agenda

**Resultado:** O header da clínica fica apenas com os ícones de navegação administrativa sem o botão de atendimento WhatsApp.

### 2. Corrigir Espaçamento e Scroll no OmniLayout

**Arquivo:** `src/components/clinica/omnichannel/OmniLayout.tsx`

**Problema:** A página inteira está rolando, incluindo o OmniHeader.

**Solução:**
```text
ANTES:
- div com min-h-[calc(100vh-8rem)] -m-4 sm:-m-6
- Header sticky mas scroll na página inteira

DEPOIS:
- Container com height fixo e overflow-hidden
- OmniHeader fixo no topo com flex-shrink-0
- Conteúdo em ScrollArea que ocupa espaço restante (flex-1 overflow-auto)
- Espaçamento superior (gap) entre header e conteúdo
```

**Código proposto:**
```tsx
return (
  <div className="flex flex-col h-[calc(100vh-8rem)] -m-4 sm:-m-6 overflow-hidden">
    {/* Header fixo do omnichannel */}
    <div className="flex-shrink-0 bg-background border-b border-border">
      <OmniHeader />
    </div>
    
    {/* Conteúdo com scroll independente e gap do header */}
    <div className="flex-1 overflow-auto p-4 sm:p-6 pt-6">
      {children}
    </div>
  </div>
);
```

### 3. Expandir AdminIntegracoes com Abas

**Arquivo:** `src/pages/admin/AdminIntegracoes.tsx`

**Estrutura atual:**
- Card de integração Asaas
- Card de integração WhatsApp (webhooks básicos)

**Nova estrutura com abas:**

```text
┌─────────────────────────────────────────────────────────────┐
│  Integrações                                                │
│  Configure as integrações do sistema                        │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│ Pagamentos  │  Webhooks    │ Automações   │  API            │
└─────────────┴──────────────┴──────────────┴─────────────────┘
```

**Aba Pagamentos (existente):**
- Configuração do Asaas (ambiente, API Key, webhook de pagamentos)

**Aba Webhooks (nova):**
- Webhooks de entrada (para receber de apps externos)
  - Endpoint: /functions/v1/external-webhook
  - Autenticação: API Key ou Token Bearer
  - Eventos recebidos: Lista de eventos suportados
  
- Webhooks de saída (para enviar para apps externos)
  - URL de destino configurável
  - Eventos: nova_consulta, consulta_confirmada, consulta_cancelada, pagamento_confirmado
  - Headers customizados
  - Retry automático (3 tentativas)
  - Log de entregas

**Aba Automações (nova):**
- Confirmação automática de consultas (WhatsApp)
- Envio de lembretes (X horas antes)
- Notificação de pagamento pendente
- Follow-up pós-consulta
- Pesquisa de satisfação

**Aba API (nova):**
- Documentação básica da API
- Geração de API Keys
- Lista de endpoints disponíveis:
  - GET /consultas
  - POST /consultas
  - GET /medicos
  - GET /pacientes
  - etc.
- Logs de requisições da API

### 4. Criar Componentes para Cada Aba

**Novos arquivos:**
- `src/components/admin/integracoes/IntegracoesPagamentos.tsx`
- `src/components/admin/integracoes/IntegracoesWebhooks.tsx`
- `src/components/admin/integracoes/IntegracoesAutomacoes.tsx`
- `src/components/admin/integracoes/IntegracoesAPI.tsx`

**Migração:**
- Mover código existente do Asaas para `IntegracoesPagamentos.tsx`
- Mover código existente do WhatsApp para `IntegracoesWebhooks.tsx`

---

## Ordem de Implementação

1. **OmniHeader.tsx** - Remover WhatsApp e Configurações
2. **OmniLayout.tsx** - Corrigir scroll e espaçamento
3. **IntegracoesPagamentos.tsx** - Extrair código do Asaas
4. **IntegracoesWebhooks.tsx** - Criar aba de webhooks expandida
5. **IntegracoesAutomacoes.tsx** - Criar aba de automações
6. **IntegracoesAPI.tsx** - Criar aba de documentação API
7. **AdminIntegracoes.tsx** - Refatorar com sistema de abas

---

## Resultado Esperado

**Painel da Clínica:**
- OmniHeader sem botão WhatsApp e sem Configurações
- Scroll apenas no conteúdo, header fixo
- Espaçamento correto entre header e conteúdo

**Painel do Atendente:**
- Mantém o chat via `/atendente/chat` (já existe e funciona)
- Sem alterações

**Painel Admin:**
- Página de Integrações com 4 abas completas
- Configuração de webhooks de entrada e saída
- Automações configuráveis
- Documentação da API com geração de chaves

