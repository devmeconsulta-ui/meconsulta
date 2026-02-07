
# Plan: Fix Omnichannel Features and Add Clinic Internal Notification System

## Overview

This plan addresses three major requirements:
1. **Fix non-functional dropdown menu items** (Search messages, View media, View documents, Transfer, Add label, End service)
2. **Review and validate omnichannel service assignment logic** (circular, random distribution per clinic queue configuration)
3. **Implement clinic-level read-only access with internal notification system** (clinic admin can view conversations but not respond - only notify agents)

---

## Part 1: Fix Non-Functional Menu Actions

### Current State
The dropdown menu in `OmniWhatsAppChat.tsx` shows placeholder toast messages like "Pesquisa de mensagens em breve!" instead of actual functionality.

### Required Changes

**1.1 Search Messages Feature**
- Add a search panel that slides in from the right side
- Allow searching message content within the last 60 days
- Highlight matching messages and scroll to them on click

**1.2 View Media (Images/Videos)**
- Create a modal that displays all media attachments from the conversation
- Filter `omni_mensagens` by `tipo` in ('imagem', 'video')
- Show thumbnails in a grid layout

**1.3 View Documents**
- Similar modal for documents
- Filter by `tipo = 'documento'`
- Show file name and download button

**1.4 Add Label Feature**
- Create a dropdown/modal to select from `omni_etiquetas`
- Update `omni_atendimentos.etiquetas` array
- Show current labels on the conversation

**1.5 Transfer and End Service**
- These buttons are already wired to modals - verify they work correctly

---

## Part 2: Validate Service Assignment Logic

### Current Architecture
- Queues (`omni_filas`) have a `estrategia_distribuicao` field supporting: `round_robin`, `aleatorio`, `menor_carga`
- Services are assigned based on queue configuration
- The `evolution-webhook` edge function handles new message routing

### Files to Review
- `useOmniFilas.ts` - Queue configuration
- `evolution-webhook` edge function - Message routing logic
- Distribution strategies implementation

### Verification Points
- Ensure circular (round_robin) rotates through agents sequentially
- Ensure random (aleatorio) picks agents randomly
- Ensure load-based (menor_carga) assigns to agent with fewest active services
- Each agent only sees services assigned to them in "Mine" tab

---

## Part 3: Clinic Read-Only Access with Internal Notification System

### Concept
Based on the reference images provided:
- Clinic admin (tipo="clinica") views conversations in read-only mode
- Instead of responding, they can send "internal information messages"
- These appear as alerts/notifications visible only to the assigned agent
- Agents see these in real-time as highlighted internal notes

### Database Changes Required
Create a new table for internal notes:

```text
+-------------------------------+
| omni_notas_internas           |
+-------------------------------+
| id (uuid, PK)                 |
| atendimento_id (uuid, FK)     |
| clinica_id (uuid, FK)         |
| criado_por_usuario_id (uuid)  |
| criado_por_nome (varchar)     |
| destinatario_agente_id (uuid) |
| mensagem (text)               |
| lida (boolean, default false) |
| created_at (timestamptz)      |
+-------------------------------+
```

### UI Components

**3.1 Insert Internal Note Modal**
- Similar to the reference image provided
- Title: "Inserir mensagem de informação"
- Subtitle: "Mensagens de informação não serão vistas pelo cliente"
- Text area for message
- Cancel and "Inserir" buttons

**3.2 Agent View - Note Alert**
- Render internal notes inline in the chat as a special "system" message
- Styled with:
  - Light blue/cyan background
  - Person icon
  - "Nome: Nome escreveu: [message]" format
  - Timestamp
- Notes should appear in real-time via Supabase Realtime

**3.3 Clinic View Mode**
- Detect if user is clinic owner (`tipo === "clinica"`)
- Hide message input area
- Show "Notificar Agente" button instead
- Display read-only conversation view

### Implementation Flow

```text
Clinic Admin Flow:
1. Opens /clinica/omnichannel/whatsapp
2. System detects tipo="clinica" (admin, not employee)
3. Chat input is replaced with "Notificar Agente" button
4. Admin clicks button -> Opens modal
5. Admin writes message -> Inserts into omni_notas_internas
6. Agent sees real-time notification alert in chat

Agent Flow:
1. Agent is viewing conversation
2. Supabase Realtime subscription on omni_notas_internas
3. New note appears as highlighted system message
4. Agent can click to mark as read
```

---

## Technical Implementation Details

### Files to Create
1. `src/components/clinica/omnichannel/NotaInternaModal.tsx` - Modal for inserting notes
2. `src/components/clinica/omnichannel/SearchMessagesPanel.tsx` - Side panel for searching
3. `src/components/clinica/omnichannel/MediaGalleryModal.tsx` - Gallery for media
4. `src/components/clinica/omnichannel/DocumentsModal.tsx` - Documents list modal
5. `src/hooks/useOmniNotasInternas.ts` - Hook for managing internal notes

### Files to Modify
1. `src/pages/clinica/omnichannel/OmniWhatsAppChat.tsx`
   - Add clinic read-only mode detection
   - Integrate all new modals
   - Add internal notes display in message list
   - Wire up menu actions

2. `src/hooks/useOmniAtendimentos.ts`
   - Add method to fetch media/documents by type
   - Add label management functions

### Database Migration
New migration to create `omni_notas_internas` table with:
- RLS policies for clinic and agent access
- Realtime enabled
- Foreign key relationships

---

## Summary of Deliverables

| Feature | Status | Action |
|---------|--------|--------|
| Search messages | Not working | Implement search panel |
| View media | Not working | Implement gallery modal |
| View documents | Not working | Implement documents modal |
| Transfer chat | Working | Verify |
| Add label | Not working | Implement label selector |
| End service | Working | Verify |
| Clinic read-only | Missing | Add detection + UI |
| Internal notes | Missing | New table + full feature |
| Service assignment | Needs review | Validate distribution logic |
