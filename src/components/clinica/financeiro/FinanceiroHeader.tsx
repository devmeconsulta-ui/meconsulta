import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, Globe, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  variant?: "default" | "success" | "warning" | "danger" | "primary" | "blue" | "purple";
  className?: string;
}

function MetricCard({ title, value, subtitle, icon, trend, variant = "default", className }: MetricCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent",
    warning: "border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent",
    danger: "border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent",
    primary: "border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent",
    blue: "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent",
    purple: "border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent",
  };

  const iconBgStyles = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
  };

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-lg", variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
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
          <div className={cn("p-2 rounded-xl", iconBgStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FinanceiroHeaderProps {
  // Online metrics
  faturamentoOnline: number;
  saldoPrevistoOnline: number;
  // Interno metrics
  faturamentoInterno: number;
  saldoPrevistoInterno: number;
  // Geral
  aReceber: number;
  aPagar: number;
  saldoPrevistoGeral: number;
  // Caixa
  caixaAberto?: boolean;
  saldoCaixa?: number;
  vencimentosHoje: number;
  vencimentosAtrasados: number;
  formatCurrency: (value: number) => string;
}

export function FinanceiroHeader({
  faturamentoOnline,
  saldoPrevistoOnline,
  faturamentoInterno,
  saldoPrevistoInterno,
  aReceber,
  aPagar,
  saldoPrevistoGeral,
  caixaAberto = false,
  saldoCaixa = 0,
  vencimentosHoje,
  vencimentosAtrasados,
  formatCurrency,
}: FinanceiroHeaderProps) {
  return (
    <div className="space-y-4">
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

      {/* Linha 1 - Faturamento e Saldos por Origem */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Faturamento Online"
          value={formatCurrency(faturamentoOnline)}
          subtitle="Consultas pagas pela plataforma"
          icon={<Globe className="w-5 h-5" />}
          variant="success"
        />
        
        <MetricCard
          title="Saldo Online"
          value={formatCurrency(saldoPrevistoOnline)}
          subtitle="Entradas - Saídas online"
          icon={<Globe className="w-5 h-5" />}
          variant={saldoPrevistoOnline >= 0 ? "success" : "danger"}
        />
        
        <MetricCard
          title="Faturamento Interno"
          value={formatCurrency(faturamentoInterno)}
          subtitle="Consultas agendadas internamente"
          icon={<Building2 className="w-5 h-5" />}
          variant="blue"
        />
        
        <MetricCard
          title="Saldo Interno"
          value={formatCurrency(saldoPrevistoInterno)}
          subtitle="Entradas - Saídas internas"
          icon={<Building2 className="w-5 h-5" />}
          variant={saldoPrevistoInterno >= 0 ? "blue" : "danger"}
        />
      </div>

      {/* Linha 2 - Contas e Previsão Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="A Receber"
          value={formatCurrency(aReceber)}
          subtitle="Consultas + contas pendentes"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="primary"
        />
        
        <MetricCard
          title="A Pagar"
          value={formatCurrency(aPagar)}
          subtitle="Contas a vencer"
          icon={<TrendingDown className="w-5 h-5" />}
          variant="warning"
        />
        
        <MetricCard
          title="Previsão Geral"
          value={formatCurrency(saldoPrevistoGeral)}
          subtitle="Online + Interno - Despesas"
          icon={<Wallet className="w-5 h-5" />}
          variant={saldoPrevistoGeral >= 0 ? "purple" : "danger"}
        />
      </div>
    </div>
  );
}
