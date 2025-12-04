import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Trash2,
  CheckCheck
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock notifications - in production, these would come from Supabase
const mockNotifications = [
  {
    id: "1",
    type: "consulta",
    title: "Consulta confirmada",
    message: "Sua consulta com Dr. João Silva foi confirmada para amanhã às 14:00.",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    type: "pagamento",
    title: "Pagamento pendente",
    message: "Você tem um pagamento pendente para a consulta do dia 15/12.",
    read: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    type: "lembrete",
    title: "Lembrete de consulta",
    message: "Sua consulta com Dra. Maria Santos é em 2 dias.",
    read: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const notificationIcons = {
  consulta: <Calendar className="w-5 h-5 text-primary" />,
  pagamento: <CreditCard className="w-5 h-5 text-destructive" />,
  lembrete: <Clock className="w-5 h-5 text-yellow-500" />,
  sistema: <Bell className="w-5 h-5 text-muted-foreground" />,
};

export default function PacienteNotificacoes() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação(ões) não lida(s)`
              : "Todas as notificações foram lidas"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Marcar todas como lidas
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar todas
          </Button>
        </div>
      </div>

      <Tabs defaultValue="todas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="todas">
            Todas ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="nao-lidas">
            Não lidas ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="lidas">
            Lidas ({notifications.length - unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="mt-6">
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
  notifications: typeof mockNotifications;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
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
                {notificationIcons[notification.type as keyof typeof notificationIcons] ||
                  notificationIcons.sistema}
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
                <div className="flex gap-2 mt-3">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsRead(notification.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Marcar como lida
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(notification.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
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
