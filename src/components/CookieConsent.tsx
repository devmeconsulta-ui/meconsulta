import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookieConsent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">
                Utilizamos cookies 🍪
              </h3>
              <p className="text-sm text-muted-foreground">
                Usamos cookies para melhorar sua experiência de navegação, personalizar conteúdo e analisar nosso tráfego. 
                Ao clicar em "Aceitar", você concorda com o uso de cookies conforme nossa{" "}
                <Link to="/politica-privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={declineCookies}
              className="flex-1 md:flex-none"
            >
              Recusar
            </Button>
            <Button
              size="sm"
              onClick={acceptCookies}
              className="flex-1 md:flex-none bg-primary hover:bg-primary/90"
            >
              Aceitar
            </Button>
          </div>
          
          <button
            onClick={declineCookies}
            className="absolute top-2 right-2 md:static p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
