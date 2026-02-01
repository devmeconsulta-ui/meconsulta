

# Plano de Correção de Bugs - Sistema MeConsulta

## Resumo Executivo
Após uma varredura completa no sistema, identifiquei diversos bugs críticos que estão causando problemas de navegação, loops infinitos, erros de contexto e inconsistências na área do Omnichannel e usuários da clínica.

---

## Bugs Identificados

### 1. OmniWhatsAppChat.tsx - Estrutura HTML Quebrada
**Problema**: O arquivo tem uma estrutura de divs incorreta após as últimas edições, causando problemas de renderização e potenciais loops.
- Linha 388: `<div className="w-80...">` está com indentação incorreta
- A estrutura do JSX não está balanceada corretamente
- Faltam fechamentos de tags em alguns pontos

### 2. OmniAtendimentos.tsx - useState usado incorretamente
**Problema**: Na linha 96-130, `useState` está sendo usado como função para carregar dados iniciais, mas sem retorno correto (deveria ser `useEffect`).
```typescript
// ERRADO - Linha 96
useState(() => {
  const loadAgentes = async () => { ... };
  loadAgentes();
});
```

### 3. AtendenteChat.tsx - Lista de agentes não carregada
**Problema**: O array `agentes` é declarado mas nunca preenchido, causando erro no modal de transferência.
```typescript
const [agentes, setAgentes] = useState<Array<{ id: string; nome: string }>>([]);
// Nunca é populado - modal TransferirAtendimentoModal recebe array vazio
```

### 4. ClinicaChat.tsx - OmniHeader sem props necessárias
**Problema**: O componente `ClinicaChat` renderiza `OmniHeader` sem passar a prop `atendimentosCount`, causando inconsistência.

### 5. OmniLayout.tsx - Possível conflito de hooks
**Problema**: O hook `useOmniAtendimentos` é chamado diretamente no layout, podendo causar re-renders desnecessários em todas as páginas filhas.

### 6. OmniHeader.tsx - Badge sempre oculto em algumas rotas
**Problema**: O badge do WhatsApp só mostra contagem quando recebe props, mas algumas páginas usam OmniLayout sem contexto adequado.

### 7. Context Types Inconsistentes
**Problema**: O tipo `ClinicaContext` está definido de forma diferente em vários arquivos:
- `OmniWhatsAppChat.tsx` inclui `usuarioClinicaId`
- `OmniAgentes.tsx` não inclui
- `OmniContatos.tsx` não inclui
- Isso causa erros de runtime quando propriedades são acessadas

### 8. TransferirAtendimentoModal - Filas não utilizadas
**Problema**: O modal recebe `filas` como prop mas não oferece opção de transferir para fila (apenas para agentes).

### 9. Envio de mensagem com agenteId incorreto
**Problema**: Em `OmniWhatsAppChat.tsx`, linha 304, usa `currentUser?.usuarioClinicaId` que pode não estar definido corretamente no contexto.

### 10. Real-time subscriptions duplicadas
**Problema**: Múltiplas páginas criam subscriptions para a mesma tabela `omni_atendimentos`, causando processamento desnecessário.

---

## Plano de Correção

### Fase 1: Correções Estruturais Críticas

**1.1. Corrigir OmniWhatsAppChat.tsx**
- Reorganizar estrutura HTML/JSX
- Garantir fechamento correto de todas as divs
- Verificar se o layout fullscreen está funcionando

**1.2. Corrigir OmniAtendimentos.tsx**
- Substituir `useState` incorreto por `useEffect` para carregar agentes
- Adicionar lógica de cleanup adequada

**1.3. Corrigir AtendenteChat.tsx**
- Adicionar `useEffect` para carregar lista de agentes
- Usar o mesmo padrão de OmniWhatsAppChat para buscar `usuarios_clinica`

### Fase 2: Padronização de Contextos

**2.1. Criar tipo ClinicaContext padronizado**
- Definir interface única em arquivo compartilhado
- Incluir todas as propriedades necessárias: `clinicaData`, `currentUser`, `usuarioClinicaId`

**2.2. Atualizar ClinicaLayout.tsx**
- Buscar `usuarioClinicaId` do usuário atual
- Passar no Outlet context para todas as páginas filhas

### Fase 3: Otimização de Real-time

**3.1. Centralizar subscriptions no OmniLayout**
- Mover lógica de subscription para um hook compartilhado
- Evitar múltiplas subscriptions para mesmos dados

**3.2. Implementar cache de atendimentos**
- Usar React Query para gerenciar estado de atendimentos
- Reduzir re-fetches desnecessários

### Fase 4: Correções de UI/UX

**4.1. TransferirAtendimentoModal**
- Adicionar tabs para escolher entre transferir para agente ou para fila
- Implementar lógica de transferência para fila

**4.2. ClinicaChat OmniHeader**
- Passar contagem correta de atendimentos
- Usar hook ou fetch local para obter contagem

---

## Detalhes Técnicos

### Correção 1: OmniWhatsAppChat.tsx
```text
1. Verificar estrutura JSX e corrigir indentação
2. Garantir que todas as divs estejam corretamente fechadas
3. Verificar se o context está acessível
```

### Correção 2: OmniAtendimentos.tsx (useState -> useEffect)
```text
Linha 96-130: Trocar useState(() => {...}) por useEffect(() => {...}, [clinicaId])
```

### Correção 3: AtendenteChat.tsx (carregar agentes)
```text
Adicionar useEffect para buscar agentes de usuarios_clinica
Usar mesma lógica do OmniWhatsAppChat.tsx linhas 289-301
```

### Correção 4: ClinicaLayout.tsx (adicionar usuarioClinicaId)
```text
1. Buscar usuarios_clinica pelo email do currentUser
2. Adicionar usuarioClinicaId ao context do Outlet
```

### Correção 5: ClinicaChat.tsx (OmniHeader com props)
```text
1. Usar useOmniAtendimentos para obter contagem
2. Ou buscar via fetch local com supabase
3. Passar atendimentosCount para OmniHeader
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Correção |
|---------|------------------|
| `src/pages/clinica/omnichannel/OmniWhatsAppChat.tsx` | Estrutura JSX, context |
| `src/pages/clinica/omnichannel/OmniAtendimentos.tsx` | useState -> useEffect |
| `src/pages/atendente/AtendenteChat.tsx` | Carregar agentes |
| `src/components/clinica/ClinicaLayout.tsx` | Adicionar usuarioClinicaId |
| `src/pages/clinica/ClinicaChat.tsx` | Passar props para OmniHeader |
| `src/components/clinica/omnichannel/atendimentos/TransferirAtendimentoModal.tsx` | Adicionar opção de transferir para fila |

---

## Ordem de Execução

1. **OmniAtendimentos.tsx** - Correção crítica de useState
2. **AtendenteChat.tsx** - Carregar agentes para modal
3. **ClinicaLayout.tsx** - Adicionar usuarioClinicaId ao contexto
4. **OmniWhatsAppChat.tsx** - Verificar estrutura e usar contexto corretamente
5. **ClinicaChat.tsx** - Passar contagem de atendimentos para OmniHeader
6. **TransferirAtendimentoModal.tsx** - Adicionar opção de transferir para fila

---

## Resultado Esperado

Após as correções:
- Navegação do Omnichannel funcionando sem loops
- Modal de transferência funcionando em todas as páginas
- WhatsApp Chat abrindo e carregando dados corretamente
- Contexto do usuário disponível em todas as páginas da clínica
- Real-time updates funcionando de forma otimizada
- Área do atendente com todas as funcionalidades operacionais

