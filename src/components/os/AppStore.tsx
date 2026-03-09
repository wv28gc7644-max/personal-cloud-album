import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { webStoreApps, serverStoreApps } from '@/data/osApps';
import { OSApp } from '@/types/os';
import * as LucideIcons from 'lucide-react';
import { Search, Download, Check, Server, Globe, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const AppCard = memo(({ app, isInstalled, onInstall, onUninstall }: {
  app: OSApp;
  isInstalled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}) => {
  const IconComponent = (LucideIcons as any)[app.icon] || LucideIcons.HelpCircle;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
        <IconComponent className="w-7 h-7 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">{app.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{app.description}</p>
        {app.version && (
          <span className="text-xs text-muted-foreground">v{app.version}</span>
        )}
      </div>

      {isInstalled ? (
        <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={onUninstall}>
          <Check className="w-3 h-3" />
          Installé
        </Button>
      ) : (
        <Button size="sm" className="gap-1 shrink-0" onClick={onInstall}>
          <Download className="w-3 h-3" />
          Installer
        </Button>
      )}
    </motion.div>
  );
});
AppCard.displayName = 'AppCard';

export const AppStore = memo(() => {
  const { installedApps, installApp, uninstallApp, addToDock } = useOS();
  const [activeTab, setActiveTab] = useState<'web' | 'server'>('web');
  const [search, setSearch] = useState('');

  const currentApps = activeTab === 'web' ? webStoreApps : serverStoreApps;
  const filteredApps = search
    ? currentApps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : currentApps;

  const isInstalled = (appId: string) => installedApps.some(a => a.id === appId);

  const handleInstall = (app: OSApp) => {
    installApp(app);
    addToDock(app.id);
    
    if (app.storeType === 'server' && app.installScript) {
      toast.info(`Installation serveur requise`, {
        description: `Lancez "${app.installScript}" pour configurer ${app.name} en local.`,
        duration: 8000,
      });
    } else {
      toast.success(`${app.name} installé avec succès !`);
    }
  };

  const handleUninstall = (appId: string) => {
    uninstallApp(appId);
    toast.info('Application désinstallée');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher des applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === 'web' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            )}
            onClick={() => setActiveTab('web')}
          >
            <Globe className="w-4 h-4" />
            Applications Web
          </button>
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === 'server' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            )}
            onClick={() => setActiveTab('server')}
          >
            <Server className="w-4 h-4" />
            Applications Serveur
          </button>
        </div>
      </div>

      {/* App list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {activeTab === 'server' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>Applications Serveur</strong> — Ces applications nécessitent une installation locale via un script. 
              Elles tournent sur votre machine et sont accessibles depuis l'OS.
            </p>
          </div>
        )}

        <AnimatePresence>
          {filteredApps.map(app => (
            <AppCard
              key={app.id}
              app={app}
              isInstalled={isInstalled(app.id)}
              onInstall={() => handleInstall(app)}
              onUninstall={() => handleUninstall(app.id)}
            />
          ))}
        </AnimatePresence>

        {filteredApps.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            Aucune application trouvée
          </div>
        )}
      </div>
    </div>
  );
});
AppStore.displayName = 'AppStore';
