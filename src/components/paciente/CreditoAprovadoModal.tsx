import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  Calendar, 
  Percent, 
  DollarSign, 
  CreditCard,
  TrendingUp,
  FileText,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditoAprovadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: {
    id: string;
    nome_completo: string;
    valor_pretendido: number | null;
    valor_aprovado: number | null;
    taxa_juros_mensal: number | null;
    quantidade_parcelas: number | null;
    data_aprovacao: string | null;
    created_at: string;
    observacoes_analise: string | null;
  } | null;
}

export default function CreditoAprovadoModal({ 
  open, 
  onOpenChange, 
  solicitacao 
}: CreditoAprovadoModalProps) {
  // Cálculos financeiros
  const detalhesCredito = useMemo(() => {
    if (!solicitacao) return null;

    const valorAprovado = solicitacao.valor_aprovado || solicitacao.valor_pretendido || 0;
    const taxaMensal = solicitacao.taxa_juros_mensal || 1.99;
    const numeroParcelas = solicitacao.quantidade_parcelas || 12;

    // Cálculo de juros compostos (Price)
    const taxaDecimal = taxaMensal / 100;
    const fator = Math.pow(1 + taxaDecimal, numeroParcelas);
    const valorParcela = valorAprovado * (taxaDecimal * fator) / (fator - 1);
    const valorTotal = valorParcela * numeroParcelas;
    const jurosTotal = valorTotal - valorAprovado;
    const taxaAnual = ((Math.pow(1 + taxaDecimal, 12) - 1) * 100);

    // Gerar cronograma de parcelas
    const cronograma = [];
    const hoje = new Date();
    for (let i = 1; i <= numeroParcelas; i++) {
      const dataVencimento = new Date(hoje);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      cronograma.push({
        parcela: i,
        valor: valorParcela,
        dataVencimento,
      });
    }

    return {
      valorAprovado,
      taxaMensal,
      taxaAnual,
      numeroParcelas,
      valorParcela,
      valorTotal,
      jurosTotal,
      cronograma,
    };
  }, [solicitacao]);

  if (!solicitacao || !detalhesCredito) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Crédito Aprovado!
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-6">
            {/* Banner de sucesso */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-green-700 dark:text-green-400 font-semibold text-lg">
                🎉 Parabéns, {solicitacao.nome_completo?.split(' ')[0]}!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                Seu crédito foi aprovado com sucesso
              </p>
            </div>

            {/* Valor Aprovado - Destaque */}
            <div className="bg-primary/10 rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">Valor aprovado</p>
              <p className="text-4xl font-bold text-primary mt-1">
                R$ {detalhesCredito.valorAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Resumo das condições */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Percent className="w-4 h-4" />
                  <span className="text-xs">Taxa mensal</span>
                </div>
                <p className="text-lg font-semibold">{detalhesCredito.taxaMensal}% a.m.</p>
                <p className="text-xs text-muted-foreground">{detalhesCredito.taxaAnual.toFixed(2)}% a.a.</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Parcelas</span>
                </div>
                <p className="text-lg font-semibold">{detalhesCredito.numeroParcelas}x</p>
                <p className="text-xs text-muted-foreground">sem entrada</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Valor da parcela</span>
                </div>
                <p className="text-lg font-semibold text-primary">
                  R$ {detalhesCredito.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Total a pagar</span>
                </div>
                <p className="text-lg font-semibold">
                  R$ {detalhesCredito.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Juros: R$ {detalhesCredito.jurosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Data da aprovação */}
            {solicitacao.data_aprovacao && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Aprovado em {format(new Date(solicitacao.data_aprovacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            )}

            {/* Observações */}
            {solicitacao.observacoes_analise && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Observações</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {solicitacao.observacoes_analise}
                </p>
              </div>
            )}

            {/* Cronograma de Parcelas (primeiras 6) */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Cronograma de Pagamento
              </h4>
              <div className="space-y-2">
                {detalhesCredito.cronograma.slice(0, 6).map((item) => (
                  <div 
                    key={item.parcela}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.parcela}ª
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(item.dataVencimento, "dd/MM/yyyy")}
                      </span>
                    </div>
                    <span className="font-medium">
                      R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                {detalhesCredito.numeroParcelas > 6 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    + {detalhesCredito.numeroParcelas - 6} parcelas restantes
                  </p>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-primary/5 rounded-xl p-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Para liberar o crédito, entre em contato conosco:
              </p>
              <Button className="w-full gap-2">
                <Phone className="w-4 h-4" />
                Falar com um consultor
              </Button>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
