import { useState, useEffect } from "react";
import { Bell, User, LogOut, Stethoscope, Cloud, Sun, CloudRain, CloudSun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Fetch recent consultations for notifications
  const { data: recentConsultas } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id, data_hora, status_consulta, status_pagamento, origem,
          medico:medicos!consultas_medico_id_fkey(nome),
          paciente:pacientes!consultas_paciente_id_fkey(nome)
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Generate notifications from data
  const notifications = recentConsultas?.map((consulta: any) => {
    let type = "info";
    let message = "";
    
    if (consulta.status_pagamento === "pago") {
      type = "success";
      message = `Pagamento confirmado - ${consulta.paciente?.nome || "Paciente"}`;
    } else if (consulta.status_consulta === "confirmada") {
      type = "info";
      message = `Nova consulta confirmada - Dr(a) ${consulta.medico?.nome || "Médico"}`;
    } else if (consulta.status_consulta === "aguardando_pagamento") {
      type = "warning";
      message = `Aguardando pagamento - ${consulta.paciente?.nome || "Paciente"}`;
    } else {
      message = `Consulta ${consulta.status_consulta} - ${consulta.paciente?.nome || "Paciente"}`;
    }

    return {
      id: consulta.id,
      type,
      message,
      time: format(new Date(consulta.data_hora), "dd/MM HH:mm", { locale: ptBR }),
    };
  }) || [];

  const unreadCount = notifications.length;

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
      <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Welcome Text - left side with padding for mobile menu */}
          <div className="flex items-center gap-3 pl-12 lg:pl-0">
            <div className="hidden sm:flex w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/20 backdrop-blur-sm items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-primary-foreground/80 text-[10px] sm:text-xs font-medium">
                Bem-vindo de volta,
              </p>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-foreground truncate">
                {currentUser?.nome || "Administrador"}
              </h1>
            </div>
          </div>

          {/* Date, Time & Weather - right side */}
          <div className="flex items-center gap-3 sm:gap-4 pl-12 lg:pl-0">
            {/* Date & Time */}
            <div className="text-primary-foreground/90">
              <p className="text-[10px] sm:text-xs capitalize hidden sm:block">{formattedDate}</p>
              <p className="text-[10px] sm:text-xs capitalize sm:hidden">
                {format(currentTime, "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold font-roboto tracking-tight">
                {formattedTime}
              </p>
            </div>

            {/* Weather Card */}
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 backdrop-blur-sm shrink-0">
              <WeatherIcon className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              <div>
                <p className="text-[8px] sm:text-[10px] text-primary-foreground/70 truncate max-w-[60px] sm:max-w-none">{weather.location}</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold text-primary-foreground">
                    {weather.temperature}°C
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
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10 touch-manipulation">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-destructive text-destructive-foreground text-[10px] sm:text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-muted-foreground">{unreadCount} novas</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[280px] sm:h-[320px]">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      onClick={() => navigate("/admin/consultas")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          notification.type === "success" ? "bg-green-500" :
                          notification.type === "warning" ? "bg-yellow-500" :
                          "bg-blue-500"
                        }`} />
                        <span className="text-sm font-medium truncate flex-1">{notification.message}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-4">{notification.time}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma notificação
                  </div>
                )}
              </ScrollArea>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-center justify-center text-primary text-sm"
                onClick={() => navigate("/admin/consultas")}
              >
                Ver todas as consultas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
