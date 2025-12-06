import { useState, useMemo } from "react";
import { Bell, Calendar, CreditCard, Clock, CheckCircle, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, addDays, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicoNotificacoesDropdownProps {
  medicoId: string;
}

interface Notification {
  id: string;
  type: "consulta" | "pagamento" | "lembrete" | "novo_paciente";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  consultaId?: string;
}

const notificationIcons = {
  consulta: <Calendar className="w-4 h-4 text-primary" />,
  pagamento: <CreditCard className="w-4 h-4 text-green-500" />,
  lembrete: <Clock className="w-4 h-4 text-yellow-500" />,
  novo_paciente: <User className="w-4 h-4 text-blue-500" />,
};

export function MedicoNotificacoesDropdown({ medicoId }: MedicoNotificacoesDropdownProps) {
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [deletedNotifications, setDeletedNotifications] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  // Fetch consultations data for notifications
  const { data: consultas } = useQuery({
    queryKey: ["medico-notificacoes", medicoId],
    queryFn: async () => {
      if (!medicoId) return [];
      
      const today = startOfDay(new Date());
      const threeDaysFromNow = addDays(today, 3);
      
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          nome_paciente_consulta,
          origem,
          created_at,
          paciente:pacientes!consultas_paciente_id_fkey(nome)
        `)
        .eq("medico_id", medicoId)
        .gte("data_hora", today.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!medicoId,
    refetchInterval: 60000, // Refetch every minute
  });

  // Generate notifications from real data
  const notifications = useMemo(() => {
    if (!consultas) return [];

    const notifs: Notification[] = [];
    const now = new Date();

    consultas.forEach((consulta: any) => {
      const consultaDate = parseISO(consulta.data_hora);
      const pacienteNome = consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente";
      const createdDate = parseISO(consulta.created_at);

      // New confirmed appointments (created in last 24 hours)
      if (
        consulta.status_consulta === "confirmada" && 
        consulta.status_pagamento === "pago" &&
        isAfter(createdDate, addDays(now, -1))
      ) {
        notifs.push({
          id: `nova-${consulta.id}`,
          type: "consulta",
          title: "Nova consulta confirmada",
          message: `${pacienteNome} agendou para ${format(consultaDate, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
          read: readNotifications.has(`nova-${consulta.id}`),
          createdAt: consulta.created_at,
          consultaId: consulta.id,
        });
      }

      // Payment received (created in last 24 hours)
      if (
        consulta.status_pagamento === "pago" &&
        isAfter(createdDate, addDays(now, -1))
      ) {
        notifs.push({
          id: `pagamento-${consulta.id}`,
          type: "pagamento",
          title: "Pagamento recebido",
          message: `Pagamento confirmado para consulta com ${pacienteNome}`,
          read: readNotifications.has(`pagamento-${consulta.id}`),
          createdAt: consulta.created_at,
          consultaId: consulta.id,
        });
      }

      // Upcoming consultation reminders (today and next 2 days)
      if (
        (consulta.status_consulta === "confirmada" || consulta.status_consulta === "agendada") &&
        isAfter(consultaDate, now) &&
        isBefore(consultaDate, addDays(now, 3))
      ) {
        const isToday = format(consultaDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
        
        notifs.push({
          id: `lembrete-${consulta.id}`,
          type: "lembrete",
          title: isToday ? "Consulta hoje" : "Consulta próxima",
          message: `${pacienteNome} - ${format(consultaDate, isToday ? "'Hoje às' HH:mm" : "dd/MM 'às' HH:mm", { locale: ptBR })}`,
          read: readNotifications.has(`lembrete-${consulta.id}`),
          createdAt: consulta.created_at,
          consultaId: consulta.id,
        });
      }
    });

    // Remove duplicates and deleted notifications
    const uniqueNotifs = notifs
      .filter((n, index, self) => 
        index === self.findIndex(t => t.id === n.id) && 
        !deletedNotifications.has(n.id)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return uniqueNotifs.slice(0, 10); // Limit to 10 notifications
  }, [consultas, readNotifications, deletedNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifications(new Set(allIds));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletedNotifications(prev => new Set([...prev, id]));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-sm">Notificações</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Todas lidas"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Marcar lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Você receberá notificações de novas consultas e lembretes aqui
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {notificationIcons[notification.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          {!notification.read && (
                            <Badge variant="default" className="shrink-0 h-4 text-[10px] px-1.5">
                              Nova
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(notification.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => deleteNotification(notification.id, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
