import { useState, useEffect } from "react";
import { Bell, User, LogOut, Stethoscope, Cloud, Sun, CloudRain, CloudSun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock weather data - can be replaced with real API integration
const mockWeather = {
  location: "Brasília – Brasil",
  temperature: 28,
  condition: "Ensolarado",
  icon: "sun" as "sun" | "cloud" | "rain" | "cloudy",
};

const weatherIcons = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  cloudy: CloudSun,
};

export function AdminHeader() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather] = useState(mockWeather);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  // Format date in Brazilian Portuguese
  const formattedDate = format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  // Format time
  const formattedTime = format(currentTime, "HH:mm:ss", {
    locale: ptBR,
  });

  const WeatherIcon = weatherIcons[weather.icon];

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col gap-3 ml-10 lg:ml-0">
          {/* Welcome Text */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/20 backdrop-blur-sm items-center justify-center">
              <Stethoscope className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-[10px] sm:text-xs font-medium">
                Bem-vindo de volta,
              </p>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-foreground">
                {currentUser?.nome || "Administrador"}
              </h1>
            </div>
          </div>

          {/* Date, Time & Weather */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Date & Time */}
            <div className="text-primary-foreground/90">
              <p className="text-[10px] sm:text-xs capitalize">{formattedDate}</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold font-roboto tracking-tight">
                {formattedTime}
              </p>
            </div>

            {/* Weather Card */}
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 backdrop-blur-sm">
              <WeatherIcon className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              <div>
                <p className="text-[8px] sm:text-[10px] text-primary-foreground/70">{weather.location}</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold text-primary-foreground">
                    {weather.temperature}°C
                  </span>
                  <span className="hidden sm:inline text-[10px] sm:text-xs text-primary-foreground/80">
                    {weather.condition}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="h-12 sm:h-14 flex items-center justify-end px-4 sm:px-6 lg:px-8 bg-card">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-8 sm:h-10 px-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {currentUser?.nome?.split(" ")[0] || "Admin"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
