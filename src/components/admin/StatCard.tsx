import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{value}</p>
            {description && (
              <p
                className={cn(
                  "text-[10px] sm:text-xs truncate",
                  trend === "up" && "text-green-600",
                  trend === "down" && "text-red-600",
                  !trend && "text-muted-foreground"
                )}
              >
                {description}
              </p>
            )}
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
