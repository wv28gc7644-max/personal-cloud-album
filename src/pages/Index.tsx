import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MediaHeader } from '@/components/MediaHeader';
import { MediaGrid } from '@/components/MediaGrid';
import { UploadModal } from '@/components/UploadModal';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { AdminPanel } from '@/components/AdminPanel';

type ViewType = 'home' | 'photos' | 'videos' | 'admin';

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('home');

  // Listen for open-admin-updates event to switch to admin view
  useEffect(() => {
    const handleOpenAdminUpdates = () => {
      setCurrentView('admin');
    };
    
    window.addEventListener('open-admin-updates', handleOpenAdminUpdates);
    return () => window.removeEventListener('open-admin-updates', handleOpenAdminUpdates);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        onCreatePlaylist={() => setPlaylistOpen(true)} 
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'admin' ? (
          <AdminPanel />
        ) : (
          <>
            <MediaHeader onUploadClick={() => setUploadOpen(true)} />
            <div className="flex-1 overflow-y-auto">
              <MediaGrid filterType={currentView === 'photos' ? 'image' : currentView === 'videos' ? 'video' : undefined} />
            </div>
          </>
        )}
      </main>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreatePlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} />
    </div>
  );
};

export default Index;
