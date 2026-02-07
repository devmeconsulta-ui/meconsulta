

# Varredura de Seguranca LGPD/Compliance e Integracoes Criticas

## Resumo Executivo

Esta auditoria identificou **vulnerabilidades criticas** que comprometem a conformidade LGPD e a seguranca das integracoes com Supabase, APIs de pagamento (Asaas), WhatsApp (Evolution API) e IA (Lovable AI Gateway).

---

## 1. VULNERABILIDADES CRITICAS IDENTIFICADAS

### 1.1 Violacoes LGPD - Nivel Critico

| Vulnerabilidade | Impacto LGPD | Status |
|-----------------|--------------|--------|
| Senhas em texto plano no banco | Art. 46 - Falha em medidas de seguranca | CRITICO |
| Chave API Asaas exposta no banco | Art. 46 - Dados financeiros vulneraveis | CRITICO |
| RLS desabilitado/permissivo em 70+ tabelas | Art. 46 - Acesso irrestrito a dados sensiveis | CRITICO |
| Ausencia de logs de auditoria LGPD | Art. 37 - Sem rastreabilidade | ALTO |
| Ausencia de registro de consentimentos | Art. 7, 8 - Sem base legal documentada | ALTO |

### 1.2 Dados Pessoais Expostos

**Tabelas Criticas Sem Protecao Adequada:**

```text
+---------------------+----------------------------------+------------------+
| Tabela              | Dados Sensiveis                  | RLS Status       |
+---------------------+----------------------------------+------------------+
| pacientes           | Nome, CPF, telefone, endereco    | USING(true)      |
| usuarios            | Email, senhas em texto plano     | USING(true)      |
| medicos             | CPF, dados bancarios, PIX        | USING(true)      |
| consultas           | Historico medico, pagamentos     | USING(true)      |
| anamneses           | Historico clinico completo       | USING(true)      |
| prescricoes_docs    | Receitas, atestados              | RLS DESABILITADO |
| omni_contatos       | Telefones, CPF, Instagram        | USING(true)      |
| config_asaas        | API Key de producao exposta      | USING(true)      |
+---------------------+----------------------------------+------------------+
```

### 1.3 Senhas em Texto Plano - Evidencia Coletada

```sql
-- Consulta executada revelou:
admin@meconsulta.app.br    -> senha_hash: "123456"
clinicateste@gmail.com     -> senha_hash: "123456"
paciente@meconsulta.app.br -> senha_hash: "123456"
```

**Problema:** Campo `senha_hash` contem senhas em texto plano, nao hashes bcrypt.

### 1.4 API Key Asaas Exposta

```sql
-- Chave de producao exposta no banco publico:
api_key: "$aact_prod_000MzkwODA2MWY2OGM3..."
ambiente: "producao"
```

**Risco:** Qualquer usuario pode ler essa chave e criar cobrancas fraudulentas.

---

## 2. ANALISE DAS INTEGRACOES

### 2.1 Supabase - Problemas de RLS

**Linter identificou 70 problemas:**
- 1 tabela com RLS desabilitado mas com policies (`prescricoes_documentos`)
- 1 tabela completamente sem RLS (`prescricoes_documentos`)
- 67+ policies usando `USING(true)` ou `WITH CHECK(true)`

**Funcoes de Helper ja existentes (podem ser aproveitadas):**
- `is_admin_user(_user_id uuid)`
- `get_user_clinica_id(_user_id uuid)`
- `user_belongs_to_clinica(_user_id, _clinica_id)`
- `has_role(_user_id uuid, _role app_role)`

### 2.2 APIs de Pagamento (Asaas)

| Arquivo | Conformidade | Problemas |
|---------|--------------|-----------|
| `create-asaas-payment` | Parcial | Logs CPF na busca de cliente |
| `process-card-payment` | Boa | Nao loga dados sensiveis |
| `asaas-webhook` | Boa | Logs minimizados |
| `transfer-to-doctor` | Parcial | Logs PIX key em producao |

**Problema Principal:** API Key armazenada em tabela publica ao inves de Secrets.

### 2.3 WhatsApp (Evolution API)

| Arquivo | Problemas LGPD |
|---------|----------------|
| `evolution-webhook` | Logs telefone do cliente |
| `evolution-send-message` | Mensagens salvas sem criptografia |
| `send-confirmation-batch` | Dados paciente em logs |

**Conformidade:** Parcial - dados de conversas armazenados sem criptografia at-rest.

### 2.4 IA (Lovable AI Gateway)

| Aspecto | Status |
|---------|--------|
| API Key segura (LOVABLE_API_KEY) | OK - em secrets |
| Dados enviados para IA | RISCO - inclui nome e telefone do contato |
| Historico de conversas | RISCO - armazenado sem anonimizacao |

---

## 3. GAPS DE CONFORMIDADE LGPD

### 3.1 Ausencias Criticas

| Requisito LGPD | Status | Solucao |
|----------------|--------|---------|
| Registro de Consentimentos (Art. 7, 8) | AUSENTE | Criar tabela `lgpd_consentimentos` |
| Log de Acessos a Dados (Art. 37) | AUSENTE | Criar tabela `lgpd_audit_logs` |
| Direito ao Esquecimento (Art. 18) | AUSENTE | Criar funcao de anonimizacao |
| Portabilidade (Art. 18) | PARCIAL | Implementar export de dados |
| Notificacao de Breach (Art. 48) | AUSENTE | Criar procedimento |
| DPO/Encarregado (Art. 41) | PARCIAL | So informacao na pagina |

### 3.2 Cookie Consent - Implementado mas Incompleto

**Existente:**
- Banner de cookies com aceitar/recusar
- Link para politica de privacidade

**Faltando:**
- Granularidade por categoria (essenciais, analiticos, marketing)
- Registro do consentimento no banco
- Opcao de revogar posteriormente

---

## 4. PLANO DE CORRECAO

### Fase 1 - Emergencial (Imediato)

#### 1.1 Migrar Senhas para Bcrypt
```typescript
// Para cada usuario com senha em texto plano:
const hash = await bcrypt.hash(senha_texto, 12);
await supabase.from('usuarios').update({ senha_hash: hash }).eq('id', id);
```

#### 1.2 Mover API Key Asaas para Secrets
- Adicionar `ASAAS_API_KEY` em Supabase Secrets
- Remover coluna `api_key` da tabela `config_asaas`
- Atualizar edge functions para usar `Deno.env.get("ASAAS_API_KEY")`

#### 1.3 Habilitar RLS em prescricoes_documentos
```sql
ALTER TABLE prescricoes_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medicos veem docs que criaram" ON prescricoes_documentos
  FOR SELECT USING (medico_id IN (SELECT id FROM medicos WHERE usuario_id = auth.uid()));
```

### Fase 2 - Compliance LGPD (1-2 semanas)

#### 2.1 Criar Estrutura de Auditoria
```sql
-- Tabela de consentimentos
CREATE TABLE lgpd_consentimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  tipo TEXT NOT NULL, -- 'cookies', 'marketing', 'dados_saude'
  aceito BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  revogado_em TIMESTAMPTZ
);

-- Tabela de audit logs
CREATE TABLE lgpd_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  acao TEXT NOT NULL, -- 'visualizou', 'editou', 'exportou', 'excluiu'
  tabela TEXT NOT NULL,
  registro_id TEXT,
  dados_acessados JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.2 Implementar Direito ao Esquecimento
```sql
CREATE OR REPLACE FUNCTION anonimizar_paciente(paciente_uuid UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pacientes SET
    nome = 'ANONIMIZADO',
    cpf = NULL,
    telefone = NULL,
    data_nascimento = NULL,
    endereco = NULL,
    anonimizado = true,
    anonimizado_em = now()
  WHERE id = paciente_uuid;
  
  -- Log da acao
  INSERT INTO lgpd_audit_logs (usuario_id, acao, tabela, registro_id)
  VALUES (auth.uid(), 'anonimizou', 'pacientes', paciente_uuid::text);
END;
$$;
```

#### 2.3 Atualizar Cookie Consent
```typescript
// Adicionar granularidade e persistencia no banco
interface CookieConsent {
  essential: true; // sempre obrigatorio
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  ip: string;
}
```

### Fase 3 - Hardening de Seguranca (2-4 semanas)

#### 3.1 RLS por Papel/Role
```sql
-- Pacientes veem apenas seus dados
CREATE POLICY "pacientes_select_own" ON pacientes
  FOR SELECT USING (usuario_id = auth.uid());

-- Medicos veem pacientes de suas consultas
CREATE POLICY "medicos_select_patients" ON pacientes
  FOR SELECT USING (
    id IN (SELECT paciente_id FROM consultas 
           WHERE medico_id IN (SELECT id FROM medicos WHERE usuario_id = auth.uid()))
  );

-- Clinicas veem pacientes de suas consultas
CREATE POLICY "clinicas_select_patients" ON pacientes
  FOR SELECT USING (
    id IN (SELECT paciente_id FROM consultas 
           WHERE clinica_id IN (SELECT id FROM clinicas WHERE usuario_id = auth.uid()))
  );
```

#### 3.2 Remover Logs de Dados Sensiveis

**Arquivos a modificar:**
- `evolution-webhook/index.ts` - Remover logs de telefone
- `create-asaas-payment/index.ts` - Remover log de busca por CPF
- `transfer-to-doctor/index.ts` - Mascarar PIX key nos logs

```typescript
// Antes:
console.log(`Looking for contact with telefone: ${telefone}`);

// Depois:
console.log(`Looking for contact with telefone: ***${telefone.slice(-4)}`);
```

#### 3.3 Migracao para Supabase Auth

**Recomendacao de longo prazo:** Migrar de autenticacao customizada (tabela `usuarios`) para Supabase Auth nativo, eliminando:
- Armazenamento de senhas no banco
- Fallbacks de RLS com `OR true`
- Verificacao de senha legada em texto plano

---

## 5. LISTA DE ARQUIVOS A MODIFICAR

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/create-asaas-payment/index.ts` | Usar ASAAS_API_KEY de secrets |
| `supabase/functions/process-card-payment/index.ts` | Usar ASAAS_API_KEY de secrets |
| `supabase/functions/transfer-to-doctor/index.ts` | Usar ASAAS_API_KEY, mascarar logs PIX |
| `supabase/functions/asaas-webhook/index.ts` | Usar ASAAS_API_KEY de secrets |
| `supabase/functions/evolution-webhook/index.ts` | Mascarar telefone nos logs |
| `supabase/functions/send-confirmation-batch/index.ts` | Mascarar dados paciente |
| `supabase/functions/omni-ai-respond/index.ts` | Nao enviar telefone para IA |
| `src/components/CookieConsent.tsx` | Adicionar granularidade |
| Nova migration SQL | Criar tabelas LGPD + corrigir RLS |

---

## 6. RECOMENDACOES ADICIONAIS

### 6.1 Seguranca de Producao
- Implementar rate limiting em todas edge functions
- Adicionar validacao de webhook signature para Asaas
- Configurar alertas de acesso anomalo
- Backup criptografado de dados sensiveis

### 6.2 Compliance Continuo
- Revisao trimestral de RLS policies
- Treinamento de equipe sobre LGPD
- Testes de penetracao periodicos
- Documentar fluxos de dados pessoais (ROPA)

### 6.3 Prioridade de Implementacao
1. **URGENTE (24h):** Migrar senhas para bcrypt, mover API Asaas para secrets
2. **CRITICO (1 semana):** Corrigir RLS em tabelas de dados sensiveis
3. **IMPORTANTE (2 semanas):** Criar estrutura de auditoria LGPD
4. **PLANEJADO (1 mes):** Migrar para Supabase Auth

