import { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  Upload, 
  Download, 
  RefreshCw, 
  Info, 
  CheckCircle, 
  XCircle,
  History,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, Notification, HistoryItem } from '@/hooks/useNotifications';
import { useUpdateStatus } from '@/hooks/useUpdateStatus';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UpdateProgressModal } from './UpdateProgressModal';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'update':
      return <RefreshCw className="w-4 h-4 text-amber-500" />;
    case 'upload':
      return <Upload className="w-4 h-4 text-green-500" />;
    case 'delete':
      return <Trash2 className="w-4 h-4 text-red-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

const getHistoryIcon = (type: HistoryItem['type']) => {
  switch (type) {
    case 'upload':
      return <Upload className="w-4 h-4 text-green-500" />;
    case 'delete':
      return <Trash2 className="w-4 h-4 text-red-500" />;
    case 'edit':
      return <RefreshCw className="w-4 h-4 text-blue-500" />;
    case 'tag':
      return <Check className="w-4 h-4 text-purple-500" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export function NotificationCenter() {
  const { 
    notifications, 
    history, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    clearAllNotifications,
    clearHistory,
    unreadCount 
  } = useNotifications();
  const { hasUpdate, commitsBehind } = useUpdateStatus();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [, forceUpdate] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Get version info from localStorage
  const currentVersion = localStorage.getItem('mediavault-local-version') || '';
  const newVersion = localStorage.getItem('mediavault-latest-full-sha') || '';

  // Listen for notification events to force re-render
  useEffect(() => {
    const handleNotificationAdded = () => {
      forceUpdate((n) => n + 1);
    };
    window.addEventListener('mediavault-notification-added', handleNotificationAdded);
    return () => window.removeEventListener('mediavault-notification-added', handleNotificationAdded);
  }, []);

  const handleAction = (action: Notification['action']) => {
    if (!action) return;
    
    switch (action.handler) {
      case 'triggerUpdate':
        handleStartUpdate();
        break;
      case 'openAdmin':
        window.dispatchEvent(new CustomEvent('open-admin-updates'));
        setOpen(false);
        break;
      default:
        console.log('Unknown action:', action.handler);
    }
  };

  const getServerUrl = useCallback(() => {
    const serverUrl = localStorage.getItem('mediavault-admin-settings');
    let baseUrl = 'http://localhost:3001';
    try {
      if (serverUrl) {
        const settings = JSON.parse(serverUrl);
        baseUrl = settings.localServerUrl || baseUrl;
      }
    } catch (e) {
      // Use default
    }
    return baseUrl;
  }, []);

  const triggerUpdateScript = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${getServerUrl()}/api/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ silent: true }),
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  }, [getServerUrl]);

  const handleStartUpdate = () => {
    setOpen(false);
    setShowUpdateModal(true);
  };

  const count = unreadCount();
  const totalUnread = count + (hasUpdate && !notifications.some(n => n.type === 'update' && !n.read) ? 1 : 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <TabsList className="grid w-full max-w-[200px] grid-cols-2">
              <TabsTrigger value="notifications" className="gap-1.5 text-xs">
                <Bell className="w-3.5 h-3.5" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="w-3.5 h-3.5" />
                Historique
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notifications" className="m-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground">
                {count > 0 ? `${count} non lue${count > 1 ? 's' : ''}` : 'Aucune notification'}
              </span>
              {count > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={markAllAsRead}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Tout marquer lu
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[300px]">
              {/* Show update notification if available and not already in list */}
              {hasUpdate && !notifications.some(n => n.type === 'update' && !n.read) && (
                <div className="flex gap-3 p-4 border-b bg-amber-500/5 hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">Mise à jour disponible</p>
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {currentVersion.substring(0, 7)} → {newVersion.substring(0, 7)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {commitsBehind > 0 
                        ? `${commitsBehind} mise${commitsBehind > 1 ? 's' : ''} à jour à installer`
                        : 'Nouvelle version disponible'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={handleStartUpdate}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Mettre à jour
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-admin-updates'));
                          setOpen(false);
                        }}
                      >
                        Détails
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {notifications.length === 0 && !hasUpdate ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "flex gap-3 p-4 border-b hover:bg-muted/50 transition-colors cursor-pointer group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm",
                          !notification.read && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.action && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(notification.action);
                          }}
                        >
                          {notification.action.label}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
            
            {notifications.length > 0 && (
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs text-muted-foreground"
                  onClick={clearAllNotifications}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Effacer toutes les notifications
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground">
                {history.length > 0 ? `${history.length} action${history.length > 1 ? 's' : ''}` : 'Aucun historique'}
              </span>
              {history.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={clearHistory}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[300px]">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Aucun historique</p>
                  <p className="text-xs mt-1">Les actions apparaîtront ici</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    className="flex gap-3 p-4 border-b hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getHistoryIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                      {item.mediaName && (
                        <p className="text-xs text-primary mt-1 truncate">
                          {item.mediaName}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>

      {/* Update Progress Modal */}
      <UpdateProgressModal
        open={showUpdateModal}
        onOpenChange={setShowUpdateModal}
        currentVersion={currentVersion}
        newVersion={newVersion}
        commitsBehind={commitsBehind}
        onStartUpdate={triggerUpdateScript}
      />
    </Popover>
  );
}
