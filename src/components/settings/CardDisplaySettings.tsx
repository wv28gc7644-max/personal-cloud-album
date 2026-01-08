import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CardDisplaySettings() {
  const [showMetadata, setShowMetadata] = useState(() => 
    localStorage.getItem('mediavault-card-show-metadata') !== 'false'
  );
  const [showTitle, setShowTitle] = useState(() => 
    localStorage.getItem('mediavault-card-show-title') !== 'false'
  );
  const [showActionText, setShowActionText] = useState(() => 
    localStorage.getItem('mediavault-card-show-action-text') !== 'false'
  );
  const [layoutOrder, setLayoutOrder] = useState<'header-first' | 'media-first'>(() => 
    (localStorage.getItem('mediavault-card-layout-order') as 'header-first' | 'media-first') || 'header-first'
  );
  const [videoHoverSound, setVideoHoverSound] = useState(() => 
    localStorage.getItem('mediavault-video-hover-sound') === 'true'
  );

  const updateCardSettings = (key: string, value: boolean | string) => {
    localStorage.setItem(`mediavault-card-${key}`, String(value));
    window.dispatchEvent(new CustomEvent('mediavault-card-settings-changed'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div>
          <Label htmlFor="show-metadata" className="text-sm font-medium cursor-pointer">Afficher la barre de métadonnées</Label>
          <p className="text-xs text-muted-foreground">Date, poids, type de fichier</p>
        </div>
        <Switch
          id="show-metadata"
          checked={showMetadata}
          onCheckedChange={(checked) => {
            setShowMetadata(checked);
            updateCardSettings('show-metadata', checked);
          }}
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div>
          <Label htmlFor="show-title" className="text-sm font-medium cursor-pointer">Afficher le titre du média</Label>
          <p className="text-xs text-muted-foreground">Nom du fichier dans l'en-tête</p>
        </div>
        <Switch
          id="show-title"
          checked={showTitle}
          onCheckedChange={(checked) => {
            setShowTitle(checked);
            updateCardSettings('show-title', checked);
          }}
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div>
          <Label htmlFor="show-action-text" className="text-sm font-medium cursor-pointer">Texte des boutons d'action</Label>
          <p className="text-xs text-muted-foreground">Afficher "Voir", "DL", etc. ou uniquement les icônes</p>
        </div>
        <Switch
          id="show-action-text"
          checked={showActionText}
          onCheckedChange={(checked) => {
            setShowActionText(checked);
            updateCardSettings('show-action-text', checked);
          }}
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div>
          <Label className="text-sm font-medium">Disposition de la carte</Label>
          <p className="text-xs text-muted-foreground">Ordre des éléments</p>
        </div>
        <Select value={layoutOrder} onValueChange={(v) => {
          setLayoutOrder(v as 'header-first' | 'media-first');
          updateCardSettings('layout-order', v);
        }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="header-first">En-tête en haut</SelectItem>
            <SelectItem value="media-first">Média en haut</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div>
          <Label htmlFor="video-hover-sound" className="text-sm font-medium cursor-pointer">Son au survol des vidéos</Label>
          <p className="text-xs text-muted-foreground">Activer le son quand vous survolez une vidéo</p>
        </div>
        <Switch
          id="video-hover-sound"
          checked={videoHoverSound}
          onCheckedChange={(checked) => {
            setVideoHoverSound(checked);
            updateCardSettings('video-hover-sound', checked);
          }}
        />
      </div>
    </div>
  );
}
