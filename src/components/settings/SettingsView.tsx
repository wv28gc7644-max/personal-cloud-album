import React, { useState } from 'react';
import { SettingsLayoutProvider } from './SettingsLayoutProvider';
import { SettingsGrid } from './SettingsGrid';
import { SettingsModule } from '@/types/settings';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Import existing settings components (AI components removed)
import { CardDesignEditor } from '@/components/CardDesignEditor';
import { FFmpegManager } from '@/components/FFmpegManager';
import { SecuritySettings } from '@/components/SecuritySettings';
import { DiscordIntegration } from '@/components/DiscordIntegration';
import { TelegramIntegration } from '@/components/TelegramIntegration';
import { HomeAssistantIntegration } from '@/components/HomeAssistantIntegration';
import { WebhookNotifications } from '@/components/WebhookNotifications';

// Import new settings components
import { NotificationsSettings } from './NotificationsSettings';
import { UpdatesSettings } from './UpdatesSettings';
import { ServerSettings } from './ServerSettings';
import { ThemeSettings } from './ThemeSettings';
import { ThemePresetsPanel } from './ThemePresetsPanel';
import { GridSettings } from './GridSettings';
import { CardDisplaySettings } from './CardDisplaySettings';
import { TagsSettings } from './TagsSettings';
import { PlaylistsSettings } from './PlaylistsSettings';
import { AutoSyncSettings } from './AutoSyncSettings';
import { AdvancedColorEditor } from './AdvancedColorEditor';
import { HomeAutomationHub } from './HomeAutomationHub';
import { ContextMenuSettings } from './ContextMenuSettings';

// Component map for rendering (AI components removed)
const COMPONENT_MAP: Record<string, React.ComponentType> = {
  CardDesignEditor,
  FFmpegManager,
  SecuritySettings,
  DiscordIntegration,
  TelegramIntegration,
  HomeAssistantIntegration,
  WebhookNotifications,
  NotificationsSettings,
  UpdatesSettings,
  ServerSettings,
  ThemeSettings,
  ThemePresetsPanel,
  GridSettings,
  CardDisplaySettings,
  TagsSettings,
  PlaylistsSettings,
  AutoSyncSettings,
  AdvancedColorEditor,
  HomeAutomationHub,
  ContextMenuSettings,
};

export function SettingsView() {
  const [activeModule, setActiveModule] = useState<SettingsModule | null>(null);

  const handleModuleClick = (module: SettingsModule) => {
    setActiveModule(module);
  };

  const handleBack = () => {
    setActiveModule(null);
  };

  const ActiveComponent = activeModule ? COMPONENT_MAP[activeModule.component] : null;

  return (
    <SettingsLayoutProvider>
      <div className="h-full flex flex-col min-h-0">
        {activeModule && ActiveComponent ? (
          <div className="flex flex-col flex-1 min-h-0 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2 shrink-0 self-start mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux paramètres
            </Button>
            <div className="border rounded-xl p-6 bg-card flex-1 min-h-0 overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">{activeModule.name}</h2>
              <ActiveComponent />
            </div>
          </div>
        ) : (
          <SettingsGrid 
            onModuleClick={handleModuleClick}
            activeModuleId={activeModule?.id}
          />
        )}
      </div>
    </SettingsLayoutProvider>
  );
}
