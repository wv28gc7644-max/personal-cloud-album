import { useMemo } from 'react';
import { useMediaStats } from '@/hooks/useMediaStats';
import { useMediaStore } from '@/hooks/useMediaStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MiniHeatmap } from './VideoHeatmap';
import { 
  BarChart3, 
  Eye, 
  Clock, 
  TrendingUp, 
  Trash2,
  Image,
  Video,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatsPanel() {
  const { getAllStats, getTotalWatchTime, getMostViewed, clearStats } = useMediaStats();
  const { media } = useMediaStore();
  
  const allStats = getAllStats();
  const mostViewed = getMostViewed(10);
  const totalWatchTime = getTotalWatchTime();

  const formatWatchTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const stats = useMemo(() => {
    const totalViews = allStats.reduce((sum, s) => sum + s.viewCount, 0);
    const mediaWithStats = allStats.length;
    const mediaWithoutStats = media.length - mediaWithStats;
    const avgViewsPerMedia = mediaWithStats > 0 ? totalViews / mediaWithStats : 0;

    return {
      totalViews,
      mediaWithStats,
      mediaWithoutStats,
      avgViewsPerMedia,
    };
  }, [allStats, media.length]);

  const getMediaById = (id: string) => media.find(m => m.id === id);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            Statistiques
          </h1>
          <p className="text-muted-foreground mt-1">
            Analysez vos habitudes de visionnage
          </p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                  <p className="text-sm text-muted-foreground">Vues totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatWatchTime(totalWatchTime)}</p>
                  <p className="text-sm text-muted-foreground">Temps de visionnage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgViewsPerMedia.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Moyenne par média</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Image className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.mediaWithStats}</p>
                  <p className="text-sm text-muted-foreground">Médias consultés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Most viewed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Médias les plus vus</CardTitle>
              <CardDescription>Top 10 de vos médias les plus consultés</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearStats}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </CardHeader>
          <CardContent>
            {mostViewed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune statistique disponible</p>
                <p className="text-sm">Consultez des médias pour voir apparaître les statistiques</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mostViewed.map((stat, index) => {
                  const mediaItem = getMediaById(stat.mediaId);
                  if (!mediaItem) return null;

                  const maxViews = mostViewed[0]?.viewCount || 1;
                  const percentage = (stat.viewCount / maxViews) * 100;
                  const hasSegments = stat.segments && stat.segments.length > 0;

                  return (
                    <div key={stat.mediaId} className="space-y-2">
                      <div className="flex items-center gap-4">
                        <span className="w-6 text-center font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={mediaItem.thumbnailUrl || mediaItem.url} 
                            alt={mediaItem.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{mediaItem.name}</p>
                            {mediaItem.type === 'video' ? (
                              <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Image className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                            {hasSegments && (
                              <span title="Heatmap disponible">
                                <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{stat.viewCount}</p>
                          <p className="text-xs text-muted-foreground">vues</p>
                        </div>
                        {stat.totalWatchTime > 0 && (
                          <div className="text-right text-sm text-muted-foreground">
                            {formatWatchTime(stat.totalWatchTime)}
                          </div>
                        )}
                      </div>
                      {/* Mini heatmap for videos with segments */}
                      {mediaItem.type === 'video' && mediaItem.duration && hasSegments && (
                        <div className="ml-10 pl-6">
                          <div className="flex items-center gap-2 mb-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-muted-foreground">Passages les plus regardés</span>
                          </div>
                          <MiniHeatmap stats={stat} duration={mediaItem.duration} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Never viewed */}
        {stats.mediaWithoutStats > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Médias jamais consultés</CardTitle>
              <CardDescription>
                {stats.mediaWithoutStats} média{stats.mediaWithoutStats > 1 ? 's' : ''} n'ont jamais été ouverts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {media
                  .filter(m => !allStats.find(s => s.mediaId === m.id))
                  .slice(0, 12)
                  .map(item => (
                    <div 
                      key={item.id} 
                      className="w-16 h-16 rounded-lg overflow-hidden bg-muted opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <img 
                        src={item.thumbnailUrl || item.url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                {stats.mediaWithoutStats > 12 && (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    +{stats.mediaWithoutStats - 12}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
