import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OmniContato {
  id: string;
  nome: string;
  telefone: string;
  documento: string | null;
  email: string | null;
  instagram: string | null;
  empresa: string | null;
  observacoes: string | null;
  paciente_id: string | null;
}

interface UseOmniContatoAutofillProps {
  clinicaId: string | null;
}

export function useOmniContatoAutofill({ clinicaId }: UseOmniContatoAutofillProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<OmniContato[]>([]);

  const searchContatos = useCallback(async (query: string) => {
    if (!clinicaId || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const cleanQuery = query.trim().toLowerCase();
      const phoneQuery = query.replace(/\D/g, "");

      // Search by name or phone
      let queryBuilder = supabase
        .from("omni_contatos")
        .select("id, nome, telefone, documento, email, instagram, empresa, observacoes, paciente_id")
        .eq("clinica_id", clinicaId);

      if (phoneQuery.length >= 4) {
        // If query looks like a phone number, search by phone
        queryBuilder = queryBuilder.ilike("telefone", `%${phoneQuery}%`);
      } else {
        // Otherwise search by name
        queryBuilder = queryBuilder.ilike("nome", `%${cleanQuery}%`);
      }

      const { data, error } = await queryBuilder.limit(5);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error searching contacts:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [clinicaId]);

  const getContatoByPhone = useCallback(async (phone: string): Promise<OmniContato | null> => {
    if (!clinicaId) return null;

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return null;

    try {
      const { data, error } = await supabase
        .from("omni_contatos")
        .select("id, nome, telefone, documento, email, instagram, empresa, observacoes, paciente_id")
        .eq("clinica_id", clinicaId)
        .eq("telefone", cleanPhone)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching contact by phone:", error);
      return null;
    }
  }, [clinicaId]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    isSearching,
    suggestions,
    searchContatos,
    getContatoByPhone,
    clearSuggestions,
  };
}
