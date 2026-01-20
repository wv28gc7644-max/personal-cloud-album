import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Images, 
  Video, 
  Tags, 
  ListMusic, 
  Plus,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Settings,
  Heart,
  BarChart3,
  Play,
  Sparkles,
  Palette,
  Terminal,
  CheckCircle2,
  XCircle,
  PenTool,
  Home as HomeIcon,
  Clock,
  Calendar,
  FolderTree,
  Tv,
  QrCode,
  RefreshCw,
  Columns,
  Filter,
  Gift,
  Wrench
} from 'lucide-react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useUpdateStatus } from '@/hooks/useUpdateStatus';
import { useLocalServer } from '@/hooks/useLocalServer';
import { useGlobalEditorContext } from './GlobalEditorProvider';
import { EditableElement } from './EditableElement';
import { TagBadge } from './TagBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ViewType } from '@/types/views';

interface SidebarProps {
  onCreatePlaylist: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onStartSlideshow?: () => void;
  onOpenKiosk?: () => void;
  onOpenQRCode?: () => void;
  onOpenUpdate?: () => void;
  onOpenCompare?: () => void;
  onOpenFilters?: () => void;
  onOpenWhatsNew?: () => void;
}

export function Sidebar({ 
  onCreatePlaylist, 
  currentView, 
  onViewChange, 
  onStartSlideshow,
  onOpenKiosk,
  onOpenQRCode,
  onOpenUpdate,
  onOpenCompare,
  onOpenFilters,
  onOpenWhatsNew
}: SidebarProps) {
  const { tags, selectedTags, toggleSelectedTag, clearSelectedTags, playlists, getFavorites } = useMediaStore();
  const { hasUpdate, commitsBehind } = useUpdateStatus();
  const { isConnected, testConnection } = useLocalServer();
  const { isEditMode, toggleEditMode } = useGlobalEditorContext();
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [playlistsExpanded, setPlaylistsExpanded] = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  // Vérifier la connexion au serveur local au chargement
  useEffect(() => {
    testConnection(); // First check shows toast
    const interval = setInterval(() => testConnection({ silent: true }), 30000); // Silent checks
    return () => clearInterval(interval);
  }, [testConnection]);

  const favoritesCount = getFavorites().length;

  const navItems: { icon: typeof Home; label: string; view: ViewType; badge?: number }[] = [
    { icon: Home, label: 'Accueil', view: 'home' },
    { icon: Images, label: 'Photos', view: 'photos' },
    { icon: Video, label: 'Vidéos', view: 'videos' },
    { icon: Heart, label: 'Favoris', view: 'favorites', badge: favoritesCount },
    { icon: FolderTree, label: 'Albums', view: 'albums' },
    { icon: Clock, label: 'Timeline', view: 'timeline' },
    { icon: Calendar, label: 'Calendrier', view: 'calendar' },
    { icon: BarChart3, label: 'Statistiques', view: 'stats' },
  ];

  const toolItems = [
    { icon: Tv, label: 'Mode Kiosque', onClick: onOpenKiosk, isNew: true },
    { icon: QrCode, label: 'QR Code Mobile', onClick: onOpenQRCode, isNew: true },
    { icon: Columns, label: 'Comparer', onClick: onOpenCompare, isNew: true },
    { icon: Filter, label: 'Filtres avancés', onClick: onOpenFilters, isNew: true },
    { icon: RefreshCw, label: 'Mise à jour', onClick: onOpenUpdate, badge: hasUpdate },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <EditableElement id="sidebar-logo" type="container" name="Logo">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <EditableElement id="sidebar-logo-icon" type="icon" name="Icône Logo">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary-foreground" />
              </div>
            </EditableElement>
            <EditableElement id="sidebar-logo-text" type="text" name="Texte Logo">
              <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                MediaVault
              </span>
            </EditableElement>
          </h1>
        </EditableElement>
      </div>

      {/* What's New Button */}
      {onOpenWhatsNew && (
        <div className="px-3 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2 border-dashed"
            onClick={onOpenWhatsNew}
          >
            <Gift className="w-4 h-4 text-primary" />
            <span>Nouveautés</span>
            <Badge className="ml-auto bg-green-500/20 text-green-500 text-xs">9</Badge>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <EditableElement id="sidebar-navigation" type="container" name="Navigation">
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <EditableElement key={item.view} id={`sidebar-nav-${item.view}`} type="button" name={item.label}>
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onViewChange(item.view)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  currentView === item.view
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn("w-5 h-5", item.view === 'favorites' && currentView === 'favorites' && "fill-current text-yellow-500")} />
                <span className="font-medium">{item.label}</span>
                {['albums', 'timeline', 'calendar'].includes(item.view) && (
                  <Badge className="ml-auto bg-green-500/20 text-green-500 text-xs px-1.5">
                    New
                  </Badge>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </motion.button>
            </EditableElement>
          ))}

        {/* Slideshow button */}
        {onStartSlideshow && (
          <button
            onClick={onStartSlideshow}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent/50 mt-2 border border-dashed border-sidebar-border"
          >
            <Play className="w-5 h-5" />
            <span className="font-medium">Diaporama</span>
          </button>
        )}

        {/* Tools Section */}
        <Collapsible open={toolsExpanded} onOpenChange={setToolsExpanded} className="mt-4">
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            <span className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Outils
            </span>
            <div className="flex items-center gap-1">
              <Badge className="bg-green-500/20 text-green-500 text-xs">5</Badge>
              {toolsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1 mt-1"
            >
              {toolItems.map((tool, index) => (
                <motion.button
                  key={tool.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4 }}
                  onClick={tool.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <tool.icon className="w-4 h-4" />
                  <span>{tool.label}</span>
                  {tool.isNew && (
                    <Badge className="ml-auto bg-green-500/20 text-green-500 text-xs px-1.5">
                      New
                    </Badge>
                  )}
                  {tool.badge && (
                    <span className="ml-auto flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        {/* AI Studio button */}
        <EditableElement id="sidebar-ai-studio" type="button" name="Studio IA">
          <button
            onClick={() => onViewChange('ai-studio')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mt-4 ai-studio-button",
              currentView === 'ai-studio'
                ? "bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 border border-transparent"
            )}
          >
            <Sparkles className={cn("w-5 h-5", currentView === 'ai-studio' && "animate-pulse")} />
            <span className="font-medium">Studio IA</span>
            <span className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </button>
        </EditableElement>

        {/* AI Creations button */}
        <EditableElement id="sidebar-ai-creations" type="button" name="Créations IA">
          <button
            onClick={() => onViewChange('ai-creations')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
              currentView === 'ai-creations'
                ? "bg-gradient-to-r from-pink-500/20 to-orange-500/20 text-pink-400 border border-pink-500/30"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Palette className="w-5 h-5" />
            <span className="font-medium">Créations IA</span>
          </button>
        </EditableElement>

        {/* Agent Local button avec indicateur de connexion */}
        <EditableElement id="sidebar-agent" type="button" name="Agent Local">
          <button
            onClick={() => onViewChange('agent')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
              currentView === 'agent'
                ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Terminal className="w-5 h-5" />
            <span className="font-medium">Agent Local</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto flex items-center gap-1">
                  {isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isConnected ? 'Serveur connecté' : 'Serveur déconnecté'}</p>
              </TooltipContent>
            </Tooltip>
          </button>
        </EditableElement>

        {/* Smart Home button */}
        <EditableElement id="sidebar-smart-home" type="button" name="MediaVault Home">
          <button
            onClick={() => onViewChange('smart-home')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
              currentView === 'smart-home'
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="font-medium">MediaVault Home</span>
          </button>
        </EditableElement>

        {/* Tags section */}
        <div className="pt-6">
          <button
            onClick={() => setTagsExpanded(!tagsExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <Tags className="w-4 h-4" />
              Tags
            </span>
            {tagsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          <AnimatePresence>
            {tagsExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 px-2 space-y-1 overflow-hidden"
              >
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearSelectedTags}
                    className="text-xs text-primary hover:underline mb-2 px-2"
                  >
                    Effacer les filtres
                  </button>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, index) => (
                    <motion.div
                      key={tag.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <TagBadge
                        tag={tag}
                        size="sm"
                        selected={selectedTags.includes(tag.id)}
                        onClick={() => toggleSelectedTag(tag.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Playlists section */}
        <div className="pt-6">
          <button
            onClick={() => setPlaylistsExpanded(!playlistsExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <ListMusic className="w-4 h-4" />
              Playlists
            </span>
            {playlistsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {playlistsExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 px-2 space-y-1 overflow-hidden"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onCreatePlaylist}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle playlist
                </Button>
                
                {playlists.map((playlist, index) => (
                  <motion.button
                    key={playlist.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <ListMusic className="w-4 h-4" />
                    </div>
                    <span className="truncate">{playlist.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {playlist.items.length}
                    </span>
                  </motion.button>
                ))}

                {playlists.length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-2">
                    Aucune playlist
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </nav>
      </EditableElement>

      {/* Settings */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Global Editor Toggle */}
        <button 
          onClick={toggleEditMode}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
            isEditMode
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <PenTool className="w-4 h-4" />
          <span className="text-sm">Éditeur UI</span>
          {isEditMode && (
            <span className="ml-auto text-xs bg-blue-500/30 px-2 py-0.5 rounded">ON</span>
          )}
        </button>

        <button 
          onClick={() => onViewChange('admin')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative",
            currentView === 'admin'
              ? "bg-primary/20 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Paramètres</span>
          {hasUpdate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute right-3 flex h-2.5 w-2.5 cursor-help">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{commitsBehind > 0 ? `${commitsBehind} commit${commitsBehind > 1 ? 's' : ''} en retard` : 'Mise à jour disponible'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </button>
      </div>
    </aside>
  );
}
