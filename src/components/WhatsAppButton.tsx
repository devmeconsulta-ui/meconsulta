import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

const WhatsAppButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Chat Bubble */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 bg-card rounded-2xl shadow-2xl p-4 w-72 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-foreground">Whatsapp</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Olá! 👋 Seja bem-vindo(a) à MeConsulta. Como podemos te ajudar hoje? 😊
          </p>
          <a 
            href="https://wa.me/553832147415"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full bg-whatsapp text-primary-foreground text-center py-2 rounded-xl text-sm font-medium hover:bg-whatsapp/90 transition-colors"
          >
            Iniciar conversa
          </a>
        </div>
      )}

      {/* WhatsApp Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-whatsapp rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      >
        <MessageCircle className="w-7 h-7 text-primary-foreground" />
      </button>
    </div>
  );
};

export default WhatsAppButton;
