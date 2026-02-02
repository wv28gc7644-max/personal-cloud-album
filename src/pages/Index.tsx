import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MediaHeader } from '@/components/MediaHeader';
import { MediaGrid } from '@/components/MediaGrid';
import { UploadModal } from '@/components/UploadModal';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { SettingsView } from '@/components/settings/SettingsView';
import { StatsPanel } from '@/components/StatsPanel';
import { SlideshowModal } from '@/components/SlideshowModal';
import { SmartHomeDashboard } from '@/components/home';
import { useMediaStore } from '@/hooks/useMediaStore';
import { SelectionToolbar } from '@/components/SelectionToolbar';
import { KioskMode } from '@/components/KioskMode';
import { QRCodeAccess } from '@/components/QRCodeAccess';
import { InAppUpdate } from '@/components/InAppUpdate';
import { MediaCompare } from '@/components/MediaCompare';
import { AdvancedFiltersPanel } from '@/components/AdvancedFiltersPanel';
import { TimelineView } from '@/components/TimelineView';
import { CalendarView } from '@/components/CalendarView';
import { AlbumManager } from '@/components/AlbumManager';
import { WhatsNew } from '@/components/WhatsNew';
import { MediaViewer } from '@/components/MediaViewer';
import { ViewType } from '@/types/views';
import { MediaItem } from '@/types/media';

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [kioskOpen, setKioskOpen] = useState(false);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  const { getFilteredMedia, getFavorites, media, removeMedia, updateMedia } = useMediaStore();

  // Listen for navigation events
  useEffect(() => {
    const handleOpenAdminUpdates = () => {
      setCurrentView('admin');
    };
    
    const handleNavigate = (e: CustomEvent<ViewType>) => {
      setCurrentView(e.detail);
    };
    
    window.addEventListener('open-admin-updates', handleOpenAdminUpdates);
    window.addEventListener('mediavault-navigate', handleNavigate as EventListener);
    
    return () => {
      window.removeEventListener('open-admin-updates', handleOpenAdminUpdates);
      window.removeEventListener('mediavault-navigate', handleNavigate as EventListener);
    };
  }, []);

  const getDisplayMedia = () => {
    if (currentView === 'favorites') {
      return getFavorites();
    }
    return getFilteredMedia();
  };

  const getFilterType = () => {
    if (currentView === 'photos') return 'image';
    if (currentView === 'videos') return 'video';
    return undefined;
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleOpenModal = (modal: string) => {
    switch (modal) {
      case 'kiosk':
        setKioskOpen(true);
        break;
      case 'qrcode':
        setQrCodeOpen(true);
        break;
      case 'update':
        setUpdateOpen(true);
        break;
      case 'compare':
        setCompareOpen(true);
        break;
      case 'filters':
        setFiltersOpen(true);
        break;
    }
  };

  const handleViewMedia = (item: MediaItem) => {
    setViewerItem(item);
  };

  const handleDownload = (item: MediaItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    link.click();
  };

  const handleToggleFavorite = (id: string) => {
    const item = media.find(m => m.id === id);
    if (item) {
      const hasFavorite = item.tags.some(t => t.name === 'Favoris');
      if (hasFavorite) {
        updateMedia(id, { tags: item.tags.filter(t => t.name !== 'Favoris') });
      } else {
        updateMedia(id, { tags: [...item.tags, { id: '1', name: 'Favoris', color: 'yellow' }] });
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        onCreatePlaylist={() => setPlaylistOpen(true)} 
        currentView={currentView}
        onViewChange={handleViewChange}
        onStartSlideshow={() => setSlideshowOpen(true)}
        onOpenKiosk={() => setKioskOpen(true)}
        onOpenQRCode={() => setQrCodeOpen(true)}
        onOpenUpdate={() => setUpdateOpen(true)}
        onOpenCompare={() => setCompareOpen(true)}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'admin' ? (
          <SettingsView />
        ) : currentView === 'stats' ? (
          <StatsPanel />
        ) : currentView === 'smart-home' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <SmartHomeDashboard />
          </div>
        ) : currentView === 'timeline' ? (
          <div className="flex-1 overflow-y-auto">
            <MediaHeader 
              onUploadClick={() => setUploadOpen(true)} 
              onStartSlideshow={() => setSlideshowOpen(true)}
            />
            <TimelineView
              media={getDisplayMedia()}
              viewMode="grid"
              onView={handleViewMedia}
              onDelete={(item) => removeMedia(item.id)}
              onDownload={handleDownload}
              onToggleFavorite={(item) => handleToggleFavorite(item.id)}
            />
          </div>
        ) : currentView === 'calendar' ? (
          <div className="flex-1 overflow-y-auto">
            <MediaHeader 
              onUploadClick={() => setUploadOpen(true)} 
              onStartSlideshow={() => setSlideshowOpen(true)}
            />
            <CalendarView
              media={getDisplayMedia()}
              onView={handleViewMedia}
            />
          </div>
        ) : currentView === 'albums' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Albums</h1>
              <p className="text-muted-foreground mt-1">
                Organisez vos médias en albums et sous-albums
              </p>
            </div>
            <AlbumManager />
          </div>
        ) : (
          <>
            <MediaHeader 
              onUploadClick={() => setUploadOpen(true)} 
              onStartSlideshow={() => setSlideshowOpen(true)}
            />
            <div className="flex-1 overflow-y-auto">
              <MediaGrid 
                filterType={getFilterType()} 
                filterFavorites={currentView === 'favorites'}
              />
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreatePlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} />
      <SlideshowModal 
        open={slideshowOpen} 
        onClose={() => setSlideshowOpen(false)}
        items={getDisplayMedia()}
      />
      <KioskMode
        open={kioskOpen}
        onClose={() => setKioskOpen(false)}
        items={getDisplayMedia()}
      />
      <QRCodeAccess
        trigger={<span className="hidden" />}
      />
      <InAppUpdate
        trigger={<span className="hidden" />}
      />
      <MediaCompare
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
      <AdvancedFiltersPanel
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
      
      {/* What's New Dialog */}
      <WhatsNew
        onNavigate={handleViewChange}
        onOpenModal={handleOpenModal}
        trigger={
          <span 
            className={whatsNewOpen ? 'hidden' : 'hidden'}
            onClick={() => setWhatsNewOpen(false)}
          />
        }
      />

      {/* Media Viewer */}
      {viewerItem && (
        <MediaViewer
          item={viewerItem}
          items={getDisplayMedia()}
          onClose={() => setViewerItem(null)}
          onNavigate={(item) => setViewerItem(item)}
          onDownload={handleDownload}
        />
      )}

      <SelectionToolbar />
    </div>
  );
};

export default Index;
