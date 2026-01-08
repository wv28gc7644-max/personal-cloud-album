import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'light' | 'system';

export function ThemeSettings() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('mediavault-theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
    
    localStorage.setItem('mediavault-theme', theme);
  }, [theme]);

  const themes: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'system', label: 'Système', icon: Monitor },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Thème de l'interface
          </CardTitle>
          <CardDescription>Choisissez le mode d'affichage de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? 'default' : 'outline'}
                className={cn(
                  "flex flex-col h-auto py-4 gap-2",
                  theme === value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                onClick={() => setTheme(value)}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prévisualisation */}
      <Card>
        <CardHeader>
          <CardTitle>Prévisualisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="w-full h-8 rounded bg-primary mb-2" />
              <div className="w-3/4 h-3 rounded bg-muted mb-2" />
              <div className="w-1/2 h-3 rounded bg-muted" />
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="w-full h-8 rounded bg-secondary mb-2" />
              <div className="w-3/4 h-3 rounded bg-muted mb-2" />
              <div className="w-1/2 h-3 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
