import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Tags, 
  Loader2, 
  Wand2,
  Image,
  CheckCircle,
  Settings2,
  Eye,
  MapPin,
  Smile,
  Box,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TaggingOptions {
  objects: boolean;
  scenes: boolean;
  emotions: boolean;
  colors: boolean;
  ocr: boolean;
  nsfw: boolean;
}

interface TagResult {
  mediaId: string;
  mediaUrl: string;
  tags: {
    category: string;
    label: string;
    confidence: number;
  }[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  objects: <Box className="w-3 h-3" />,
  scenes: <MapPin className="w-3 h-3" />,
  emotions: <Smile className="w-3 h-3" />,
  colors: <Palette className="w-3 h-3" />,
  text: <Eye className="w-3 h-3" />
};

const CATEGORY_COLORS: Record<string, string> = {
  objects: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  scenes: 'bg-green-500/20 text-green-400 border-green-500/30',
  emotions: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  colors: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  text: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
};

export const AutoTagger = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [results, setResults] = useState<TagResult[]>([]);
  const [options, setOptions] = useState<TaggingOptions>({
    objects: true,
    scenes: true,
    emotions: true,
    colors: true,
    ocr: true,
    nsfw: false
  });

  const toggleOption = (key: keyof TaggingOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startAutoTagging = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setResults([]);

    try {
      // Get untagged media count
      const countResponse = await fetch('http://localhost:3001/api/media/untagged-count');
      const { count } = await countResponse.json();
      setTotalCount(count);

      if (count === 0) {
        toast.info('Tous les médias sont déjà tagués !');
        setIsProcessing(false);
        return;
      }

      // Start auto-tagging
      const response = await fetch('http://localhost:3001/api/ai/tags/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options,
          confidenceThreshold
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(l => l.trim());

          for (const line of lines) {
            try {
              const update = JSON.parse(line);
              
              if (update.type === 'progress') {
                setProcessedCount(update.processed);
                setProgress((update.processed / count) * 100);
              } else if (update.type === 'result') {
                setResults(prev => [...prev, update.data]);
              }
            } catch {}
          }
        }

        toast.success('Auto-tagging terminé !', {
          description: `${count} médias analysés`
        });
      }
    } catch (error) {
      toast.error('Erreur lors de l\'auto-tagging', {
        description: 'Vérifiez que YOLO/CLIP est installé'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyTagsToLibrary = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai/tags/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
      });

      if (response.ok) {
        toast.success('Tags appliqués à la bibliothèque !');
        setResults([]);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'application des tags');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="w-5 h-5 text-amber-500" />
          Auto-Tagging Intelligent
        </CardTitle>
        <CardDescription>
          Analysez et taggez automatiquement vos médias avec YOLO + CLIP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Options */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4" />
            Options de détection
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Objets</span>
              </div>
              <Switch
                checked={options.objects}
                onCheckedChange={() => toggleOption('objects')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-sm">Scènes</span>
              </div>
              <Switch
                checked={options.scenes}
                onCheckedChange={() => toggleOption('scenes')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-pink-400" />
                <span className="text-sm">Émotions</span>
              </div>
              <Switch
                checked={options.emotions}
                onCheckedChange={() => toggleOption('emotions')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Couleurs</span>
              </div>
              <Switch
                checked={options.colors}
                onCheckedChange={() => toggleOption('colors')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-400" />
                <span className="text-sm">OCR (texte)</span>
              </div>
              <Switch
                checked={options.ocr}
                onCheckedChange={() => toggleOption('ocr')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-destructive/5">
              <div className="flex items-center gap-2">
                <span className="text-sm">Détection NSFW</span>
              </div>
              <Switch
                checked={options.nsfw}
                onCheckedChange={() => toggleOption('nsfw')}
              />
            </div>
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <Label>Seuil de confiance: {(confidenceThreshold * 100).toFixed(0)}%</Label>
            <Slider
              value={[confidenceThreshold]}
              onValueChange={([v]) => setConfidenceThreshold(v)}
              min={0.3}
              max={0.95}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              Seuls les tags avec une confiance supérieure seront ajoutés
            </p>
          </div>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyse en cours...
              </span>
              <span>{processedCount}/{totalCount}</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Start Button */}
        <Button
          onClick={startAutoTagging}
          disabled={isProcessing}
          className="w-full gap-2"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Lancer l'auto-tagging
            </>
          )}
        </Button>

        {/* Results Preview */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Prévisualisation ({results.length} médias)</Label>
              <Button onClick={applyTagsToLibrary} size="sm" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Appliquer à la bibliothèque
              </Button>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-3">
                {results.slice(0, 10).map(result => (
                  <div
                    key={result.mediaId}
                    className="flex gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <img
                      src={result.mediaUrl}
                      alt=""
                      className="w-20 h-20 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1">
                        {result.tags.map((tag, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className={cn(
                              "text-xs gap-1",
                              CATEGORY_COLORS[tag.category] || 'bg-muted'
                            )}
                          >
                            {CATEGORY_ICONS[tag.category]}
                            {tag.label}
                            <span className="opacity-60">
                              {(tag.confidence * 100).toFixed(0)}%
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {results.length > 10 && (
              <p className="text-xs text-center text-muted-foreground">
                + {results.length - 10} autres médias analysés
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
