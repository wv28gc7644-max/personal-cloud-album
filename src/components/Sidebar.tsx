import { useState } from 'react';
import { 
  Home, 
  Images, 
  Video, 
  Tags, 
  ListMusic, 
  Settings, 
  Plus,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Shield
} from 'lucide-react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { TagBadge } from './TagBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewType = 'home' | 'photos' | 'videos' | 'admin';

interface SidebarProps {
  onCreatePlaylist: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ onCreatePlaylist, currentView, onViewChange }: SidebarProps) {
  const { tags, selectedTags, toggleSelectedTag, clearSelectedTags, playlists } = useMediaStore();
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [playlistsExpanded, setPlaylistsExpanded] = useState(true);

  const navItems: { icon: typeof Home; label: string; view: ViewType }[] = [
    { icon: Home, label: 'Accueil', view: 'home' },
    { icon: Images, label: 'Photos', view: 'photos' },
    { icon: Video, label: 'Vidéos', view: 'videos' },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            MediaVault
          </span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
              currentView === item.view
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

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
          
          {tagsExpanded && (
            <div className="mt-2 px-2 space-y-1">
              {selectedTags.length > 0 && (
                <button
                  onClick={clearSelectedTags}
                  className="text-xs text-primary hover:underline mb-2 px-2"
                >
                  Effacer les filtres
                </button>
              )}
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    selected={selectedTags.includes(tag.id)}
                    onClick={() => toggleSelectedTag(tag.id)}
                  />
                ))}
              </div>
            </div>
          )}
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

          {playlistsExpanded && (
            <div className="mt-2 px-2 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={onCreatePlaylist}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle playlist
              </Button>
              
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <ListMusic className="w-4 h-4" />
                  </div>
                  <span className="truncate">{playlist.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {playlist.items.length}
                  </span>
                </button>
              ))}

              {playlists.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">
                  Aucune playlist
                </p>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Admin & Settings */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button 
          onClick={() => onViewChange('admin')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
            currentView === 'admin'
              ? "bg-primary/20 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Shield className="w-5 h-5" />
          <span className="font-medium">Administration</span>
        </button>
      </div>
    </aside>
  );
}
