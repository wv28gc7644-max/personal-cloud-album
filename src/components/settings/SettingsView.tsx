import React, { useState } from 'react';
import { SettingsLayoutProvider } from './SettingsLayoutProvider';
import { SettingsGrid } from './SettingsGrid';
import { SettingsModule } from '@/types/settings';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Import existing settings components
import { LocalAISettingsReorganized } from '@/components/LocalAISettingsReorganized';
import { CardDesignEditor } from '@/components/CardDesignEditor';
import { FFmpegManager } from '@/components/FFmpegManager';
import { SecuritySettings } from '@/components/SecuritySettings';
import { AICharacters } from '@/components/AICharacters';
import { DiscordIntegration } from '@/components/DiscordIntegration';
import { TelegramIntegration } from '@/components/TelegramIntegration';
import { HomeAssistantIntegration } from '@/components/HomeAssistantIntegration';
import { WebhookNotifications } from '@/components/WebhookNotifications';

// Component map for rendering
const COMPONENT_MAP: Record<string, React.ComponentType> = {
  LocalAISettingsReorganized,
  CardDesignEditor,
  FFmpegManager,
  SecuritySettings,
  AICharacters,
  DiscordIntegration,
  TelegramIntegration,
  HomeAssistantIntegration,
  WebhookNotifications,
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
      <div className="h-full">
        {activeModule && ActiveComponent ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux paramètres
            </Button>
            <div className="border rounded-xl p-6 bg-card">
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
