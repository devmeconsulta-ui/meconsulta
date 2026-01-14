import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Participante {
  id: string;
  nome: string;
  tipo: "medico" | "funcionario" | "admin_clinica";
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  participantes: Participante[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  participantes,
  disabled,
  placeholder = "Digite sua mensagem...",
  className,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Participante[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detectar @ e mostrar sugestões
  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    
    // Encontrar o último @ antes do cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      // Verificar se não há espaço entre @ e o cursor
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Se tem espaço logo após @, não mostrar sugestões
      if (textAfterAt.includes(" ")) {
        setShowSuggestions(false);
        setMentionStart(null);
        return;
      }
      
      // Filtrar participantes pelo texto após @
      const filtered = participantes.filter((p) =>
        p.nome.toLowerCase().includes(textAfterAt.toLowerCase())
      );
      
      if (filtered.length > 0 || textAfterAt === "") {
        setMentionStart(lastAtIndex);
        setSuggestions(filtered.length > 0 ? filtered : participantes);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
      setMentionStart(null);
    }
  }, [onChange, participantes]);

  // Inserir menção
  const insertMention = useCallback((participante: Participante) => {
    if (mentionStart === null) return;
    
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const beforeMention = value.substring(0, mentionStart);
    const afterCursor = value.substring(cursorPos);
    
    const mention = `@${participante.nome} `;
    const newValue = beforeMention + mention + afterCursor;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);
    
    // Focar no textarea e posicionar cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = mentionStart + mention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [mentionStart, value, onChange]);

  // Navegar pelas sugestões com teclado
  const handleKeyDownInternal = useCallback((e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          insertMention(suggestions[selectedIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          insertMention(suggestions[selectedIndex]);
        }
        return;
      }
    }
    
    onKeyDown(e);
  }, [showSuggestions, suggestions, selectedIndex, insertMention, onKeyDown]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll para item selecionado
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, showSuggestions]);

  const getParticipanteIcon = (tipo: string) => {
    if (tipo === "medico") return "🩺";
    if (tipo === "admin_clinica") return "👤";
    return "👥";
  };

  return (
    <div className="relative flex-1">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDownInternal}
        disabled={disabled}
        className={cn("min-h-[44px] max-h-32 resize-none", className)}
        rows={1}
      />
      
      {/* Sugestões de menção */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto"
        >
          <div className="p-1">
            <p className="px-2 py-1 text-xs text-muted-foreground font-medium">
              Mencionar alguém
            </p>
            {suggestions.map((p, index) => (
              <button
                key={p.id}
                data-index={index}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => insertMention(p)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getParticipanteIcon(p.tipo)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{p.nome}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {p.tipo === "medico" ? "Médico" : p.tipo === "admin_clinica" ? "Admin" : "Funcionário"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
