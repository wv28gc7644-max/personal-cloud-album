import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, 
  Search, 
  Zap, 
  Settings2,
  LayoutGrid
} from 'lucide-react';
import { HomeWidgetGrid } from './HomeWidgetGrid';
import { DeviceDiscovery } from './DeviceDiscovery';
import { EnergyDashboard } from './EnergyDashboard';
import { HomeAutomationHub } from '@/components/settings/HomeAutomationHub';

export function SmartHomeDashboard() {
  const [activeTab, setActiveTab] = useState('widgets');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" />
            MediaVault Home
          </h1>
          <p className="text-muted-foreground text-sm">
            Votre hub domotique intelligent
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="widgets" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Widgets</span>
          </TabsTrigger>
          <TabsTrigger value="discovery" className="gap-2">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Découverte</span>
          </TabsTrigger>
          <TabsTrigger value="energy" className="gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Énergie</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Connexion</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="widgets" className="mt-6">
          <HomeWidgetGrid />
        </TabsContent>

        <TabsContent value="discovery" className="mt-6">
          <DeviceDiscovery />
        </TabsContent>

        <TabsContent value="energy" className="mt-6">
          <EnergyDashboard />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <HomeAutomationHub />
        </TabsContent>
      </Tabs>
    </div>
  );
}
