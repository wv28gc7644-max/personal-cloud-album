import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MediaHeader } from '@/components/MediaHeader';
import { MediaGrid } from '@/components/MediaGrid';
import { UploadModal } from '@/components/UploadModal';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';

const Index = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onCreatePlaylist={() => setPlaylistOpen(true)} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <MediaHeader onUploadClick={() => setUploadOpen(true)} />
        
        <div className="flex-1 overflow-y-auto">
          <MediaGrid />
        </div>
      </main>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreatePlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} />
    </div>
  );
};

export default Index;
