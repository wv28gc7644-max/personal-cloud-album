import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MediaHeader } from '@/components/MediaHeader';
import { MediaGrid } from '@/components/MediaGrid';
import { UploadModal } from '@/components/UploadModal';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { AdminPanel } from '@/components/AdminPanel';
import { StatsPanel } from '@/components/StatsPanel';
import { SlideshowModal } from '@/components/SlideshowModal';
import AIStudioView from '@/components/AIStudioView';
import AICreationsView from '@/components/AICreationsView';
import LocalAgent from '@/components/LocalAgent';
import LocalServerDownload from '@/components/LocalServerDownload';
import { useMediaStore } from '@/hooks/useMediaStore';

type ViewType = 'home' | 'photos' | 'videos' | 'favorites' | 'stats' | 'admin' | 'ai-studio' | 'ai-creations' | 'agent' | 'install';

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const { getFilteredMedia, getFavorites } = useMediaStore();

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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        onCreatePlaylist={() => setPlaylistOpen(true)} 
        currentView={currentView}
        onViewChange={setCurrentView}
        onStartSlideshow={() => setSlideshowOpen(true)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'admin' ? (
          <AdminPanel />
        ) : currentView === 'stats' ? (
          <StatsPanel />
        ) : currentView === 'ai-studio' ? (
          <AIStudioView />
        ) : currentView === 'ai-creations' ? (
          <AICreationsView />
        ) : currentView === 'agent' ? (
          <LocalAgent />
        ) : currentView === 'install' ? (
          <LocalServerDownload />
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

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreatePlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} />
      <SlideshowModal 
        open={slideshowOpen} 
        onClose={() => setSlideshowOpen(false)}
        items={getDisplayMedia()}
      />
    </div>
  );
};

export default Index;
