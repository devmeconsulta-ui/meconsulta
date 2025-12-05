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
          id: string
          local_id: string
          medico_id: string
        }
        Insert: {
          created_at?: string | null
          data_hora: string
          disponivel?: boolean | null
          id?: string
          local_id: string
          medico_id: string
        }
        Update: {
          created_at?: string | null
          data_hora?: string
          disponivel?: boolean | null
          id?: string
          local_id?: string
          medico_id?: string
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
          created_at?: string | null
          id?: string
          medico_id?: string
          nota?: number
          paciente_id?: string
          resposta_medico?: string | null
        }
        Relationships: [
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
      consultas: {
        Row: {
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          created_at: string | null
          data_hora: string
          dependente_id: string | null
          id: string
          medico_id: string | null
          motivo_consulta: string | null
          nome_paciente_consulta: string | null
          observacoes_paciente: string | null
          paciente_id: string | null
          sintomas: string | null
          status_consulta: string
          status_pagamento: string
          status_repasse: string
          tipo_servico: string | null
          valor_consulta: number
          valor_medico: number
          valor_plataforma: number
        }
        Insert: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string | null
          data_hora: string
          dependente_id?: string | null
          id?: string
          medico_id?: string | null
          motivo_consulta?: string | null
          nome_paciente_consulta?: string | null
          observacoes_paciente?: string | null
          paciente_id?: string | null
          sintomas?: string | null
          status_consulta?: string
          status_pagamento?: string
          status_repasse?: string
          tipo_servico?: string | null
          valor_consulta: number
          valor_medico: number
          valor_plataforma: number
        }
        Update: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string | null
          data_hora?: string
          dependente_id?: string | null
          id?: string
          medico_id?: string | null
          motivo_consulta?: string | null
          nome_paciente_consulta?: string | null
          observacoes_paciente?: string | null
          paciente_id?: string | null
          sintomas?: string | null
          status_consulta?: string
          status_pagamento?: string
          status_repasse?: string
          tipo_servico?: string | null
          valor_consulta?: number
          valor_medico?: number
          valor_plataforma?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultas_dependente_id_fkey"
            columns: ["dependente_id"]
            isOneToOne: false
            referencedRelation: "paciente_dependentes"
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
      locais_atendimento: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
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
            foreignKeyName: "locais_atendimento_medico_id_fkey"
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
          email?: string
          id?: string
          nome?: string
          papel?: string | null
          senha_hash?: string | null
          tipo?: string
        }
        Relationships: []
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
