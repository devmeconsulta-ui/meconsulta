import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  clinicaId: string | null;
  value: string;
  onChange: (v: string) => void;
}

export function WacConexaoSelect({ clinicaId, value, onChange }: Props) {
  const [conexoes, setConexoes] = useState<{ id: string; nome: string; display_phone: string | null }[]>([]);

  useEffect(() => {
    if (!clinicaId) return;
    (supabase as any)
      .from("wac_conexoes")
      .select("id, nome, display_phone")
      .eq("clinica_id", clinicaId)
      .order("nome")
      .then(({ data }: any) => setConexoes(data || []));
  }, [clinicaId]);

  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um número oficial" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhum</SelectItem>
        {conexoes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome}
            {c.display_phone ? ` · ${c.display_phone}` : ""} (Oficial)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
