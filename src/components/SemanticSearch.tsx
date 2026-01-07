import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Loader2, 
  Image,
  Video,
  Sparkles,
  Database,
  Upload,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { cn } from '@/lib/utils';

export const SemanticSearch = () => {
  const {
    isSearching,
    results,
    isIndexing,
    indexProgress,
    isIndexed,
    indexLibrary,
    searchByText,
    searchByImage,
    clearResults
  } = useSemanticSearch();

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'text' | 'image'>('text');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [minSimilarity, setMinSimilarity] = useState(0.5);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');

  const handleSearch = async () => {
    if (searchMode === 'text') {
      if (!query.trim()) {
        toast.error('Entrez une description');
        return;
      }
      await searchByText(query);
    } else {
      if (!selectedImage) {
        toast.error('Sélectionnez une image');
        return;
      }
      await searchByImage(selectedImage);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const filteredResults = results.filter(r => {
    if (r.similarity < minSimilarity) return false;
    if (mediaTypeFilter !== 'all' && r.type !== mediaTypeFilter) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          Recherche Sémantique
        </CardTitle>
        <CardDescription>
          Recherchez vos médias par description naturelle avec CLIP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indexing Status */}
        {!isIndexed && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Indexation requise</p>
                  <p className="text-xs text-muted-foreground">
                    Indexez votre bibliothèque pour activer la recherche sémantique
                  </p>
                </div>
              </div>
              <Button
                onClick={indexLibrary}
                disabled={isIndexing}
                className="gap-2"
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {indexProgress.toFixed(0)}%
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Indexer
                  </>
                )}
              </Button>
            </div>
            {isIndexing && (
              <Progress value={indexProgress} className="mt-3" />
            )}
          </div>
        )}

        {/* Search Mode Tabs */}
        <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'text' | 'image')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="gap-2">
              <Search className="w-4 h-4" />
              Par description
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2">
              <Image className="w-4 h-4" />
              Par image similaire
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Décrivez ce que vous cherchez</Label>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: coucher de soleil sur la plage, chat noir endormi..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching || !isIndexed}>
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Example Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Exemples:</span>
              {[
                'paysage de montagne',
                'portrait souriant',
                'animaux domestiques',
                'fête anniversaire',
                'plage tropicale'
              ].map(example => (
                <Badge
                  key={example}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => {
                    setQuery(example);
                    searchByText(example);
                  }}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Image de référence</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                {selectedImage ? (
                  <div className="relative inline-block">
                    <img
                      src={selectedImage}
                      alt="Reference"
                      className="max-h-32 rounded"
                    />
                    <button
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      onClick={() => setSelectedImage(null)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour uploader une image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {selectedImage && (
                <Button onClick={handleSearch} disabled={isSearching || !isIndexed} className="w-full gap-2">
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Trouver des images similaires
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Filters */}
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Similarité min: {(minSimilarity * 100).toFixed(0)}%</Label>
            <Slider
              value={[minSimilarity]}
              onValueChange={([v]) => setMinSimilarity(v)}
              min={0.1}
              max={0.9}
              step={0.05}
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={mediaTypeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMediaTypeFilter('all')}
            >
              Tous
            </Button>
            <Button
              variant={mediaTypeFilter === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMediaTypeFilter('image')}
            >
              <Image className="w-4 h-4" />
            </Button>
            <Button
              variant={mediaTypeFilter === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMediaTypeFilter('video')}
            >
              <Video className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Résultats ({filteredResults.length})</Label>
              <Button variant="ghost" size="sm" onClick={clearResults}>
                Effacer
              </Button>
            </div>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-4 gap-2 pr-2">
                {filteredResults.map(result => (
                  <div
                    key={result.mediaId}
                    className="relative group rounded-lg overflow-hidden border border-border/50"
                  >
                    {result.type === 'video' ? (
                      <video
                        src={result.thumbnailUrl || result.mediaUrl}
                        className="w-full aspect-square object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={result.thumbnailUrl || result.mediaUrl}
                        alt={result.title}
                        className="w-full aspect-square object-cover"
                      />
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "self-end text-xs",
                          result.similarity > 0.8 ? "bg-green-500/80" :
                          result.similarity > 0.6 ? "bg-amber-500/80" : "bg-red-500/80"
                        )}
                      >
                        {(result.similarity * 100).toFixed(0)}%
                      </Badge>
                      <div className="flex justify-center">
                        <Button variant="secondary" size="sm" className="gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Voir
                        </Button>
                      </div>
                    </div>

                    {/* Type badge */}
                    <div className="absolute top-1 left-1">
                      {result.type === 'video' ? (
                        <Video className="w-4 h-4 text-white drop-shadow" />
                      ) : (
                        <Image className="w-4 h-4 text-white drop-shadow" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {!isIndexed && (
          <p className="text-xs text-center text-muted-foreground">
            Indexez d'abord votre bibliothèque pour activer la recherche
          </p>
        )}
      </CardContent>
    </Card>
  );
};
