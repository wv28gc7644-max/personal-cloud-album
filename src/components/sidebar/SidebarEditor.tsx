import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { IconPicker } from './IconPicker';
import { useSidebarConfig, SidebarSection, SidebarItem } from '@/hooks/useSidebarConfig';
import { cn } from '@/lib/utils';

interface SidebarEditorProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarEditor({ open, onClose }: SidebarEditorProps) {
  const {
    config,
    moveSection,
    addSection,
    updateSection,
    deleteSection,
    addItem,
    updateItem,
    deleteItem,
    resetToDefault,
    exportConfig,
    importConfig,
  } = useSidebarConfig();

  const [editingSection, setEditingSection] = useState<SidebarSection | null>(null);
  const [editingItem, setEditingItem] = useState<{ section: string; item: SidebarItem } | null>(null);
  const [newSectionDialog, setNewSectionDialog] = useState(false);
  const [newItemDialog, setNewItemDialog] = useState<string | null>(null);
  
  // Form states
  const [sectionLabel, setSectionLabel] = useState('');
  const [sectionIcon, setSectionIcon] = useState('Folder');
  const [itemLabel, setItemLabel] = useState('');
  const [itemIcon, setItemIcon] = useState('Star');
  const [itemType, setItemType] = useState<'nav' | 'tool'>('nav');

  const handleAddSection = () => {
    if (sectionLabel.trim()) {
      addSection(sectionLabel.trim(), sectionIcon);
      setNewSectionDialog(false);
      setSectionLabel('');
      setSectionIcon('Folder');
    }
  };

  const handleAddItem = (sectionId: string) => {
    if (itemLabel.trim()) {
      addItem(sectionId, {
        icon: itemIcon,
        label: itemLabel.trim(),
        type: itemType,
        view: itemType === 'nav' ? `custom-${Date.now()}` : undefined,
        action: itemType === 'tool' ? `custom-${Date.now()}` : undefined,
      });
      setNewItemDialog(null);
      setItemLabel('');
      setItemIcon('Star');
      setItemType('nav');
    }
  };

  const handleSaveSection = () => {
    if (editingSection && sectionLabel.trim()) {
      updateSection(editingSection.id, {
        label: sectionLabel.trim(),
        icon: sectionIcon,
      });
      setEditingSection(null);
    }
  };

  const handleSaveItem = () => {
    if (editingItem && itemLabel.trim()) {
      updateItem(editingItem.section, editingItem.item.id, {
        label: itemLabel.trim(),
        icon: itemIcon,
      });
      setEditingItem(null);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importConfig(file);
      }
    };
    input.click();
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return Icon;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Éditeur de la Sidebar
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => setNewSectionDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle section
          </Button>
          <Button variant="outline" size="sm" onClick={exportConfig}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto text-destructive">
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Réinitialiser la sidebar ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action restaurera la configuration par défaut. 
                  Toutes vos personnalisations seront perdues.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={resetToDefault}>
                  Réinitialiser
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <Reorder.Group
            axis="y"
            values={config.sections}
            onReorder={(newOrder) => {
              newOrder.forEach((section, index) => {
                if (config.sections[index]?.id !== section.id) {
                  moveSection(section.id, index);
                }
              });
            }}
            className="space-y-3"
          >
            {config.sections.map((section) => {
              const SectionIcon = getIcon(section.icon);
              
              return (
                <Reorder.Item
                  key={section.id}
                  value={section}
                  className="bg-card border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 bg-muted/50">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    <SectionIcon className="w-4 h-4" />
                    <span className="font-medium flex-1">{section.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {section.items.length} items
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingSection(section);
                        setSectionLabel(section.label);
                        setSectionIcon(section.icon);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {section.id.startsWith('custom-') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              La section "{section.label}" et tous ses éléments seront supprimés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSection(section.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  <div className="p-2 space-y-1">
                    <Reorder.Group
                      axis="y"
                      values={section.items}
                      onReorder={(newItems) => {
                        // Update section items order
                        updateSection(section.id, { items: newItems });
                      }}
                      className="space-y-1"
                    >
                      {section.items.map((item) => {
                        const ItemIcon = getIcon(item.icon);
                        
                        return (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md bg-background border",
                              "hover:bg-muted/50 transition-colors"
                            )}
                          >
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                            <ItemIcon className="w-4 h-4" />
                            <span className="text-sm flex-1">{item.label}</span>
                            {item.isNew && (
                              <Badge className="bg-green-500/20 text-green-500 text-xs">New</Badge>
                            )}
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">{item.badge}</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingItem({ section: section.id, item });
                                setItemLabel(item.label);
                                setItemIcon(item.icon);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => deleteItem(section.id, item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 border-dashed border"
                      onClick={() => setNewItemDialog(section.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un élément
                    </Button>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </ScrollArea>

        {/* New Section Dialog */}
        <Dialog open={newSectionDialog} onOpenChange={setNewSectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de la section</Label>
                <Input
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                  placeholder="Ma section"
                />
              </div>
              <div className="space-y-2">
                <Label>Icône</Label>
                <IconPicker
                  selectedIcon={sectionIcon}
                  onSelectIcon={setSectionIcon}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewSectionDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddSection}>
                <Plus className="w-4 h-4 mr-2" />
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Item Dialog */}
        <Dialog open={!!newItemDialog} onOpenChange={(o) => !o && setNewItemDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel élément</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'élément</Label>
                <Input
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                  placeholder="Mon élément"
                />
              </div>
              <div className="space-y-2">
                <Label>Icône</Label>
                <IconPicker
                  selectedIcon={itemIcon}
                  onSelectIcon={setItemIcon}
                />
              </div>
              <div className="flex items-center gap-4">
                <Label>Type :</Label>
                <div className="flex gap-2">
                  <Button
                    variant={itemType === 'nav' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setItemType('nav')}
                  >
                    Navigation
                  </Button>
                  <Button
                    variant={itemType === 'tool' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setItemType('tool')}
                  >
                    Outil
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewItemDialog(null)}>
                Annuler
              </Button>
              <Button onClick={() => newItemDialog && handleAddItem(newItemDialog)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Section Dialog */}
        <Dialog open={!!editingSection} onOpenChange={(o) => !o && setEditingSection(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de la section</Label>
                <Input
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Icône</Label>
                <IconPicker
                  selectedIcon={sectionIcon}
                  onSelectIcon={setSectionIcon}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveSection}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'élément</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'élément</Label>
                <Input
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Icône</Label>
                <IconPicker
                  selectedIcon={itemIcon}
                  onSelectIcon={setItemIcon}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveItem}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
