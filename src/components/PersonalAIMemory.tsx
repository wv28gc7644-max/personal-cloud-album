import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { 
  Database, Search, Trash2, Download, Upload, 
  Lightbulb, Heart, Zap, Edit2, Check, X,
  AlertTriangle
} from "lucide-react";
import { usePersonalAI, Knowledge } from "@/hooks/usePersonalAI";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_INFO = {
  fact: { icon: <Lightbulb className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-500", label: "Fait" },
  preference: { icon: <Heart className="h-3 w-3" />, color: "bg-pink-500/10 text-pink-500", label: "Préférence" },
  instruction: { icon: <Zap className="h-3 w-3" />, color: "bg-orange-500/10 text-orange-500", label: "Instruction" }
};

export default function PersonalAIMemory() {
  const { 
    knowledge, 
    updateKnowledge, 
    deleteKnowledge, 
    clearAllKnowledge,
    exportKnowledge,
    importKnowledge,
    stats 
  } = usePersonalAI();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredKnowledge = knowledge.filter(k =>
    k.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (item: Knowledge) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const handleSaveEdit = (id: string) => {
    updateKnowledge(id, editContent);
    setEditingId(null);
    setEditContent("");
    toast.success("Connaissance mise à jour");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = (id: string) => {
    deleteKnowledge(id);
    toast.success("Connaissance supprimée");
  };

  const handleExport = () => {
    const data = exportKnowledge();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mon-ia-memoire-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Mémoire exportée");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importKnowledge(content);
      if (success) {
        toast.success("Mémoire importée");
      } else {
        toast.error("Erreur lors de l'import");
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearAll = () => {
    clearAllKnowledge();
    toast.success("Toute la mémoire a été effacée");
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.totalKnowledge}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.facts}</div>
            <div className="text-xs text-muted-foreground">Faits</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-pink-500">{stats.preferences}</div>
            <div className="text-xs text-muted-foreground">Préférences</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.instructions}</div>
            <div className="text-xs text-muted-foreground">Instructions</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
        
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" />
          Importer
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Tout effacer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Effacer toute la mémoire ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Toutes les connaissances de votre IA seront supprimées définitivement.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground">
                Tout effacer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Knowledge List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Base de connaissances
          </CardTitle>
          <CardDescription>
            {filteredKnowledge.length} élément{filteredKnowledge.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {filteredKnowledge.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {knowledge.length === 0 
                  ? "Aucune connaissance enregistrée"
                  : "Aucun résultat pour cette recherche"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredKnowledge.map(item => {
                  const typeInfo = TYPE_INFO[item.type];
                  const isEditing = editingId === item.id;
                  
                  return (
                    <div 
                      key={item.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className={`shrink-0 ${typeInfo.color}`}>
                          {typeInfo.icon}
                          <span className="ml-1">{typeInfo.label}</span>
                        </Badge>
                        
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <p className="text-sm">{item.content}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Ajouté le {format(item.createdAt, "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => handleSaveEdit(item.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
