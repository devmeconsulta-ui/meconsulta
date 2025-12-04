import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Stethoscope, Cloud, Sun, CloudRain, CloudSun } from "lucide-react";
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

export function WelcomeHeader() {
  const { currentUser } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather] = useState(mockWeather);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date in Brazilian Portuguese
  const formattedDate = format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  // Format time in Brasília timezone (UTC-3)
  const formattedTime = format(currentTime, "HH:mm:ss", {
    locale: ptBR,
  });

  const WeatherIcon = weatherIcons[weather.icon];

  return (
    <div className="mb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 lg:p-8">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Welcome Text */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm items-center justify-center">
              <Stethoscope className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium">
                Bem-vindo de volta,
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground">
                {currentUser?.nome || "Administrador"}
              </h1>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="text-primary-foreground/90">
              <p className="text-sm capitalize">{formattedDate}</p>
              <p className="text-2xl lg:text-3xl font-bold font-roboto tracking-tight">
                {formattedTime}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Card */}
      <div className="mt-4 flex justify-end">
        <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <WeatherIcon className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{weather.location}</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {weather.temperature}°C
              </span>
              <span className="text-sm text-muted-foreground">
                {weather.condition}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
