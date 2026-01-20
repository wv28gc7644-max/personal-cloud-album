import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  X,
  Clock,
  Calendar,
  FolderTree,
  Tv,
  QrCode,
  RefreshCw,
  Columns,
  Filter,
  CheckSquare,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ViewType } from '@/types/views';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: typeof Clock;
  action?: {
    type: 'view' | 'modal';
    target: ViewType | string;
  };
  isNew?: boolean;
}

interface WhatsNewProps {
  onNavigate?: (view: ViewType) => void;
  onOpenModal?: (modal: string) => void;
  trigger?: React.ReactNode;
}

const features: Feature[] = [
  {
    id: 'timeline',
    title: 'Vue Timeline',
    description: 'Visualisez vos médias chronologiquement, groupés par mois avec une présentation élégante.',
    icon: Clock,
    action: { type: 'view', target: 'timeline' },
    isNew: true,
  },
  {
    id: 'calendar',
    title: 'Vue Calendrier',
    description: 'Naviguez dans vos médias par date sur un calendrier interactif mensuel.',
    icon: Calendar,
    action: { type: 'view', target: 'calendar' },
    isNew: true,
  },
  {
    id: 'albums',
    title: 'Albums Hiérarchiques',
    description: 'Organisez vos médias dans des albums et sous-albums pour une meilleure structure.',
    icon: FolderTree,
    action: { type: 'view', target: 'albums' },
    isNew: true,
  },
  {
    id: 'kiosk',
    title: 'Mode Kiosque / TV',
    description: 'Affichez vos médias en plein écran, parfait pour les écrans TV ou les présentations.',
    icon: Tv,
    action: { type: 'modal', target: 'kiosk' },
    isNew: true,
  },
  {
    id: 'qrcode',
    title: 'QR Code Mobile',
    description: 'Scannez un QR code pour accéder instantanément à MediaVault depuis votre mobile.',
    icon: QrCode,
    action: { type: 'modal', target: 'qrcode' },
    isNew: true,
  },
  {
    id: 'compare',
    title: 'Comparaison Médias',
    description: 'Comparez deux médias côte à côte, en superposition ou avec un slider.',
    icon: Columns,
    action: { type: 'modal', target: 'compare' },
    isNew: true,
  },
  {
    id: 'filters',
    title: 'Filtres Avancés',
    description: 'Filtrez par type, date, taille, durée et tags pour trouver rapidement vos médias.',
    icon: Filter,
    action: { type: 'modal', target: 'filters' },
    isNew: true,
  },
  {
    id: 'selection',
    title: 'Multi-sélection',
    description: 'Sélectionnez plusieurs médias pour des actions groupées : supprimer, taguer, télécharger.',
    icon: CheckSquare,
    isNew: true,
  },
  {
    id: 'update',
    title: 'Mise à jour In-App',
    description: 'Mettez à jour MediaVault directement depuis l\'interface, sans quitter l\'application.',
    icon: RefreshCw,
    action: { type: 'modal', target: 'update' },
    isNew: true,
  },
];

export function WhatsNew({ onNavigate, onOpenModal, trigger }: WhatsNewProps) {
  const [open, setOpen] = useState(false);

  const handleFeatureClick = (feature: Feature) => {
    if (!feature.action) return;
    
    if (feature.action.type === 'view' && onNavigate) {
      onNavigate(feature.action.target as ViewType);
      setOpen(false);
    } else if (feature.action.type === 'modal' && onOpenModal) {
      onOpenModal(feature.action.target);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Gift className="w-4 h-4" />
            Nouveautés
            <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary">
              {features.filter(f => f.isNew).length}
            </Badge>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Nouveautés MediaVault
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid gap-3 py-4">
            <AnimatePresence>
              {features.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${feature.action 
                      ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/30' 
                      : 'bg-muted/20'
                    }
                  `}
                  onClick={() => handleFeatureClick(feature)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{feature.title}</h3>
                        {feature.isNew && (
                          <Badge className="bg-green-500/20 text-green-500 text-xs">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    {feature.action && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
