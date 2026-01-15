import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  className?: string;
}

function MetricCard({ title, value, subtitle, icon, trend, variant = "default", className }: MetricCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent",
    warning: "border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent",
    danger: "border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent",
    primary: "border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent",
  };

  const iconBgStyles = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
    primary: "bg-primary/10 text-primary",
  };

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-lg", variantStyles[variant], className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                )}
                <span className={cn("text-xs font-medium", trend.isPositive ? "text-emerald-500" : "text-red-500")}>
                  {trend.value}% vs mês anterior
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", iconBgStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FinanceiroHeaderProps {
  faturamento: number;
  aReceber: number;
  aPagar: number;
  saldoPrevisto: number;
  caixaAberto?: boolean;
  saldoCaixa?: number;
  vencimentosHoje: number;
  vencimentosAtrasados: number;
  formatCurrency: (value: number) => string;
}

export function FinanceiroHeader({
  faturamento,
  aReceber,
  aPagar,
  saldoPrevisto,
  caixaAberto = false,
  saldoCaixa = 0,
  vencimentosHoje,
  vencimentosAtrasados,
  formatCurrency,
}: FinanceiroHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Status do Caixa */}
      <div className="flex items-center justify-between bg-card border rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            caixaAberto ? "bg-emerald-500" : "bg-red-500"
          )} />
          <div>
            <p className="text-sm font-medium">
              Caixa {caixaAberto ? "Aberto" : "Fechado"}
            </p>
            {caixaAberto && (
              <p className="text-xs text-muted-foreground">
                Saldo atual: {formatCurrency(saldoCaixa)}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {vencimentosAtrasados > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{vencimentosAtrasados} vencido(s)</span>
            </div>
          )}
          {vencimentosHoje > 0 && (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{vencimentosHoje} vence(m) hoje</span>
            </div>
          )}
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Faturamento"
          value={formatCurrency(faturamento)}
          subtitle="Consultas pagas"
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
          trend={{ value: 12.5, isPositive: true }}
        />
        
        <MetricCard
          title="A Receber"
          value={formatCurrency(aReceber)}
          subtitle="Contas pendentes"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="primary"
        />
        
        <MetricCard
          title="A Pagar"
          value={formatCurrency(aPagar)}
          subtitle="Contas pendentes"
          icon={<TrendingDown className="w-5 h-5" />}
          variant="warning"
        />
        
        <MetricCard
          title="Saldo Previsto"
          value={formatCurrency(saldoPrevisto)}
          subtitle="Entradas - Saídas"
          icon={<Wallet className="w-5 h-5" />}
          variant={saldoPrevisto >= 0 ? "success" : "danger"}
        />
      </div>
    </div>
  );
}
