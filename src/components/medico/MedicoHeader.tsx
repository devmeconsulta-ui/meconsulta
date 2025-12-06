import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Cloud, Sun, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

interface MedicoHeaderProps {
  medicoData: any;
  isAtendente?: boolean;
}

export function MedicoHeader({ medicoData, isAtendente }: MedicoHeaderProps) {
  const { currentUser } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather] = useState({ temp: 26, condition: "sunny" });

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = () => {
    switch (weather.condition) {
      case "sunny":
        return <Sun className="w-5 h-5 text-secondary" />;
      case "cloudy":
        return <Cloud className="w-5 h-5 text-muted-foreground" />;
      case "rainy":
        return <CloudRain className="w-5 h-5 text-primary" />;
      default:
        return <Sun className="w-5 h-5 text-secondary" />;
    }
  };

  // Use appropriate greeting based on user type
  const userName = currentUser?.nome || "Usuário";
  const greeting = isAtendente 
    ? `Olá, ${userName.split(" ")[0]}!` 
    : `Olá, Dr(a). ${(medicoData?.nome || userName).split(" ")[0]}!`;

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="ml-12 lg:ml-0">
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">
            {greeting} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} •{" "}
            {format(currentTime, "HH:mm")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Weather */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50">
            {getWeatherIcon()}
            <span className="text-sm font-medium">{weather.temp}°C</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
