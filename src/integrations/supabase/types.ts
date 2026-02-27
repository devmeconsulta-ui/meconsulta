export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agenda_slots: {
        Row: {
          created_at: string | null
          data_hora: string
          disponivel: boolean | null
          hora_chegada: string | null
          id: string
          local_id: string
          medico_id: string
          ordem_chegada: number | null
          tipo_slot: string | null
        }
        Insert: {
          created_at?: string | null
          data_hora: string
          disponivel?: boolean | null
          hora_chegada?: string | null
          id?: string
          local_id: string
          medico_id: string
          ordem_chegada?: number | null
          tipo_slot?: string | null
        }
        Update: {
          created_at?: string | null
          data_hora?: string
          disponivel?: boolean | null
          hora_chegada?: string | null
          id?: string
          local_id?: string
          medico_id?: string
          ordem_chegada?: number | null
          tipo_slot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_slots_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_slots_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_presence: {
        Row: {
          clinica_id: string
          created_at: string
          id: string
          last_seen: string
          status: string
          usuario_clinica_id: string
        }
        Insert: {
          clinica_id: string
          created_at?: string
          id?: string
          last_seen?: string
          status?: string
          usuario_clinica_id: string
        }
        Update: {
          clinica_id?: string
          created_at?: string
          id?: string
          last_seen?: string
          status?: string
          usuario_clinica_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_presence_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_presence_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: true
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      anamneses: {
        Row: {
          antecedentes_familiares: string | null
          antecedentes_pessoais: string | null
          conduta: string | null
          consulta_id: string | null
          created_at: string | null
          exame_fisico: string | null
          hipotese_diagnostica: string | null
          historia_doenca_atual: string | null
          id: string
          medico_id: string
          observacoes: string | null
          paciente_id: string
          queixa_principal: string | null
          updated_at: string | null
        }
        Insert: {
          antecedentes_familiares?: string | null
          antecedentes_pessoais?: string | null
          conduta?: string | null
          consulta_id?: string | null
          created_at?: string | null
          exame_fisico?: string | null
          hipotese_diagnostica?: string | null
          historia_doenca_atual?: string | null
          id?: string
          medico_id: string
          observacoes?: string | null
          paciente_id: string
          queixa_principal?: string | null
          updated_at?: string | null
        }
        Update: {
          antecedentes_familiares?: string | null
          antecedentes_pessoais?: string | null
          conduta?: string | null
          consulta_id?: string | null
          created_at?: string | null
          exame_fisico?: string | null
          hipotese_diagnostica?: string | null
          historia_doenca_atual?: string | null
          id?: string
          medico_id?: string
          observacoes?: string | null
          paciente_id?: string
          queixa_principal?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_medico: {
        Row: {
          aprovada_admin: boolean | null
          comentario: string | null
          consulta_id: string | null
          created_at: string | null
          id: string
          medico_id: string
          nota: number
          paciente_id: string
          resposta_medico: string | null
        }
        Insert: {
          aprovada_admin?: boolean | null
          comentario?: string | null
          consulta_id?: string | null
          created_at?: string | null
          id?: string
          medico_id: string
          nota: number
          paciente_id: string
          resposta_medico?: string | null
        }
        Update: {
          aprovada_admin?: boolean | null
          comentario?: string | null
          consulta_id?: string | null
          created_at?: string | null
          id?: string
          medico_id?: string
          nota?: number
          paciente_id?: string
          resposta_medico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_medico_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_medico_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_movimentos: {
        Row: {
          clinica_id: string
          created_at: string
          descricao: string
          forma_pagamento: string | null
          id: string
          operacao_abertura_id: string | null
          tipo: string
          usuario_clinica_id: string | null
          valor: number
        }
        Insert: {
          clinica_id: string
          created_at?: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          operacao_abertura_id?: string | null
          tipo: string
          usuario_clinica_id?: string | null
          valor: number
        }
        Update: {
          clinica_id?: string
          created_at?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          operacao_abertura_id?: string | null
          tipo?: string
          usuario_clinica_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_operacao_abertura_id_fkey"
            columns: ["operacao_abertura_id"]
            isOneToOne: false
            referencedRelation: "caixa_operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_operacoes: {
        Row: {
          clinica_id: string
          created_at: string
          id: string
          observacoes: string | null
          saldo_final: number | null
          saldo_inicial: number | null
          tipo: string
          usuario_clinica_id: string | null
        }
        Insert: {
          clinica_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          saldo_final?: number | null
          saldo_inicial?: number | null
          tipo: string
          usuario_clinica_id?: string | null
        }
        Update: {
          clinica_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          saldo_final?: number | null
          saldo_inicial?: number | null
          tipo?: string
          usuario_clinica_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caixa_operacoes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_operacoes_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean | null
          clinica_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          clinica_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversas: {
        Row: {
          clinica_id: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          clinica_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          clinica_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens: {
        Row: {
          arquivo_nome: string | null
          arquivo_tipo: string | null
          arquivo_url: string | null
          conteudo: string | null
          conversa_id: string
          created_at: string | null
          id: string
          lida: boolean | null
          remetente_medico_id: string | null
          remetente_usuario_clinica_id: string | null
          remetente_usuario_id: string | null
          tipo_mensagem: string
          tipo_remetente: string
          updated_at: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          conteudo?: string | null
          conversa_id: string
          created_at?: string | null
          id?: string
          lida?: boolean | null
          remetente_medico_id?: string | null
          remetente_usuario_clinica_id?: string | null
          remetente_usuario_id?: string | null
          tipo_mensagem?: string
          tipo_remetente: string
          updated_at?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          conteudo?: string | null
          conversa_id?: string
          created_at?: string | null
          id?: string
          lida?: boolean | null
          remetente_medico_id?: string | null
          remetente_usuario_clinica_id?: string | null
          remetente_usuario_id?: string | null
          tipo_mensagem?: string
          tipo_remetente?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_remetente_medico_id_fkey"
            columns: ["remetente_medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_remetente_usuario_clinica_id_fkey"
            columns: ["remetente_usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_remetente_usuario_id_fkey"
            columns: ["remetente_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens_reacoes: {
        Row: {
          created_at: string
          emoji: string
          id: string
          medico_id: string | null
          mensagem_id: string
          tipo_usuario: string
          usuario_clinica_id: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          medico_id?: string | null
          mensagem_id: string
          tipo_usuario: string
          usuario_clinica_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          medico_id?: string | null
          mensagem_id?: string
          tipo_usuario?: string
          usuario_clinica_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_reacoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_reacoes_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "chat_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_reacoes_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_reacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participantes: {
        Row: {
          arquivada: boolean | null
          conversa_id: string
          created_at: string | null
          fixada: boolean | null
          id: string
          medico_id: string | null
          tipo_participante: string
          ultima_leitura: string | null
          usuario_clinica_id: string | null
          usuario_id: string | null
        }
        Insert: {
          arquivada?: boolean | null
          conversa_id: string
          created_at?: string | null
          fixada?: boolean | null
          id?: string
          medico_id?: string | null
          tipo_participante: string
          ultima_leitura?: string | null
          usuario_clinica_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          arquivada?: boolean | null
          conversa_id?: string
          created_at?: string | null
          fixada?: boolean | null
          id?: string
          medico_id?: string | null
          tipo_participante?: string
          ultima_leitura?: string | null
          usuario_clinica_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_participantes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participantes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participantes_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clinica_notificacoes: {
        Row: {
          categoria: string
          clinica_id: string
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          referencia_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          categoria?: string
          clinica_id: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          referencia_id?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          categoria?: string
          clinica_id?: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          referencia_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinica_notificacoes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco_codigo: string | null
          banco_nome: string | null
          cidade: string | null
          cnpj: string | null
          conta: string | null
          created_at: string | null
          email_contato: string | null
          endereco_principal: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          pix_key: string | null
          pix_key_type: string | null
          razao_social: string | null
          telefone: string | null
          tipo_conta: string | null
          titular_cpf_cnpj: string | null
          titular_nome: string | null
          usuario_id: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          created_at?: string | null
          email_contato?: string | null
          endereco_principal?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          pix_key?: string | null
          pix_key_type?: string | null
          razao_social?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          titular_cpf_cnpj?: string | null
          titular_nome?: string | null
          usuario_id?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          created_at?: string | null
          email_contato?: string | null
          endereco_principal?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          pix_key?: string | null
          pix_key_type?: string | null
          razao_social?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          titular_cpf_cnpj?: string | null
          titular_nome?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas_medicos: {
        Row: {
          ativo: boolean | null
          clinica_id: string
          created_at: string | null
          id: string
          medico_id: string
        }
        Insert: {
          ativo?: boolean | null
          clinica_id: string
          created_at?: string | null
          id?: string
          medico_id: string
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string
          created_at?: string | null
          id?: string
          medico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_medicos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicas_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      config_asaas: {
        Row: {
          ambiente: string
          api_key: string
          ativo: boolean | null
          base_url: string
          created_at: string | null
          id: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          ambiente: string
          api_key: string
          ativo?: boolean | null
          base_url: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          ambiente?: string
          api_key?: string
          ativo?: boolean | null
          base_url?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      config_whatsapp: {
        Row: {
          api_base_url: string | null
          api_token: string | null
          ativo: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          webhook_medico_url: string | null
          webhook_paciente_url: string | null
        }
        Insert: {
          api_base_url?: string | null
          api_token?: string | null
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_medico_url?: string | null
          webhook_paciente_url?: string | null
        }
        Update: {
          api_base_url?: string | null
          api_token?: string | null
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_medico_url?: string | null
          webhook_paciente_url?: string | null
        }
        Relationships: []
      }
      confirmacoes_agenda: {
        Row: {
          clinica_id: string
          consulta_id: string
          created_at: string
          data_agendamento: string | null
          data_envio: string | null
          data_resposta: string | null
          erro_descricao: string | null
          fila_id: string | null
          id: string
          link_confirmacao: string | null
          mensagem_enviada: string | null
          paciente_id: string | null
          status: string
          telefone: string
          token_confirmacao: string
          whatsapp_message_id: string | null
        }
        Insert: {
          clinica_id: string
          consulta_id: string
          created_at?: string
          data_agendamento?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          erro_descricao?: string | null
          fila_id?: string | null
          id?: string
          link_confirmacao?: string | null
          mensagem_enviada?: string | null
          paciente_id?: string | null
          status?: string
          telefone: string
          token_confirmacao: string
          whatsapp_message_id?: string | null
        }
        Update: {
          clinica_id?: string
          consulta_id?: string
          created_at?: string
          data_agendamento?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          erro_descricao?: string | null
          fila_id?: string | null
          id?: string
          link_confirmacao?: string | null
          mensagem_enviada?: string | null
          paciente_id?: string | null
          status?: string
          telefone?: string
          token_confirmacao?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "confirmacoes_agenda_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmacoes_agenda_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmacoes_agenda_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmacoes_agenda_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      consulta_procedimentos: {
        Row: {
          consulta_id: string
          created_at: string
          id: string
          nome_procedimento: string
          valor: number
        }
        Insert: {
          consulta_id: string
          created_at?: string
          id?: string
          nome_procedimento: string
          valor?: number
        }
        Update: {
          consulta_id?: string
          created_at?: string
          id?: string
          nome_procedimento?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "consulta_procedimentos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas: {
        Row: {
          agenda_slot_id: string | null
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          caixa_movimento_id: string | null
          clinica_id: string | null
          convenio_id: string | null
          created_at: string | null
          data_hora: string
          data_hora_finalizacao_medico: string | null
          data_hora_finalizacao_paciente: string | null
          dependente_id: string | null
          elegivel_repasse: boolean | null
          finalizado_medico: boolean | null
          finalizado_medico_id: string | null
          finalizado_paciente: boolean | null
          formas_pagamento: Json | null
          id: string
          incluida_em_repasse: boolean | null
          local_id: string | null
          medico_id: string | null
          motivo_consulta: string | null
          nome_paciente_consulta: string | null
          observacao_finalizacao_medico: string | null
          observacao_finalizacao_paciente: string | null
          observacoes_paciente: string | null
          origem: string | null
          paciente_id: string | null
          sincronizado_caixa: boolean | null
          sintomas: string | null
          status_consulta: string
          status_faturamento: string
          status_pagamento: string
          status_repasse: string
          tipo_atendimento: string | null
          tipo_servico: string | null
          usuario_clinica_id: string | null
          valor_consulta: number
          valor_medico: number
          valor_plataforma: number
        }
        Insert: {
          agenda_slot_id?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          caixa_movimento_id?: string | null
          clinica_id?: string | null
          convenio_id?: string | null
          created_at?: string | null
          data_hora: string
          data_hora_finalizacao_medico?: string | null
          data_hora_finalizacao_paciente?: string | null
          dependente_id?: string | null
          elegivel_repasse?: boolean | null
          finalizado_medico?: boolean | null
          finalizado_medico_id?: string | null
          finalizado_paciente?: boolean | null
          formas_pagamento?: Json | null
          id?: string
          incluida_em_repasse?: boolean | null
          local_id?: string | null
          medico_id?: string | null
          motivo_consulta?: string | null
          nome_paciente_consulta?: string | null
          observacao_finalizacao_medico?: string | null
          observacao_finalizacao_paciente?: string | null
          observacoes_paciente?: string | null
          origem?: string | null
          paciente_id?: string | null
          sincronizado_caixa?: boolean | null
          sintomas?: string | null
          status_consulta?: string
          status_faturamento?: string
          status_pagamento?: string
          status_repasse?: string
          tipo_atendimento?: string | null
          tipo_servico?: string | null
          usuario_clinica_id?: string | null
          valor_consulta: number
          valor_medico: number
          valor_plataforma: number
        }
        Update: {
          agenda_slot_id?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          caixa_movimento_id?: string | null
          clinica_id?: string | null
          convenio_id?: string | null
          created_at?: string | null
          data_hora?: string
          data_hora_finalizacao_medico?: string | null
          data_hora_finalizacao_paciente?: string | null
          dependente_id?: string | null
          elegivel_repasse?: boolean | null
          finalizado_medico?: boolean | null
          finalizado_medico_id?: string | null
          finalizado_paciente?: boolean | null
          formas_pagamento?: Json | null
          id?: string
          incluida_em_repasse?: boolean | null
          local_id?: string | null
          medico_id?: string | null
          motivo_consulta?: string | null
          nome_paciente_consulta?: string | null
          observacao_finalizacao_medico?: string | null
          observacao_finalizacao_paciente?: string | null
          observacoes_paciente?: string | null
          origem?: string | null
          paciente_id?: string | null
          sincronizado_caixa?: boolean | null
          sintomas?: string | null
          status_consulta?: string
          status_faturamento?: string
          status_pagamento?: string
          status_repasse?: string
          tipo_atendimento?: string | null
          tipo_servico?: string | null
          usuario_clinica_id?: string | null
          valor_consulta?: number
          valor_medico?: number
          valor_plataforma?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultas_agenda_slot_id_fkey"
            columns: ["agenda_slot_id"]
            isOneToOne: false
            referencedRelation: "agenda_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_caixa_movimento_id_fkey"
            columns: ["caixa_movimento_id"]
            isOneToOne: false
            referencedRelation: "caixa_movimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_convenio_id_fkey"
            columns: ["convenio_id"]
            isOneToOne: false
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_dependente_id_fkey"
            columns: ["dependente_id"]
            isOneToOne: false
            referencedRelation: "paciente_dependentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_finalizado_medico_id_fkey"
            columns: ["finalizado_medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas_eventos: {
        Row: {
          consulta_id: string
          created_at: string | null
          descricao: string | null
          id: string
          tipo_evento: string
          usuario_id: string | null
          usuario_tipo: string
        }
        Insert: {
          consulta_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo_evento: string
          usuario_id?: string | null
          usuario_tipo: string
        }
        Update: {
          consulta_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo_evento?: string
          usuario_id?: string | null
          usuario_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultas_eventos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          centro_custo_id: string | null
          clinica_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor: string | null
          id: string
          observacoes: string | null
          status: string | null
          valor: number
        }
        Insert: {
          centro_custo_id?: string | null
          clinica_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          valor: number
        }
        Update: {
          centro_custo_id?: string | null
          clinica_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          cliente: string | null
          clinica_id: string
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          id: string
          observacoes: string | null
          status: string | null
          valor: number
        }
        Insert: {
          cliente?: string | null
          clinica_id: string
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          observacoes?: string | null
          status?: string | null
          valor: number
        }
        Update: {
          cliente?: string | null
          clinica_id?: string
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          status?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      convenios: {
        Row: {
          ativo: boolean | null
          clinica_id: string
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          clinica_id: string
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "convenios_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_etapas: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          funil_id: string
          id: string
          nome: string
          ordem: number
          pode_criar: boolean | null
          pode_ganhar: boolean | null
          probabilidade_ganho: number | null
          tempo_estagnacao_dias: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          funil_id: string
          id?: string
          nome: string
          ordem?: number
          pode_criar?: boolean | null
          pode_ganhar?: boolean | null
          probabilidade_ganho?: number | null
          tempo_estagnacao_dias?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          funil_id?: string
          id?: string
          nome?: string
          ordem?: number
          pode_criar?: boolean | null
          pode_ganhar?: boolean | null
          probabilidade_ganho?: number | null
          tempo_estagnacao_dias?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_etapas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "crm_funis"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_funis: {
        Row: {
          ativo: boolean | null
          automacoes: Json | null
          clinica_id: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
          usuarios_permitidos: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          automacoes?: Json | null
          clinica_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
          usuarios_permitidos?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          automacoes?: Json | null
          clinica_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
          usuarios_permitidos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_funis_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          clinica_id: string
          consulta_id: string | null
          created_at: string | null
          data_ganho: string | null
          data_perda: string | null
          data_vencimento: string | null
          email: string | null
          etapa_id: string
          funil_id: string
          ganho: boolean | null
          id: string
          motivo_perda: string | null
          nome: string
          observacoes: string | null
          ordem: number | null
          origem: string | null
          paciente_id: string | null
          perdido: boolean | null
          responsavel_id: string | null
          tags: string[] | null
          telefone: string | null
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          clinica_id: string
          consulta_id?: string | null
          created_at?: string | null
          data_ganho?: string | null
          data_perda?: string | null
          data_vencimento?: string | null
          email?: string | null
          etapa_id: string
          funil_id: string
          ganho?: boolean | null
          id?: string
          motivo_perda?: string | null
          nome: string
          observacoes?: string | null
          ordem?: number | null
          origem?: string | null
          paciente_id?: string | null
          perdido?: boolean | null
          responsavel_id?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          clinica_id?: string
          consulta_id?: string | null
          created_at?: string | null
          data_ganho?: string | null
          data_perda?: string | null
          data_vencimento?: string | null
          email?: string | null
          etapa_id?: string
          funil_id?: string
          ganho?: boolean | null
          id?: string
          motivo_perda?: string | null
          nome?: string
          observacoes?: string | null
          ordem?: number | null
          origem?: string | null
          paciente_id?: string | null
          perdido?: boolean | null
          responsavel_id?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "crm_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "crm_funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads_historico: {
        Row: {
          automatico: boolean | null
          created_at: string | null
          descricao: string | null
          etapa_anterior_id: string | null
          etapa_nova_id: string
          id: string
          lead_id: string
          usuario_clinica_id: string | null
        }
        Insert: {
          automatico?: boolean | null
          created_at?: string | null
          descricao?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id: string
          id?: string
          lead_id: string
          usuario_clinica_id?: string | null
        }
        Update: {
          automatico?: boolean | null
          created_at?: string | null
          descricao?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id?: string
          id?: string
          lead_id?: string
          usuario_clinica_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_historico_etapa_anterior_id_fkey"
            columns: ["etapa_anterior_id"]
            isOneToOne: false
            referencedRelation: "crm_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_historico_etapa_nova_id_fkey"
            columns: ["etapa_nova_id"]
            isOneToOne: false
            referencedRelation: "crm_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_historico_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_medico_paciente: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string
          detalhes: string | null
          id: string
          paciente_id: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao: string
          detalhes?: string | null
          id?: string
          paciente_id: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string
          detalhes?: string | null
          id?: string
          paciente_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_medico_paciente_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_espera: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          data_atendimento: string | null
          data_chamada: string | null
          data_entrada: string | null
          id: string
          medico_id: string
          motivo: string | null
          observacoes: string | null
          paciente_cpf: string | null
          paciente_id: string | null
          paciente_nome: string
          paciente_telefone: string | null
          posicao: number
          prioridade: number | null
          status: string | null
          usuario_clinica_id: string | null
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          data_atendimento?: string | null
          data_chamada?: string | null
          data_entrada?: string | null
          id?: string
          medico_id: string
          motivo?: string | null
          observacoes?: string | null
          paciente_cpf?: string | null
          paciente_id?: string | null
          paciente_nome: string
          paciente_telefone?: string | null
          posicao: number
          prioridade?: number | null
          status?: string | null
          usuario_clinica_id?: string | null
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          data_atendimento?: string | null
          data_chamada?: string | null
          data_entrada?: string | null
          id?: string
          medico_id?: string
          motivo?: string | null
          observacoes?: string | null
          paciente_cpf?: string | null
          paciente_id?: string | null
          paciente_nome?: string
          paciente_telefone?: string | null
          posicao?: number
          prioridade?: number | null
          status?: string | null
          usuario_clinica_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_espera_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_espera_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_espera_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_espera_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_atendimento: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          clinica_id: string | null
          created_at: string | null
          endereco: string | null
          estado: string | null
          id: string
          medico_id: string | null
          nome_local: string
          observacoes: string | null
          tipo_atendimento: string
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          clinica_id?: string | null
          created_at?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          medico_id?: string | null
          nome_local: string
          observacoes?: string | null
          tipo_atendimento: string
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          clinica_id?: string | null
          created_at?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          medico_id?: string | null
          nome_local?: string
          observacoes?: string | null
          tipo_atendimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_atendimento_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locais_atendimento_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_medicos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          local_id: string
          medico_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          local_id: string
          medico_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          local_id?: string
          medico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_medicos_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locais_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      meconsulta_pay_solicitacoes: {
        Row: {
          cpf: string
          created_at: string
          data_aprovacao: string | null
          data_nascimento: string
          id: string
          nome_completo: string
          nome_mae: string
          observacoes_analise: string | null
          paciente_id: string
          quantidade_parcelas: number | null
          status: string
          taxa_juros_mensal: number | null
          valor_aprovado: number | null
          valor_pretendido: number | null
        }
        Insert: {
          cpf: string
          created_at?: string
          data_aprovacao?: string | null
          data_nascimento: string
          id?: string
          nome_completo: string
          nome_mae: string
          observacoes_analise?: string | null
          paciente_id: string
          quantidade_parcelas?: number | null
          status?: string
          taxa_juros_mensal?: number | null
          valor_aprovado?: number | null
          valor_pretendido?: number | null
        }
        Update: {
          cpf?: string
          created_at?: string
          data_aprovacao?: string | null
          data_nascimento?: string
          id?: string
          nome_completo?: string
          nome_mae?: string
          observacoes_analise?: string | null
          paciente_id?: string
          quantidade_parcelas?: number | null
          status?: string
          taxa_juros_mensal?: number | null
          valor_aprovado?: number | null
          valor_pretendido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meconsulta_pay_solicitacoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_repasse_config: {
        Row: {
          ativo: boolean | null
          clinica_id: string
          created_at: string
          id: string
          medico_id: string
          percentual_repasse: number | null
          tipo_repasse: string | null
          updated_at: string
          valor_fixo_repasse: number | null
        }
        Insert: {
          ativo?: boolean | null
          clinica_id: string
          created_at?: string
          id?: string
          medico_id: string
          percentual_repasse?: number | null
          tipo_repasse?: string | null
          updated_at?: string
          valor_fixo_repasse?: number | null
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string
          created_at?: string
          id?: string
          medico_id?: string
          percentual_repasse?: number | null
          tipo_repasse?: string | null
          updated_at?: string
          valor_fixo_repasse?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medico_repasse_config_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_repasse_config_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_servicos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          medico_id: string
          nome_servico: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          medico_id: string
          nome_servico: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          medico_id?: string
          nome_servico?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_servicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          agencia: string | null
          aparecer_home: boolean | null
          ativo: boolean | null
          banco_codigo: string | null
          banco_nome: string | null
          bio: string | null
          conta: string | null
          created_at: string | null
          crm: string | null
          especialidade: string | null
          formacao: string[] | null
          foto_url: string | null
          id: string
          nome: string
          percentual_repasse: number
          pix_key: string | null
          pix_key_type: string | null
          telefone_whatsapp: string | null
          tipo_conta: string | null
          titular_cpf_cnpj: string | null
          titular_nome: string | null
          usuario_id: string | null
          valor_consulta: number
        }
        Insert: {
          agencia?: string | null
          aparecer_home?: boolean | null
          ativo?: boolean | null
          banco_codigo?: string | null
          banco_nome?: string | null
          bio?: string | null
          conta?: string | null
          created_at?: string | null
          crm?: string | null
          especialidade?: string | null
          formacao?: string[] | null
          foto_url?: string | null
          id?: string
          nome: string
          percentual_repasse?: number
          pix_key?: string | null
          pix_key_type?: string | null
          telefone_whatsapp?: string | null
          tipo_conta?: string | null
          titular_cpf_cnpj?: string | null
          titular_nome?: string | null
          usuario_id?: string | null
          valor_consulta?: number
        }
        Update: {
          agencia?: string | null
          aparecer_home?: boolean | null
          ativo?: boolean | null
          banco_codigo?: string | null
          banco_nome?: string | null
          bio?: string | null
          conta?: string | null
          created_at?: string | null
          crm?: string | null
          especialidade?: string | null
          formacao?: string[] | null
          foto_url?: string | null
          id?: string
          nome?: string
          percentual_repasse?: number
          pix_key?: string | null
          pix_key_type?: string | null
          telefone_whatsapp?: string | null
          tipo_conta?: string | null
          titular_cpf_cnpj?: string | null
          titular_nome?: string | null
          usuario_id?: string | null
          valor_consulta?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_financeiras: {
        Row: {
          ano: number
          clinica_id: string
          created_at: string
          id: string
          mes: number
          meta_consultas: number | null
          meta_faturamento: number | null
          meta_novos_pacientes: number | null
          meta_ticket_medio: number | null
          updated_at: string
        }
        Insert: {
          ano: number
          clinica_id: string
          created_at?: string
          id?: string
          mes: number
          meta_consultas?: number | null
          meta_faturamento?: number | null
          meta_novos_pacientes?: number | null
          meta_ticket_medio?: number | null
          updated_at?: string
        }
        Update: {
          ano?: number
          clinica_id?: string
          created_at?: string
          id?: string
          mes?: number
          meta_consultas?: number | null
          meta_faturamento?: number | null
          meta_novos_pacientes?: number | null
          meta_ticket_medio?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_financeiras_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_agente_pausas: {
        Row: {
          agente_id: string
          created_at: string
          duracao_segundos: number | null
          fim: string | null
          id: string
          inicio: string
          tipo_pausa_id: string | null
        }
        Insert: {
          agente_id: string
          created_at?: string
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          tipo_pausa_id?: string | null
        }
        Update: {
          agente_id?: string
          created_at?: string
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          tipo_pausa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omni_agente_pausas_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "omni_agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_agente_pausas_tipo_pausa_id_fkey"
            columns: ["tipo_pausa_id"]
            isOneToOne: false
            referencedRelation: "omni_pausas_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_agentes: {
        Row: {
          atendimentos_hoje: number | null
          created_at: string
          fila_id: string
          id: string
          max_atendimentos_simultaneos: number | null
          motivo_pausa: string | null
          status: string
          tempo_logado_hoje: number | null
          updated_at: string
          usuario_clinica_id: string
        }
        Insert: {
          atendimentos_hoje?: number | null
          created_at?: string
          fila_id: string
          id?: string
          max_atendimentos_simultaneos?: number | null
          motivo_pausa?: string | null
          status?: string
          tempo_logado_hoje?: number | null
          updated_at?: string
          usuario_clinica_id: string
        }
        Update: {
          atendimentos_hoje?: number | null
          created_at?: string
          fila_id?: string
          id?: string
          max_atendimentos_simultaneos?: number | null
          motivo_pausa?: string | null
          status?: string
          tempo_logado_hoje?: number | null
          updated_at?: string
          usuario_clinica_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_agentes_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_agentes_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_atendimentos: {
        Row: {
          agente_id: string | null
          avaliacao_comentario: string | null
          avaliacao_nota: number | null
          canal: string
          clinica_id: string
          contato_id: string
          created_at: string
          data_abertura: string
          data_fechamento: string | null
          data_primeira_resposta: string | null
          data_reabertura: string | null
          etiquetas: string[] | null
          fila_id: string | null
          id: string
          mensagem_reabertura: string | null
          motivo_fechamento: string | null
          prioridade: string | null
          protocolo: number
          reabertura_agendada: boolean | null
          status: string
          tempo_primeira_resposta: number | null
          tempo_total_atendimento: number | null
          transferido_de_agente_id: string | null
          transferido_de_fila_id: string | null
          updated_at: string
        }
        Insert: {
          agente_id?: string | null
          avaliacao_comentario?: string | null
          avaliacao_nota?: number | null
          canal?: string
          clinica_id: string
          contato_id: string
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          data_primeira_resposta?: string | null
          data_reabertura?: string | null
          etiquetas?: string[] | null
          fila_id?: string | null
          id?: string
          mensagem_reabertura?: string | null
          motivo_fechamento?: string | null
          prioridade?: string | null
          protocolo?: number
          reabertura_agendada?: boolean | null
          status?: string
          tempo_primeira_resposta?: number | null
          tempo_total_atendimento?: number | null
          transferido_de_agente_id?: string | null
          transferido_de_fila_id?: string | null
          updated_at?: string
        }
        Update: {
          agente_id?: string | null
          avaliacao_comentario?: string | null
          avaliacao_nota?: number | null
          canal?: string
          clinica_id?: string
          contato_id?: string
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          data_primeira_resposta?: string | null
          data_reabertura?: string | null
          etiquetas?: string[] | null
          fila_id?: string | null
          id?: string
          mensagem_reabertura?: string | null
          motivo_fechamento?: string | null
          prioridade?: string | null
          protocolo?: number
          reabertura_agendada?: boolean | null
          status?: string
          tempo_primeira_resposta?: number | null
          tempo_total_atendimento?: number | null
          transferido_de_agente_id?: string | null
          transferido_de_fila_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_atendimentos_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_atendimentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_atendimentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "omni_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_atendimentos_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_atendimentos_transferido_de_agente_id_fkey"
            columns: ["transferido_de_agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_atendimentos_transferido_de_fila_id_fkey"
            columns: ["transferido_de_fila_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_contatos: {
        Row: {
          agente_preferencial_id: string | null
          clinica_id: string
          created_at: string
          dados_extras: Json | null
          documento: string | null
          email: string | null
          empresa: string | null
          etiquetas: string[] | null
          foto_url: string | null
          id: string
          instagram: string | null
          nome: string
          observacoes: string | null
          paciente_id: string | null
          telefone: string
          updated_at: string
        }
        Insert: {
          agente_preferencial_id?: string | null
          clinica_id: string
          created_at?: string
          dados_extras?: Json | null
          documento?: string | null
          email?: string | null
          empresa?: string | null
          etiquetas?: string[] | null
          foto_url?: string | null
          id?: string
          instagram?: string | null
          nome: string
          observacoes?: string | null
          paciente_id?: string | null
          telefone: string
          updated_at?: string
        }
        Update: {
          agente_preferencial_id?: string | null
          clinica_id?: string
          created_at?: string
          dados_extras?: Json | null
          documento?: string | null
          email?: string | null
          empresa?: string | null
          etiquetas?: string[] | null
          foto_url?: string | null
          id?: string
          instagram?: string | null
          nome?: string
          observacoes?: string | null
          paciente_id?: string | null
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_contatos_agente_preferencial_id_fkey"
            columns: ["agente_preferencial_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_contatos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_contatos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_etiquetas: {
        Row: {
          clinica_id: string
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          clinica_id: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          clinica_id?: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_etiquetas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_filas: {
        Row: {
          atendimentos_max_agente: number | null
          ativo: boolean | null
          clinica_id: string
          cor: string | null
          created_at: string
          descricao: string | null
          estrategia_distribuicao: string | null
          fechar_por_inatividade_minutos: number | null
          horario_funcionamento: Json | null
          id: string
          instancia_id: string | null
          mensagem_boas_vindas: string | null
          mensagem_espera: string | null
          mensagem_fechamento: string | null
          mensagem_fora_horario: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          atendimentos_max_agente?: number | null
          ativo?: boolean | null
          clinica_id: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          estrategia_distribuicao?: string | null
          fechar_por_inatividade_minutos?: number | null
          horario_funcionamento?: Json | null
          id?: string
          instancia_id?: string | null
          mensagem_boas_vindas?: string | null
          mensagem_espera?: string | null
          mensagem_fechamento?: string | null
          mensagem_fora_horario?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          atendimentos_max_agente?: number | null
          ativo?: boolean | null
          clinica_id?: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          estrategia_distribuicao?: string | null
          fechar_por_inatividade_minutos?: number | null
          horario_funcionamento?: Json | null
          id?: string
          instancia_id?: string | null
          mensagem_boas_vindas?: string | null
          mensagem_espera?: string | null
          mensagem_fechamento?: string | null
          mensagem_fora_horario?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_filas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_filas_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "omni_instancias"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_ia_agendamentos_config: {
        Row: {
          agente_id: string
          antecedencia_maxima_dias: number | null
          antecedencia_minima_horas: number | null
          clinica_id: string
          created_at: string | null
          dias_semana: number[] | null
          distribuicao_atendentes: string | null
          especialidades_permitidas: string[] | null
          exigir_cpf: boolean | null
          fila_id: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          mensagem_confirmacao: string | null
          mensagem_lembrete: string | null
          permitir_agendamento: boolean | null
          permitir_cancelamento: boolean | null
          permitir_encaixe: boolean | null
          tipos_atendimento: string[] | null
          updated_at: string | null
          valor_padrao: number | null
        }
        Insert: {
          agente_id: string
          antecedencia_maxima_dias?: number | null
          antecedencia_minima_horas?: number | null
          clinica_id: string
          created_at?: string | null
          dias_semana?: number[] | null
          distribuicao_atendentes?: string | null
          especialidades_permitidas?: string[] | null
          exigir_cpf?: boolean | null
          fila_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          mensagem_confirmacao?: string | null
          mensagem_lembrete?: string | null
          permitir_agendamento?: boolean | null
          permitir_cancelamento?: boolean | null
          permitir_encaixe?: boolean | null
          tipos_atendimento?: string[] | null
          updated_at?: string | null
          valor_padrao?: number | null
        }
        Update: {
          agente_id?: string
          antecedencia_maxima_dias?: number | null
          antecedencia_minima_horas?: number | null
          clinica_id?: string
          created_at?: string | null
          dias_semana?: number[] | null
          distribuicao_atendentes?: string | null
          especialidades_permitidas?: string[] | null
          exigir_cpf?: boolean | null
          fila_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          mensagem_confirmacao?: string | null
          mensagem_lembrete?: string | null
          permitir_agendamento?: boolean | null
          permitir_cancelamento?: boolean | null
          permitir_encaixe?: boolean | null
          tipos_atendimento?: string[] | null
          updated_at?: string | null
          valor_padrao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "omni_ia_agendamentos_config_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: true
            referencedRelation: "omni_ia_agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agendamentos_config_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agendamentos_config_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_ia_agendamentos_log: {
        Row: {
          acao: string
          agente_id: string | null
          atendimento_id: string | null
          clinica_id: string
          consulta_id: string | null
          created_at: string | null
          dados: Json | null
          erro: string | null
          id: string
          paciente_id: string | null
          sucesso: boolean | null
          usuario_clinica_id: string | null
        }
        Insert: {
          acao: string
          agente_id?: string | null
          atendimento_id?: string | null
          clinica_id: string
          consulta_id?: string | null
          created_at?: string | null
          dados?: Json | null
          erro?: string | null
          id?: string
          paciente_id?: string | null
          sucesso?: boolean | null
          usuario_clinica_id?: string | null
        }
        Update: {
          acao?: string
          agente_id?: string | null
          atendimento_id?: string | null
          clinica_id?: string
          consulta_id?: string | null
          created_at?: string | null
          dados?: Json | null
          erro?: string | null
          id?: string
          paciente_id?: string | null
          sucesso?: boolean | null
          usuario_clinica_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omni_ia_agendamentos_log_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "omni_ia_agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agendamentos_log_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "omni_atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agendamentos_log_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agendamentos_log_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agendamentos_log_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agendamentos_log_usuario_clinica_id_fkey"
            columns: ["usuario_clinica_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_ia_agentes: {
        Row: {
          acoes_followup: Json | null
          antecedencia_maxima_dias: number | null
          antecedencia_minima_horas: number | null
          assinar_nome: boolean
          ativo: boolean
          avatar_url: string | null
          busca_treinamento: boolean
          clinica_id: string
          comportamento: string | null
          comunicacao: string
          created_at: string
          descricao: string | null
          descricao_produto: string | null
          dividir_resposta: boolean
          exigir_cpf: boolean | null
          fila_operacao_id: string | null
          fila_transferencia_id: string | null
          finalidade: string
          id: string
          limite_interacoes: number
          modelo: string
          nome: string
          palavras_chave_transferencia: string[] | null
          pausar_quando_humano_responde: boolean | null
          permitir_agendamento: boolean | null
          permitir_cancelamento: boolean | null
          permitir_lembretes: boolean
          produto: string | null
          restringir_temas: boolean
          site_url: string | null
          tempo_resposta: number
          timezone: string
          tipos_atendimento: string[] | null
          transferir_para_humano: boolean
          updated_at: string
          usar_emojis: boolean
        }
        Insert: {
          acoes_followup?: Json | null
          antecedencia_maxima_dias?: number | null
          antecedencia_minima_horas?: number | null
          assinar_nome?: boolean
          ativo?: boolean
          avatar_url?: string | null
          busca_treinamento?: boolean
          clinica_id: string
          comportamento?: string | null
          comunicacao?: string
          created_at?: string
          descricao?: string | null
          descricao_produto?: string | null
          dividir_resposta?: boolean
          exigir_cpf?: boolean | null
          fila_operacao_id?: string | null
          fila_transferencia_id?: string | null
          finalidade?: string
          id?: string
          limite_interacoes?: number
          modelo?: string
          nome: string
          palavras_chave_transferencia?: string[] | null
          pausar_quando_humano_responde?: boolean | null
          permitir_agendamento?: boolean | null
          permitir_cancelamento?: boolean | null
          permitir_lembretes?: boolean
          produto?: string | null
          restringir_temas?: boolean
          site_url?: string | null
          tempo_resposta?: number
          timezone?: string
          tipos_atendimento?: string[] | null
          transferir_para_humano?: boolean
          updated_at?: string
          usar_emojis?: boolean
        }
        Update: {
          acoes_followup?: Json | null
          antecedencia_maxima_dias?: number | null
          antecedencia_minima_horas?: number | null
          assinar_nome?: boolean
          ativo?: boolean
          avatar_url?: string | null
          busca_treinamento?: boolean
          clinica_id?: string
          comportamento?: string | null
          comunicacao?: string
          created_at?: string
          descricao?: string | null
          descricao_produto?: string | null
          dividir_resposta?: boolean
          exigir_cpf?: boolean | null
          fila_operacao_id?: string | null
          fila_transferencia_id?: string | null
          finalidade?: string
          id?: string
          limite_interacoes?: number
          modelo?: string
          nome?: string
          palavras_chave_transferencia?: string[] | null
          pausar_quando_humano_responde?: boolean | null
          permitir_agendamento?: boolean | null
          permitir_cancelamento?: boolean | null
          permitir_lembretes?: boolean
          produto?: string | null
          restringir_temas?: boolean
          site_url?: string | null
          tempo_resposta?: number
          timezone?: string
          tipos_atendimento?: string[] | null
          transferir_para_humano?: boolean
          updated_at?: string
          usar_emojis?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "omni_ia_agentes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agentes_fila_operacao_id_fkey"
            columns: ["fila_operacao_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_agentes_fila_transferencia_id_fkey"
            columns: ["fila_transferencia_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_ia_conversas: {
        Row: {
          agente_id: string
          atendimento_id: string
          created_at: string
          followup_executados: Json | null
          followup_pendentes: Json | null
          humano_assumiu: boolean | null
          humano_assumiu_em: string | null
          id: string
          interacoes_count: number
          mensagens: Json
          transferido_para_humano: boolean
          ultima_interacao: string | null
          ultima_mensagem_cliente: string | null
          updated_at: string
        }
        Insert: {
          agente_id: string
          atendimento_id: string
          created_at?: string
          followup_executados?: Json | null
          followup_pendentes?: Json | null
          humano_assumiu?: boolean | null
          humano_assumiu_em?: string | null
          id?: string
          interacoes_count?: number
          mensagens?: Json
          transferido_para_humano?: boolean
          ultima_interacao?: string | null
          ultima_mensagem_cliente?: string | null
          updated_at?: string
        }
        Update: {
          agente_id?: string
          atendimento_id?: string
          created_at?: string
          followup_executados?: Json | null
          followup_pendentes?: Json | null
          humano_assumiu?: boolean | null
          humano_assumiu_em?: string | null
          id?: string
          interacoes_count?: number
          mensagens?: Json
          transferido_para_humano?: boolean
          ultima_interacao?: string | null
          ultima_mensagem_cliente?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_ia_conversas_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "omni_ia_agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_conversas_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "omni_atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_ia_intencoes: {
        Row: {
          agente_id: string
          ativa: boolean
          clinica_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          webhook_url: string
        }
        Insert: {
          agente_id: string
          ativa?: boolean
          clinica_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          webhook_url: string
        }
        Update: {
          agente_id?: string
          ativa?: boolean
          clinica_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_ia_intencoes_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "omni_ia_agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_intencoes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_ia_treinamentos: {
        Row: {
          agente_id: string
          clinica_id: string
          conteudo: string
          created_at: string
          id: string
          status: string
          tipo: string
        }
        Insert: {
          agente_id: string
          clinica_id: string
          conteudo: string
          created_at?: string
          id?: string
          status?: string
          tipo: string
        }
        Update: {
          agente_id?: string
          clinica_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_ia_treinamentos_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "omni_ia_agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_ia_treinamentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_instancias: {
        Row: {
          api_key_hash: string | null
          clinica_id: string
          configuracoes: Json | null
          created_at: string
          evolution_instance_name: string | null
          id: string
          last_history_import_at: string | null
          nome: string
          numero_whatsapp: string | null
          provider: string
          servidor_url: string | null
          status: string
          updated_at: string
          webhook_url: string | null
          webhooks_configured: boolean
          webhooks_configured_at: string | null
          zapi_instance_id: string | null
          zapi_token: string | null
        }
        Insert: {
          api_key_hash?: string | null
          clinica_id: string
          configuracoes?: Json | null
          created_at?: string
          evolution_instance_name?: string | null
          id?: string
          last_history_import_at?: string | null
          nome: string
          numero_whatsapp?: string | null
          provider?: string
          servidor_url?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
          webhooks_configured?: boolean
          webhooks_configured_at?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
        }
        Update: {
          api_key_hash?: string | null
          clinica_id?: string
          configuracoes?: Json | null
          created_at?: string
          evolution_instance_name?: string | null
          id?: string
          last_history_import_at?: string | null
          nome?: string
          numero_whatsapp?: string | null
          provider?: string
          servidor_url?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
          webhooks_configured?: boolean
          webhooks_configured_at?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omni_instancias_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_mensagens: {
        Row: {
          agente_id: string | null
          arquivo_nome: string | null
          arquivo_tipo: string | null
          arquivo_url: string | null
          atendimento_id: string
          contato_id: string | null
          conteudo: string | null
          created_at: string
          dedup_hash: string | null
          direcao: string
          encaminhada: boolean
          erro_descricao: string | null
          id: string
          media_mime: string | null
          media_original_url: string | null
          media_size: number | null
          media_status: string | null
          quoted_message_id: string | null
          status: string | null
          tipo: string
          updated_at: string
          whatsapp_message_id: string | null
        }
        Insert: {
          agente_id?: string | null
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          atendimento_id: string
          contato_id?: string | null
          conteudo?: string | null
          created_at?: string
          dedup_hash?: string | null
          direcao: string
          encaminhada?: boolean
          erro_descricao?: string | null
          id?: string
          media_mime?: string | null
          media_original_url?: string | null
          media_size?: number | null
          media_status?: string | null
          quoted_message_id?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          agente_id?: string | null
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          atendimento_id?: string
          contato_id?: string | null
          conteudo?: string | null
          created_at?: string
          dedup_hash?: string | null
          direcao?: string
          encaminhada?: boolean
          erro_descricao?: string | null
          id?: string
          media_mime?: string | null
          media_original_url?: string | null
          media_size?: number | null
          media_status?: string | null
          quoted_message_id?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omni_mensagens_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_mensagens_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "omni_atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "omni_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_mensagens_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "omni_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_mensagens_rapidas: {
        Row: {
          atalho: string | null
          ativo: boolean | null
          categoria: string | null
          clinica_id: string
          conteudo: string
          created_at: string
          fila_id: string | null
          id: string
          titulo: string
          updated_at: string
          variaveis: Json | null
        }
        Insert: {
          atalho?: string | null
          ativo?: boolean | null
          categoria?: string | null
          clinica_id: string
          conteudo: string
          created_at?: string
          fila_id?: string | null
          id?: string
          titulo: string
          updated_at?: string
          variaveis?: Json | null
        }
        Update: {
          atalho?: string | null
          ativo?: boolean | null
          categoria?: string | null
          clinica_id?: string
          conteudo?: string
          created_at?: string
          fila_id?: string | null
          id?: string
          titulo?: string
          updated_at?: string
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "omni_mensagens_rapidas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_mensagens_rapidas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "omni_filas"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_notas_internas: {
        Row: {
          atendimento_id: string
          clinica_id: string
          created_at: string
          criado_por_nome: string
          criado_por_usuario_id: string | null
          destinatario_agente_id: string | null
          id: string
          lida: boolean
          mensagem: string
        }
        Insert: {
          atendimento_id: string
          clinica_id: string
          created_at?: string
          criado_por_nome: string
          criado_por_usuario_id?: string | null
          destinatario_agente_id?: string | null
          id?: string
          lida?: boolean
          mensagem: string
        }
        Update: {
          atendimento_id?: string
          clinica_id?: string
          created_at?: string
          criado_por_nome?: string
          criado_por_usuario_id?: string | null
          destinatario_agente_id?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "omni_notas_internas_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "omni_atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_notas_internas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omni_notas_internas_destinatario_agente_id_fkey"
            columns: ["destinatario_agente_id"]
            isOneToOne: false
            referencedRelation: "usuarios_clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      omni_pausas_tipos: {
        Row: {
          ativo: boolean | null
          clinica_id: string
          created_at: string
          id: string
          nome: string
          tempo_max_minutos: number | null
        }
        Insert: {
          ativo?: boolean | null
          clinica_id: string
          created_at?: string
          id?: string
          nome: string
          tempo_max_minutos?: number | null
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string
          created_at?: string
          id?: string
          nome?: string
          tempo_max_minutos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "omni_pausas_tipos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      paciente_dependentes: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          id: string
          nome: string
          paciente_id: string
          parentesco: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          id?: string
          nome: string
          paciente_id: string
          parentesco: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          id?: string
          nome?: string
          paciente_id?: string
          parentesco?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paciente_dependentes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      paciente_favoritos: {
        Row: {
          created_at: string | null
          id: string
          medico_id: string
          paciente_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          medico_id: string
          paciente_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          medico_id?: string
          paciente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paciente_favoritos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paciente_favoritos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      paciente_notificacoes: {
        Row: {
          categoria: string
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          paciente_id: string
          referencia_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          paciente_id: string
          referencia_id?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          paciente_id?: string
          referencia_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "paciente_notificacoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          asaas_customer_id: string | null
          bairro: string | null
          cidade: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          estado: string | null
          foto_url: string | null
          id: string
          nome: string
          telefone: string | null
          usuario_id: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          bairro?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          telefone?: string | null
          usuario_id?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          bairro?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      prescricoes_documentos: {
        Row: {
          consulta_id: string | null
          conteudo: string
          created_at: string
          dados_adicionais: Json | null
          id: string
          medico_id: string
          memed_id: string | null
          paciente_id: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          consulta_id?: string | null
          conteudo: string
          created_at?: string
          dados_adicionais?: Json | null
          id?: string
          medico_id: string
          memed_id?: string | null
          paciente_id: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          consulta_id?: string | null
          conteudo?: string
          created_at?: string
          dados_adicionais?: Json | null
          id?: string
          medico_id?: string
          memed_id?: string | null
          paciente_id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescricoes_documentos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescricoes_documentos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescricoes_documentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      repasses_itens: {
        Row: {
          consulta_id: string
          created_at: string | null
          id: string
          repasse_id: string
          valor_medico: number
        }
        Insert: {
          consulta_id: string
          created_at?: string | null
          id?: string
          repasse_id: string
          valor_medico: number
        }
        Update: {
          consulta_id?: string
          created_at?: string | null
          id?: string
          repasse_id?: string
          valor_medico?: number
        }
        Relationships: [
          {
            foreignKeyName: "repasses_itens_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_itens_repasse_id_fkey"
            columns: ["repasse_id"]
            isOneToOne: false
            referencedRelation: "repasses_medico"
            referencedColumns: ["id"]
          },
        ]
      }
      repasses_medico: {
        Row: {
          asaas_transfer_id: string | null
          created_at: string
          data_pagamento: string | null
          data_prevista_pagamento: string | null
          id: string
          medico_id: string
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
          valor_total: number
        }
        Insert: {
          asaas_transfer_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_prevista_pagamento?: string | null
          id?: string
          medico_id: string
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
          valor_total?: number
        }
        Update: {
          asaas_transfer_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_prevista_pagamento?: string | null
          id?: string
          medico_id?: string
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "repasses_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      tiss_guia_itens: {
        Row: {
          codigo_tuss: string
          created_at: string
          descricao: string | null
          especie: string | null
          guia_id: string
          id: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo_tuss: string
          created_at?: string
          descricao?: string | null
          especie?: string | null
          guia_id: string
          id?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          codigo_tuss?: string
          created_at?: string
          descricao?: string | null
          especie?: string | null
          guia_id?: string
          id?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiss_guia_itens_guia_id_fkey"
            columns: ["guia_id"]
            isOneToOne: false
            referencedRelation: "tiss_guias"
            referencedColumns: ["id"]
          },
        ]
      }
      tiss_guias: {
        Row: {
          carteirinha: string | null
          clinica_id: string
          consulta_id: string
          created_at: string
          crm: string | null
          crm_uf: string | null
          data_emissao: string
          id: string
          medico_id: string | null
          numero_guia: string | null
          operadora: string
          paciente_id: string | null
          plano: string | null
          status: string
          tipo_guia: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          carteirinha?: string | null
          clinica_id: string
          consulta_id: string
          created_at?: string
          crm?: string | null
          crm_uf?: string | null
          data_emissao?: string
          id?: string
          medico_id?: string | null
          numero_guia?: string | null
          operadora: string
          paciente_id?: string | null
          plano?: string | null
          status?: string
          tipo_guia?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          carteirinha?: string | null
          clinica_id?: string
          consulta_id?: string
          created_at?: string
          crm?: string | null
          crm_uf?: string | null
          data_emissao?: string
          id?: string
          medico_id?: string | null
          numero_guia?: string | null
          operadora?: string
          paciente_id?: string | null
          plano?: string | null
          status?: string
          tipo_guia?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiss_guias_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiss_guias_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiss_guias_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiss_guias_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      tiss_lote_itens: {
        Row: {
          created_at: string
          guia_id: string
          id: string
          lote_id: string
        }
        Insert: {
          created_at?: string
          guia_id: string
          id?: string
          lote_id: string
        }
        Update: {
          created_at?: string
          guia_id?: string
          id?: string
          lote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiss_lote_itens_guia_id_fkey"
            columns: ["guia_id"]
            isOneToOne: false
            referencedRelation: "tiss_guias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiss_lote_itens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "tiss_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      tiss_lotes: {
        Row: {
          clinica_id: string
          competencia: string
          created_at: string
          id: string
          numero_lote: string | null
          operadora: string
          qtd_guias: number
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          clinica_id: string
          competencia: string
          created_at?: string
          id?: string
          numero_lote?: string | null
          operadora: string
          qtd_guias?: number
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          clinica_id?: string
          competencia?: string
          created_at?: string
          id?: string
          numero_lote?: string | null
          operadora?: string
          qtd_guias?: number
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiss_lotes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      tuss_procedimentos: {
        Row: {
          codigo_tuss: string
          created_at: string
          descricao: string | null
          id: string
          idade_max: number | null
          idade_min: number | null
          sexo: string | null
          tipo: string | null
          valor_referencia: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          codigo_tuss: string
          created_at?: string
          descricao?: string | null
          id?: string
          idade_max?: number | null
          idade_min?: number | null
          sexo?: string | null
          tipo?: string | null
          valor_referencia?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          codigo_tuss?: string
          created_at?: string
          descricao?: string | null
          id?: string
          idade_max?: number | null
          idade_min?: number | null
          sexo?: string | null
          tipo?: string | null
          valor_referencia?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deve_trocar_senha: boolean | null
          email: string
          id: string
          nome: string
          papel: string | null
          senha_hash: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deve_trocar_senha?: boolean | null
          email: string
          id?: string
          nome: string
          papel?: string | null
          senha_hash?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deve_trocar_senha?: boolean | null
          email?: string
          id?: string
          nome?: string
          papel?: string | null
          senha_hash?: string | null
          tipo?: string
        }
        Relationships: []
      }
      usuarios_clinica: {
        Row: {
          ativo: boolean | null
          clinica_id: string | null
          created_at: string | null
          deve_trocar_senha: boolean | null
          email: string | null
          id: string
          medico_id: string
          medicos_ids: string[] | null
          nome: string
          papel: string
          permissoes: string[] | null
          senha_hash: string | null
          telefone: string | null
          todos_medicos: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          clinica_id?: string | null
          created_at?: string | null
          deve_trocar_senha?: boolean | null
          email?: string | null
          id?: string
          medico_id: string
          medicos_ids?: string[] | null
          nome: string
          papel?: string
          permissoes?: string[] | null
          senha_hash?: string | null
          telefone?: string | null
          todos_medicos?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string | null
          created_at?: string | null
          deve_trocar_senha?: boolean | null
          email?: string | null
          id?: string
          medico_id?: string
          medicos_ids?: string[] | null
          nome?: string
          papel?: string
          permissoes?: string[] | null
          senha_hash?: string | null
          telefone?: string | null
          todos_medicos?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_clinica_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_clinica_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          acao: string
          clinica_id: string | null
          created_at: string
          detalhes: Json | null
          id: string
          instancia_id: string | null
          status: string
        }
        Insert: {
          acao: string
          clinica_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          instancia_id?: string | null
          status?: string
        }
        Update: {
          acao?: string
          clinica_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          instancia_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sync_jobs: {
        Row: {
          clinica_id: string
          created_at: string
          cursor_json: Json | null
          days_back: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          instancia_id: string
          job_type: string
          last_error: string | null
          last_synced_at: string | null
          progress_chats_done: number | null
          progress_chats_total: number | null
          progress_count: number | null
          progress_messages_done: number | null
          provider: string
          started_at: string | null
          status: string
          total_count: number | null
          updated_at: string
        }
        Insert: {
          clinica_id: string
          created_at?: string
          cursor_json?: Json | null
          days_back?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          instancia_id: string
          job_type?: string
          last_error?: string | null
          last_synced_at?: string | null
          progress_chats_done?: number | null
          progress_chats_total?: number | null
          progress_count?: number | null
          progress_messages_done?: number | null
          provider?: string
          started_at?: string | null
          status?: string
          total_count?: number | null
          updated_at?: string
        }
        Update: {
          clinica_id?: string
          created_at?: string
          cursor_json?: Json | null
          days_back?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          instancia_id?: string
          job_type?: string
          last_error?: string | null
          last_synced_at?: string | null
          progress_chats_done?: number | null
          progress_chats_total?: number | null
          progress_count?: number | null
          progress_messages_done?: number | null
          provider?: string
          started_at?: string | null
          status?: string
          total_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sync_jobs_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sync_jobs_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "omni_instancias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_clinica_id: { Args: { _user_id: string }; Returns: string }
      get_user_medico_id: { Args: { _user_id: string }; Returns: string }
      get_user_paciente_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      user_belongs_to_clinica: {
        Args: { _clinica_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "medico" | "paciente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "medico", "paciente"],
    },
  },
} as const
