
# Plano de Correção: Redirecionamento de Usuários da Clínica

## Problema Identificado
A usuária "ADRIELE" (e outros funcionários da clínica) está sendo forçada para a área `/atendente` (Painel de Atendimento simplificado), quando deveria ter acesso à área completa `/clinica` onde pode escolher livremente as funcionalidades conforme suas permissões.

**Dados da usuária no banco:**
- Email: adriele@gmail.com
- Papel: secretaria  
- Permissoes: dashboard, consultas, locais, agenda, pacientes

## Causa Raiz
No arquivo `src/pages/Entrar.tsx`, linhas 128-144, todos os usuários da tabela `usuarios_clinica` são redirecionados para `/atendente`, independente do papel ou permissões.

## Correção

### 1. Modificar `src/pages/Entrar.tsx`

**Lógica atual (problemática):**
```text
Se usuário está em usuarios_clinica com clinica_id -> redireciona para /atendente
```

**Nova lógica:**
```text
Se usuário está em usuarios_clinica com clinica_id:
  - Se papel é "atendente" E tem APENAS permissões de atendimento -> /atendente
  - Caso contrário (secretaria, supervisor, admin, etc.) -> /clinica
```

Essa mudança permitirá que funcionários com permissões administrativas (secretaria, supervisor) acessem a área completa da clínica, enquanto atendentes puros continuam na área simplificada.

### 2. Verificar `src/components/clinica/ClinicaLayout.tsx`
O layout já está preparado para receber usuários de `usuarios_clinica` (verifica `currentUser.clinicaId`), então não precisa de mudanças.

### 3. Verificar `src/components/clinica/ClinicaSidebar.tsx`
Já filtra os itens do menu baseado nas permissões do usuário (`currentUser.permissoes`), então funcionará corretamente.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Entrar.tsx` | Alterar lógica de redirecionamento (linhas 128-144) |

## Detalhes Técnicos

```typescript
// ANTES (linha 131-144):
if (clinicaUserData.clinica_id) {
  // ... setCurrentUser
  navigate("/atendente");
}

// DEPOIS:
if (clinicaUserData.clinica_id) {
  // ... setCurrentUser

  // Redirecionar baseado no papel:
  // - Atendentes puros vão para /atendente
  // - Outros papéis (secretaria, supervisor, admin) vão para /clinica
  const isAtendenteOnly = 
    clinicaUserData.papel === "atendente" && 
    (!clinicaUserData.permissoes || 
     clinicaUserData.permissoes.length === 0 ||
     clinicaUserData.permissoes.every(p => 
       ['confirmacao-agenda', 'chat', 'contatos', 'atendimentos'].includes(p)
     ));

  if (isAtendenteOnly) {
    navigate("/atendente");
  } else {
    navigate("/clinica");
  }
}
```

## Resultado Esperado
- Usuária ADRIELE (secretaria) -> redireciona para `/clinica`
- Atendentes com permissões limitadas -> redireciona para `/atendente`
- Sidebar filtra itens conforme permissões de cada usuário
- Cada funcionário acessa apenas as funcionalidades permitidas

## Bugs do Omnichannel a Verificar

Também verificarei:
1. Estrutura JSX do `OmniWhatsAppChat.tsx` - Parece estar correta
2. Modal de transferência - Já suporta agentes e filas
3. Contexto de `usuarioClinicaId` - Já é passado corretamente
4. Real-time subscriptions - Implementadas localmente no componente

O principal bug é o redirecionamento incorreto. Após a correção, a usuária terá acesso completo à área da clínica incluindo o omnichannel.
