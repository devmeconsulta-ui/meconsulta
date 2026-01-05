import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  Clock,
  Trash2,
  CheckCheck,
  ExternalLink
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, isAfter, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PacienteContext = {
  pacienteData: {
    id: string;
    nome: string;
  } | null;
};

interface Notification {
  id: string;
  type: "consulta" | "pagamento" | "lembrete";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  consultaId?: string;
  invoiceUrl?: string;
}

const notificationIcons = {
  consulta: <Calendar className="w-5 h-5 text-primary" />,
  pagamento: <CreditCard className="w-5 h-5 text-destructive" />,
  lembrete: <Clock className="w-5 h-5 text-yellow-500" />,
  sistema: <Bell className="w-5 h-5 text-muted-foreground" />,
};

export default function PacienteNotificacoes() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [deletedNotifications, setDeletedNotifications] = useState<Set<string>>(new Set());

  // Fetch real consultations data
  const { data: consultas, isLoading } = useQuery({
    queryKey: ["paciente-notificacoes", pacienteData?.id],
    queryFn: async () => {
      if (!pacienteData?.id) return [];
      
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          asaas_invoice_url,
          created_at,
          medicos:medico_id (nome, especialidade)
        `)
        .eq("paciente_id", pacienteData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pacienteData?.id,
  });

  // Generate notifications from real data
  const notifications = useMemo(() => {
    if (!consultas) return [];

    const notifs: Notification[] = [];
    const now = new Date();

    consultas.forEach((consulta: any) => {
      const consultaDate = parseISO(consulta.data_hora);
      const medicoNome = consulta.medicos?.nome || "Médico";

      // Pending payment notifications
      if (consulta.status_pagamento === "pendente" && consulta.status_consulta === "aguardando_pagamento") {
        notifs.push({
          id: `pagamento-${consulta.id}`,
          type: "pagamento",
          title: "Pagamento pendente",
          message: `Você tem um pagamento pendente para a consulta com ${medicoNome} em ${format(consultaDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
          read: readNotifications.has(`pagamento-${consulta.id}`),
          createdAt: consulta.created_at,
          consultaId: consulta.id,
          invoiceUrl: consulta.asaas_invoice_url,
        });
      }

      // Confirmed consultation notifications
      if (consulta.status_consulta === "confirmada" && consulta.status_pagamento === "pago") {
        notifs.push({
          id: `confirmada-${consulta.id}`,
          type: "consulta",
          title: "Consulta confirmada",
          message: `Sua consulta com ${medicoNome} foi confirmada para ${format(consultaDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
          read: readNotifications.has(`confirmada-${consulta.id}`),
          createdAt: consulta.created_at,
          consultaId: consulta.id,
        });
      }

      // Upcoming consultation reminders (within next 3 days)
      if (
        (consulta.status_consulta === "confirmada" || consulta.status_pagamento === "pago") &&
        isAfter(consultaDate, now) &&
        isAfter(addDays(now, 3), consultaDate)
      ) {
        notifs.push({
          id: `lembrete-${consulta.id}`,
          type: "lembrete",
          title: "Lembrete de consulta",
          message: `Sua consulta com ${medicoNome} é em ${format(consultaDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}. Não se esqueça!`,
          read: readNotifications.has(`lembrete-${consulta.id}`),
          createdAt: new Date().toISOString(),
          consultaId: consulta.id,
        });
      }
    });

    // Filter out deleted notifications and sort by date
    return notifs
      .filter(n => !deletedNotifications.has(n.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [consultas, readNotifications, deletedNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifications(new Set(allIds));
  };

  const deleteNotification = (id: string) => {
    setDeletedNotifications(prev => new Set([...prev, id]));
  };

  const clearAll = () => {
    const allIds = notifications.map(n => n.id);
    setDeletedNotifications(new Set(allIds));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Notificações</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação(ões) não lida(s)`
              : notifications.length > 0 
                ? "Todas as notificações foram lidas"
                : "Você não tem notificações"}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <CheckCheck className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Marcar todas como lidas</span>
              <span className="sm:hidden">Marcar lidas</span>
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Limpar todas</span>
              <span className="sm:hidden">Limpar</span>
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="todas" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="todas" className="text-xs sm:text-sm">
            Todas ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="nao-lidas" className="text-xs sm:text-sm">
            Não lidas ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="lidas" className="text-xs sm:text-sm">
            Lidas ({notifications.length - unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="mt-4 sm:mt-6">
          <NotificationList
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        </TabsContent>

        <TabsContent value="nao-lidas" className="mt-6">
          <NotificationList
            notifications={notifications.filter(n => !n.read)}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        </TabsContent>

        <TabsContent value="lidas" className="mt-6">
          <NotificationList
            notifications={notifications.filter(n => n.read)}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({
  notifications,
  onMarkAsRead,
  onDelete,
}: {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  if (notifications.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="py-12 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Nenhuma notificação</p>
          <p className="text-muted-foreground">
            Você não tem notificações nesta categoria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map(notification => (
        <Card
          key={notification.id}
          className={`card-shadow transition-colors ${
            !notification.read ? "border-primary/30 bg-primary/5" : ""
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {notificationIcons[notification.type] || notificationIcons.sistema}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(notification.createdAt), "dd 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <Badge variant="default" className="shrink-0">
                      Nova
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                  {notification.type === "pagamento" && notification.consultaId && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs sm:text-sm h-8"
                      onClick={() => navigate(`/pagamento/${notification.consultaId}`)}
                    >
                      <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                      Pagar
                    </Button>
                  )}
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs sm:text-sm h-8"
                      onClick={() => onMarkAsRead(notification.id)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Marcar como lida</span>
                      <span className="sm:hidden ml-1">Lida</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs sm:text-sm h-8"
                    onClick={() => onDelete(notification.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
