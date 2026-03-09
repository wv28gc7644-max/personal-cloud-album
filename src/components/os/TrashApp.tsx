import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertTriangle, File, Folder } from 'lucide-react';
import { useTrash } from '@/hooks/useTrash';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
};

export const TrashApp = memo(() => {
  const { items, restoreItem, emptyTrash, permanentlyDelete, isEmpty } = useTrash();

  const handleRestore = useCallback((itemId: string) => {
    restoreItem(itemId);
  }, [restoreItem]);

  const handlePermanentDelete = useCallback((itemId: string) => {
    permanentlyDelete(itemId);
  }, [permanentlyDelete]);

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium">Corbeille</span>
          <span className="text-sm text-muted-foreground">
            ({items.length} élément{items.length !== 1 ? 's' : ''})
          </span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="sm"
              disabled={isEmpty()}
            >
              Vider la corbeille
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Vider la corbeille ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Tous les éléments de la corbeille seront définitivement supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={emptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Vider
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isEmpty() ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
            <Trash2 className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">La corbeille est vide</p>
            <p className="text-sm">Les éléments supprimés apparaîtront ici</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg',
                  'bg-card border border-border',
                  'hover:bg-accent/50 transition-colors group'
                )}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  {item.type === 'folder' ? (
                    <Folder className="w-5 h-5 text-blue-500" />
                  ) : (
                    <File className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.originalPath}
                  </p>
                </div>

                {/* Metadata */}
                <div className="text-right text-sm text-muted-foreground hidden sm:block">
                  <p>{formatDate(item.deletedAt)}</p>
                  <p>{formatSize(item.size)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRestore(item.id)}
                    title="Restaurer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{item.name}" sera supprimé de façon permanente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handlePermanentDelete(item.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
});
TrashApp.displayName = 'TrashApp';
