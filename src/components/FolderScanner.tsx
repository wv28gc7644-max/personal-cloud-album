import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderSearch, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Image, 
  Video, 
  Music, 
  HardDrive, 
  FolderPlus,
  X,
  Import,
  FolderTree
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useMediaStore } from '@/hooks/useMediaStore';
import { MediaItem } from '@/types/media';
import { getLocalServerUrl } from '@/utils/localServerUrl';
import { toast } from 'sonner';

interface ScannedFile {
  name: string;
  relativePath: string;
  absolutePath: string;
  folder: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  type: 'image' | 'video' | 'audio';
  createdAt: string;
  modifiedAt: string;
}

interface ScanResult {
  path: string;
  totalFiles: number;
  folders: string[];
  files: ScannedFile[];
  stats: {
    images: number;
    videos: number;
    audio: number;
    totalSize: number;
  };
}

interface FolderScannerProps {
  open: boolean;
  onClose: () => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
};

export function FolderScanner({ open, onClose }: FolderScannerProps) {
  const [folderPath, setFolderPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [importTypeFilter, setImportTypeFilter] = useState<Set<string>>(new Set(['image', 'video']));

  const { addMedia, media } = useMediaStore();

  const handleScan = useCallback(async () => {
    if (!folderPath.trim()) {
      setError('Veuillez entrer un chemin de dossier');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const serverUrl = getLocalServerUrl();
      const response = await fetch(`${serverUrl}/api/scan-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath.trim() }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors du scan');
      }

      const result: ScanResult = await response.json();
      setScanResult(result);
      setSelectedFolders(new Set(result.folders));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur');
    } finally {
      setIsScanning(false);
    }
  }, [folderPath]);

  const handleImport = useCallback(async () => {
    if (!scanResult) return;

    setIsImporting(true);

    try {
      // Filter files by selected folders and type
      const filesToImport = scanResult.files.filter(f => 
        selectedFolders.has(f.folder) && importTypeFilter.has(f.type)
      );

      // Check for duplicates
      const existingUrls = new Set(media.map(m => m.url));
      const newFiles = filesToImport.filter(f => !existingUrls.has(f.url));

      if (newFiles.length === 0) {
        toast.info('Tous les fichiers sont déjà importés');
        setIsImporting(false);
        return;
      }

      const folderName = scanResult.path.split(/[/\\]/).pop() || 'Dossier lié';

      // Add media items
      for (const file of newFiles) {
        const mediaItem: MediaItem = {
          id: `linked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: file.type === 'audio' ? 'image' : file.type, // audio not supported as type, fallback
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          tags: [],
          createdAt: new Date(file.createdAt),
          size: file.size,
          isLinked: true,
          sourcePath: file.absolutePath,
          sourceFolder: folderName
        };
        addMedia(mediaItem);
      }

      // Save linked folder to server
      const serverUrl = getLocalServerUrl();
      await fetch(`${serverUrl}/api/linked-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: scanResult.path,
          name: folderName,
          fileCount: newFiles.length
        })
      }).catch(() => {}); // non-blocking

      toast.success(`${newFiles.length} fichier(s) lié(s) avec succès`, {
        description: `Depuis ${folderName}`
      });
      onClose();
    } catch (err) {
      toast.error('Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  }, [scanResult, selectedFolders, importTypeFilter, media, addMedia, onClose]);

  const toggleFolder = (folder: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const toggleTypeFilter = (type: string) => {
    setImportTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredCount = scanResult 
    ? scanResult.files.filter(f => selectedFolders.has(f.folder) && importTypeFilter.has(f.type)).length 
    : 0;

  const handleClose = () => {
    setScanResult(null);
    setError(null);
    setFolderPath('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderSearch className="w-5 h-5 text-primary" />
            Lier un dossier
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Folder path input */}
          <div className="flex gap-2">
            <Input
              placeholder="Ex: D:\Photos\Vacances ou C:\Users\Moi\Pictures"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              disabled={isScanning}
              className="flex-1"
            />
            <Button 
              onClick={handleScan} 
              disabled={isScanning || !folderPath.trim()}
              className="gap-2"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderSearch className="w-4 h-4" />
              )}
              Scanner
            </Button>
          </div>

          {/* Hint */}
          {!scanResult && !error && !isScanning && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <HardDrive className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Entrez le chemin d'un dossier sur votre disque dur. Les fichiers seront <strong>liés</strong> (pas copiés) — 
                aucun espace de stockage supplémentaire ne sera utilisé.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Scanning animation */}
          {isScanning && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyse du dossier en cours...</p>
            </div>
          )}

          {/* Results */}
          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 min-h-0 flex flex-col gap-3"
            >
              {/* Stats summary */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {scanResult.totalFiles} fichiers trouvés
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Image className="w-3 h-3" />
                  {scanResult.stats.images} photos
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Video className="w-3 h-3" />
                  {scanResult.stats.videos} vidéos
                </Badge>
                {scanResult.stats.audio > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Music className="w-3 h-3" />
                    {scanResult.stats.audio} audio
                  </Badge>
                )}
                <Badge variant="outline">
                  {formatSize(scanResult.stats.totalSize)}
                </Badge>
              </div>

              {/* Type filters */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">Importer :</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox 
                    checked={importTypeFilter.has('image')} 
                    onCheckedChange={() => toggleTypeFilter('image')}
                  />
                  <Image className="w-4 h-4" /> Photos
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox 
                    checked={importTypeFilter.has('video')} 
                    onCheckedChange={() => toggleTypeFilter('video')}
                  />
                  <Video className="w-4 h-4" /> Vidéos
                </label>
                {scanResult.stats.audio > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox 
                      checked={importTypeFilter.has('audio')} 
                      onCheckedChange={() => toggleTypeFilter('audio')}
                    />
                    <Music className="w-4 h-4" /> Audio
                  </label>
                )}
              </div>

              {/* Folder selection */}
              {scanResult.folders.length > 1 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Sous-dossiers :</span>
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {scanResult.folders.map(folder => {
                        const count = scanResult.files.filter(f => f.folder === folder).length;
                        return (
                          <label 
                            key={folder} 
                            className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded hover:bg-muted/50"
                          >
                            <Checkbox 
                              checked={selectedFolders.has(folder)} 
                              onCheckedChange={() => toggleFolder(folder)}
                            />
                            <FolderTree className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{folder === '.' ? '(racine)' : folder}</span>
                            <span className="text-xs text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Preview of files */}
              <ScrollArea className="flex-1 min-h-0 max-h-48">
                <div className="grid grid-cols-6 gap-1">
                  {scanResult.files
                    .filter(f => selectedFolders.has(f.folder) && importTypeFilter.has(f.type))
                    .slice(0, 30)
                    .map((file, i) => (
                      <div 
                        key={i} 
                        className="aspect-square rounded bg-muted/50 flex items-center justify-center overflow-hidden"
                        title={file.relativePath}
                      >
                        {file.type === 'image' ? (
                          <img 
                            src={file.thumbnailUrl} 
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : file.type === 'video' ? (
                          <Video className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <Music className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  {filteredCount > 30 && (
                    <div className="aspect-square rounded bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                      +{filteredCount - 30}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Import button */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {filteredCount} fichier(s) sélectionné(s)
                </p>
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting || filteredCount === 0}
                  className="gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Import className="w-4 h-4" />
                  )}
                  Lier {filteredCount} fichier(s)
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}