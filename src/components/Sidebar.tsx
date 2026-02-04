import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { 
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Settings,
  CheckCircle2,
  XCircle,
  PenTool,
  Gift,
  Wrench,
  Edit3
} from 'lucide-react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useUpdateStatus } from '@/hooks/useUpdateStatus';
import { useLocalServer } from '@/hooks/useLocalServer';
import { useGlobalEditorContext } from './GlobalEditorProvider';
import { useSidebarConfig } from '@/hooks/useSidebarConfig';
import { EditableElement } from './EditableElement';
import { TagBadge } from './TagBadge';
import { SidebarEditor } from './sidebar/SidebarEditor';
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
  const { config, toggleSectionExpanded } = useSidebarConfig();
  
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [playlistsExpanded, setPlaylistsExpanded] = useState(true);
  const [sidebarEditorOpen, setSidebarEditorOpen] = useState(false);

  // Vérifier la connexion au serveur local au chargement
  useEffect(() => {
    testConnection(); // First check shows toast
    const interval = setInterval(() => testConnection({ silent: true }), 30000); // Silent checks
    return () => clearInterval(interval);
  }, [testConnection]);

  const favoritesCount = getFavorites().length;

  // Action handlers map
  const actionHandlers: Record<string, (() => void) | undefined> = {
    'kiosk': onOpenKiosk,
    'qrcode': onOpenQRCode,
    'compare': onOpenCompare,
    'filters': onOpenFilters,
    'update': onOpenUpdate,
    'slideshow': onStartSlideshow,
  };

  // Get icon component from string name
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return Icon;
  };

  // Get badge value for specific items
  const getBadge = (itemId: string): number | undefined => {
    if (itemId === 'favorites') return favoritesCount;
    return undefined;
  };

  // Check if item has update indicator
  const hasUpdateIndicator = (itemId: string) => {
    return itemId === 'update' && hasUpdate;
  };

  const renderSectionItem = (item: any, sectionId: string, index: number) => {
    const ItemIcon = getIcon(item.icon);
    const isActive = item.view && currentView === item.view;
    const badge = getBadge(item.id);
    const showUpdate = hasUpdateIndicator(item.id);

    // Special styling for specific views
    const getSpecialStyles = () => {
      if (item.view === 'ai-studio' && isActive) {
        return "bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30";
      }
      if (item.view === 'ai-creations' && isActive) {
        return "bg-gradient-to-r from-pink-500/20 to-orange-500/20 text-pink-400 border border-pink-500/30";
      }
      if (item.view === 'agent' && isActive) {
        return "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30";
      }
      if (item.view === 'smart-home' && isActive) {
        return "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30";
      }
      return isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent/50";
    };

    const handleClick = () => {
      if (item.type === 'nav' && item.view) {
        onViewChange(item.view as ViewType);
      } else if (item.type === 'tool' && item.action) {
        const handler = actionHandlers[item.action];
        if (handler) handler();
      }
    };

    return (
      <motion.button
        key={item.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
          getSpecialStyles()
        )}
      >
        <ItemIcon className={cn(
          "w-5 h-5",
          item.id === 'favorites' && isActive && "fill-current text-yellow-500",
          item.view === 'ai-studio' && isActive && "animate-pulse"
        )} />
        <span className="font-medium text-sm">{item.label}</span>
        
        {/* New badge */}
        {item.isNew && (
          <Badge className="ml-auto bg-green-500/20 text-green-500 text-xs px-1.5">
            New
          </Badge>
        )}
        
        {/* Custom badge */}
        {item.badge && (
          <span className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
        
        {/* Favorites count */}
        {badge !== undefined && badge > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full"
          >
            {badge}
          </motion.span>
        )}

        {/* Update indicator */}
        {showUpdate && (
          <span className="ml-auto flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}

        {/* Agent connection status */}
        {item.id === 'agent' && (
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
        )}
      </motion.button>
    );
  };

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col min-h-0">
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

      {/* Dynamic Sections */}
      <nav className="flex-1 min-h-0 px-3 space-y-1 overflow-y-auto">
        {config.sections.map((section) => {
          const SectionIcon = getIcon(section.icon);
          
          if (!section.isCollapsible) {
            // Non-collapsible section - render items directly
            return (
              <div key={section.id} className="space-y-1">
                {section.items.map((item, index) => renderSectionItem(item, section.id, index))}
              </div>
            );
          }
          
          // Collapsible section
          return (
            <Collapsible
              key={section.id}
              open={section.isExpanded}
              onOpenChange={() => toggleSectionExpanded(section.id)}
              className="mt-4"
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <SectionIcon className="w-4 h-4" />
                  {section.label}
                </span>
                <div className="flex items-center gap-1">
                  <Badge className="bg-primary/20 text-primary text-xs">
                    {section.items.length}
                  </Badge>
                  {section.isExpanded ? (
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
                  {section.items.map((item, index) => renderSectionItem(item, section.id, index))}
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Slideshow button */}
        {onStartSlideshow && (
          <button
            onClick={onStartSlideshow}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent/50 mt-4 border border-dashed border-sidebar-border"
          >
            <LucideIcons.Play className="w-5 h-5" />
            <span className="font-medium">Diaporama</span>
          </button>
        )}

        {/* Tags section */}
        <div className="pt-6">
          <button
            onClick={() => setTagsExpanded(!tagsExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <LucideIcons.Tags className="w-4 h-4" />
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
              <LucideIcons.ListMusic className="w-4 h-4" />
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
                  <LucideIcons.Plus className="w-4 h-4 mr-2" />
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
                      <LucideIcons.ListMusic className="w-4 h-4" />
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

      {/* Settings + Version Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Sidebar Editor Button */}
        <button 
          onClick={() => setSidebarEditorOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <Edit3 className="w-4 h-4" />
          <span className="text-sm">Personnaliser</span>
        </button>

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

        {/* Version Footer */}
        <div className="pt-2 mt-2 border-t border-sidebar-border/50">
          <div className="px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="font-medium">v{(() => {
                try {
                  const { APP_VERSION } = require('@/config/versionFeatures');
                  return APP_VERSION;
                } catch { return '1.0.0'; }
              })()}</span>
              <span className="opacity-70">
                {(() => {
                  const lastUpdate = localStorage.getItem('mediavault-last-update-date');
                  if (lastUpdate) {
                    try {
                      return new Date(lastUpdate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch { return ''; }
                  }
                  return '';
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Editor Dialog */}
      <SidebarEditor 
        open={sidebarEditorOpen} 
        onClose={() => setSidebarEditorOpen(false)} 
      />
    </aside>
  );
}
