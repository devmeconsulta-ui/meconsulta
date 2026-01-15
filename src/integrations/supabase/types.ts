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
          sintomas: string | null
          status_consulta: string
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
          sintomas?: string | null
          status_consulta?: string
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
          sintomas?: string | null
          status_consulta?: string
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
          medico_id: string
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
          medico_id: string
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
          medico_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
