import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

export interface TissPendencia {
  categoria: "clinica" | "operadora" | "paciente" | "medico" | "procedimento";
  campo: string;
  mensagem: string;
  guiaLabel?: string;
  linkCorrigir?: string;
}

interface Props {
  clinicaId: string;
  loteId: string;
  onValidationChange: (isValid: boolean, pendencias: TissPendencia[]) => void;
}

const CATEGORIA_LABELS: Record<string, string> = {
  clinica: "Clínica/Unidade",
  operadora: "Operadora/Contrato",
  paciente: "Paciente/Beneficiário",
  medico: "Médico",
  procedimento: "Procedimento (TUSS)",
};

const CATEGORIA_ORDER = ["clinica", "operadora", "paciente", "medico", "procedimento"];

function getLinkCorrigir(categoria: string, _campo: string): string | undefined {
  switch (categoria) {
    case "clinica": return "/clinica/configuracoes";
    case "medico": return "/clinica/medicos";
    case "paciente": return "/clinica/pacientes";
    case "procedimento": return "/clinica/tiss/tuss";
    default: return undefined;
  }
}

export function useTissValidation(clinicaId: string | undefined, loteId: string | undefined) {
  const [pendencias, setPendencias] = useState<TissPendencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const validate = useCallback(async () => {
    if (!clinicaId || !loteId) return;
    setLoading(true);
    const erros: TissPendencia[] = [];

    try {
      // 1. Fetch clinica data
      const { data: clinica } = await supabase
        .from("clinicas")
        .select("cnpj, cidade, estado, endereco_principal")
        .eq("id", clinicaId)
        .single();

      if (!clinica?.cnpj?.trim()) {
        erros.push({ categoria: "clinica", campo: "cnpj", mensagem: "CNPJ da clínica não preenchido" });
      }
      if (!clinica?.cidade?.trim() || !clinica?.estado?.trim()) {
        erros.push({ categoria: "clinica", campo: "endereco", mensagem: "Endereço incompleto (cidade/UF)" });
      }

      // 2. Fetch lote + guias
      const { data: lote } = await supabase
        .from("tiss_lotes")
        .select("operadora, competencia")
        .eq("id", loteId)
        .single();

      if (!lote?.operadora?.trim()) {
        erros.push({ categoria: "operadora", campo: "operadora", mensagem: "Operadora não vinculada ao lote" });
      }

      // 3. Fetch guias via lote_itens
      const { data: itens } = await supabase
        .from("tiss_lote_itens")
        .select("guia_id")
        .eq("lote_id", loteId);

      const guiaIds = (itens || []).map(i => i.guia_id);
      if (guiaIds.length === 0) {
        erros.push({ categoria: "procedimento", campo: "guias", mensagem: "Lote não possui guias vinculadas" });
        setPendencias(erros);
        setValidated(true);
        setLoading(false);
        return;
      }

      const { data: guias } = await supabase
        .from("tiss_guias")
        .select("id, numero_guia, operadora, carteirinha, crm, crm_uf, medico_id, paciente_id, data_emissao")
        .in("id", guiaIds);

      // 4. Fetch guia_itens for TUSS validation
      const { data: guiaItens } = await supabase
        .from("tiss_guia_itens")
        .select("guia_id, codigo_tuss")
        .in("guia_id", guiaIds);

      // 5. Collect unique paciente/medico IDs
      const pacienteIds = [...new Set((guias || []).map(g => g.paciente_id).filter(Boolean))] as string[];
      const medicoIds = [...new Set((guias || []).map(g => g.medico_id).filter(Boolean))] as string[];

      // 6. Fetch pacientes
      const pacientesMap = new Map<string, any>();
      if (pacienteIds.length > 0) {
        const { data: pacs } = await supabase
          .from("pacientes")
          .select("id, nome, cpf")
          .in("id", pacienteIds);
        (pacs || []).forEach(p => pacientesMap.set(p.id, p));
      }

      // 7. Fetch medicos
      const medicosMap = new Map<string, any>();
      if (medicoIds.length > 0) {
        const { data: meds } = await supabase
          .from("medicos")
          .select("id, nome, crm")
          .in("id", medicoIds);
        (meds || []).forEach(m => medicosMap.set(m.id, m));
      }

      // 8. Fetch all TUSS codes used
      const codigosTuss = [...new Set((guiaItens || []).map(gi => gi.codigo_tuss))];
      const tussMap = new Map<string, any>();
      if (codigosTuss.length > 0) {
        const { data: tussRows } = await supabase
          .from("tuss_procedimentos")
          .select("codigo_tuss, vigencia_inicio, vigencia_fim")
          .in("codigo_tuss", codigosTuss);
        (tussRows || []).forEach(t => tussMap.set(t.codigo_tuss, t));
      }

      // 9. Validate each guia
      for (const g of guias || []) {
        const label = g.numero_guia || g.id.slice(0, 8);

        // Paciente checks
        if (!g.paciente_id) {
          erros.push({ categoria: "paciente", campo: "paciente_id", mensagem: "Paciente não vinculado", guiaLabel: label });
        } else {
          const pac = pacientesMap.get(g.paciente_id);
          if (!pac?.nome?.trim()) {
            erros.push({ categoria: "paciente", campo: "nome", mensagem: "Nome do paciente incompleto", guiaLabel: label });
          }
        }

        if (!g.carteirinha?.trim()) {
          erros.push({ categoria: "paciente", campo: "carteirinha", mensagem: "Nº da carteirinha ausente", guiaLabel: label });
        }

        if (!g.operadora?.trim()) {
          erros.push({ categoria: "paciente", campo: "operadora_guia", mensagem: "Operadora não vinculada na guia", guiaLabel: label });
        }

        // Medico checks
        if (!g.medico_id) {
          erros.push({ categoria: "medico", campo: "medico_id", mensagem: "Médico não vinculado", guiaLabel: label });
        } else {
          const med = medicosMap.get(g.medico_id);
          if (!med?.nome?.trim()) {
            erros.push({ categoria: "medico", campo: "nome", mensagem: "Nome do médico ausente", guiaLabel: label });
          }
          if (!g.crm?.trim() && !med?.crm?.trim()) {
            erros.push({ categoria: "medico", campo: "crm", mensagem: "CRM ausente", guiaLabel: label });
          }
          if (!g.crm_uf?.trim()) {
            erros.push({ categoria: "medico", campo: "crm_uf", mensagem: "UF do CRM ausente", guiaLabel: label });
          }
        }

        // Procedimento checks
        const thisGuiaItens = (guiaItens || []).filter(gi => gi.guia_id === g.id);
        if (thisGuiaItens.length === 0) {
          erros.push({ categoria: "procedimento", campo: "itens", mensagem: "Guia sem procedimentos TUSS", guiaLabel: label });
        } else {
          for (const gi of thisGuiaItens) {
            const tuss = tussMap.get(gi.codigo_tuss);
            if (!tuss) {
              erros.push({ categoria: "procedimento", campo: "codigo_tuss", mensagem: `Código TUSS "${gi.codigo_tuss}" não encontrado na tabela`, guiaLabel: label });
            } else {
              // Vigência check
              const dataAtend = g.data_emissao ? new Date(g.data_emissao).toISOString().split("T")[0] : null;
              if (dataAtend && tuss.vigencia_inicio && dataAtend < tuss.vigencia_inicio) {
                erros.push({ categoria: "procedimento", campo: "vigencia", mensagem: `Código TUSS "${gi.codigo_tuss}" não vigente na data do atendimento`, guiaLabel: label });
              }
              if (dataAtend && tuss.vigencia_fim && dataAtend > tuss.vigencia_fim) {
                erros.push({ categoria: "procedimento", campo: "vigencia", mensagem: `Código TUSS "${gi.codigo_tuss}" expirado na data do atendimento`, guiaLabel: label });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Erro na validação TISS:", err);
      erros.push({ categoria: "clinica", campo: "sistema", mensagem: "Erro ao validar dados. Tente novamente." });
    }

    // Add links
    erros.forEach(e => {
      e.linkCorrigir = getLinkCorrigir(e.categoria, e.campo);
    });

    setPendencias(erros);
    setValidated(true);
    setLoading(false);
  }, [clinicaId, loteId]);

  useEffect(() => {
    setValidated(false);
    setPendencias([]);
  }, [loteId]);

  return { pendencias, loading, validated, validate, isValid: validated && pendencias.length === 0 };
}

export default function TissPendenciasChecklist({ clinicaId, loteId, onValidationChange }: Props) {
  const { pendencias, loading, validated, validate, isValid } = useTissValidation(clinicaId, loteId);

  useEffect(() => {
    if (validated) {
      onValidationChange(isValid, pendencias);
    }
  }, [validated, isValid, pendencias, onValidationChange]);

  // Group by category
  const grouped = CATEGORIA_ORDER.reduce<Record<string, TissPendencia[]>>((acc, cat) => {
    const items = pendencias.filter(p => p.categoria === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const criticalCount = pendencias.length;

  return (
    <Card className={validated ? (isValid ? "border-primary/50" : "border-destructive/50") : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {validated && isValid ? (
              <ShieldCheck className="w-5 h-5 text-primary" />
            ) : validated ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            )}
            Pendências TISS
          </span>
          <Button size="sm" variant={validated ? "outline" : "default"} onClick={validate} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Validando...</> : validated ? "Revalidar" : "Validar"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!validated && !loading && (
          <p className="text-sm text-muted-foreground">Clique em "Validar" para verificar pendências obrigatórias antes de fechar o lote ou exportar XML.</p>
        )}

        {validated && isValid && (
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Todas as validações passaram! Lote pronto para fechamento e exportação.</span>
          </div>
        )}

        {validated && !isValid && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {criticalCount > 0 && <Badge variant="destructive">{criticalCount} pendência(s) obrigatória(s)</Badge>}
            </div>

            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">{CATEGORIA_LABELS[cat] || cat}</h4>
                <div className="border rounded-md divide-y">
                  {items.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                        <span className="truncate">
                          {p.mensagem}
                          {p.guiaLabel && <span className="text-muted-foreground ml-1">(Guia: {p.guiaLabel})</span>}
                        </span>
                      </div>
                      {p.linkCorrigir && (
                        <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs" asChild>
                          <a href={p.linkCorrigir} target="_blank" rel="noopener noreferrer">
                            Corrigir <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
