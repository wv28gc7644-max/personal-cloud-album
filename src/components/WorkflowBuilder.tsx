import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Workflow, 
  Plus, 
  Play, 
  Pause,
  Trash2,
  GripVertical,
  Save,
  Upload,
  Image,
  Video,
  Music,
  FileText,
  Tag,
  Wand2,
  ArrowRight,
  Settings2,
  Copy,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  icon: React.ReactNode;
  config: Record<string, any>;
  enabled: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

const AVAILABLE_STEPS = [
  { type: 'upload', name: 'Upload fichiers', icon: <Upload className="w-4 h-4" />, category: 'input' },
  { type: 'compress', name: 'Compresser', icon: <Image className="w-4 h-4" />, category: 'process' },
  { type: 'thumbnail', name: 'Générer miniatures', icon: <Image className="w-4 h-4" />, category: 'process' },
  { type: 'auto-tag', name: 'Auto-tagging IA', icon: <Tag className="w-4 h-4" />, category: 'ai' },
  { type: 'face-detect', name: 'Détection visages', icon: <Wand2 className="w-4 h-4" />, category: 'ai' },
  { type: 'transcribe', name: 'Transcription audio', icon: <FileText className="w-4 h-4" />, category: 'ai' },
  { type: 'upscale', name: 'Upscale IA', icon: <Image className="w-4 h-4" />, category: 'ai' },
  { type: 'video-preview', name: 'Préview vidéo', icon: <Video className="w-4 h-4" />, category: 'process' },
  { type: 'extract-audio', name: 'Extraire audio', icon: <Music className="w-4 h-4" />, category: 'process' },
  { type: 'notify', name: 'Notification', icon: <CheckCircle className="w-4 h-4" />, category: 'output' },
];

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'import-standard',
    name: 'Import Standard',
    description: 'Upload → Compression → Miniatures → Tags auto',
    steps: [
      { id: '1', type: 'upload', name: 'Upload fichiers', icon: <Upload className="w-4 h-4" />, config: {}, enabled: true },
      { id: '2', type: 'compress', name: 'Compresser', icon: <Image className="w-4 h-4" />, config: { quality: 85 }, enabled: true },
      { id: '3', type: 'thumbnail', name: 'Générer miniatures', icon: <Image className="w-4 h-4" />, config: { size: 300 }, enabled: true },
      { id: '4', type: 'auto-tag', name: 'Auto-tagging IA', icon: <Tag className="w-4 h-4" />, config: { confidence: 0.7 }, enabled: true },
    ]
  },
  {
    id: 'video-process',
    name: 'Traitement Vidéo',
    description: 'Upload → Préview → Transcription → Tags',
    steps: [
      { id: '1', type: 'upload', name: 'Upload fichiers', icon: <Upload className="w-4 h-4" />, config: {}, enabled: true },
      { id: '2', type: 'video-preview', name: 'Préview vidéo', icon: <Video className="w-4 h-4" />, config: { duration: 5 }, enabled: true },
      { id: '3', type: 'transcribe', name: 'Transcription audio', icon: <FileText className="w-4 h-4" />, config: { language: 'fr' }, enabled: true },
      { id: '4', type: 'auto-tag', name: 'Auto-tagging IA', icon: <Tag className="w-4 h-4" />, config: {}, enabled: true },
    ]
  },
  {
    id: 'face-organize',
    name: 'Organisation par Visages',
    description: 'Upload → Détection visages → Tags personnes',
    steps: [
      { id: '1', type: 'upload', name: 'Upload fichiers', icon: <Upload className="w-4 h-4" />, config: {}, enabled: true },
      { id: '2', type: 'face-detect', name: 'Détection visages', icon: <Wand2 className="w-4 h-4" />, config: {}, enabled: true },
      { id: '3', type: 'auto-tag', name: 'Auto-tagging IA', icon: <Tag className="w-4 h-4" />, config: {}, enabled: true },
      { id: '4', type: 'notify', name: 'Notification', icon: <CheckCircle className="w-4 h-4" />, config: {}, enabled: true },
    ]
  }
];

export const WorkflowBuilder = () => {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(() => {
    const saved = localStorage.getItem('mediavault-workflows');
    return saved ? JSON.parse(saved) : WORKFLOW_TEMPLATES;
  });
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowTemplate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState('');

  const saveWorkflows = useCallback((updated: WorkflowTemplate[]) => {
    localStorage.setItem('mediavault-workflows', JSON.stringify(updated));
    setWorkflows(updated);
  }, []);

  const createNewWorkflow = () => {
    if (!newWorkflowName.trim()) {
      toast.error('Entrez un nom pour le workflow');
      return;
    }

    const newWorkflow: WorkflowTemplate = {
      id: crypto.randomUUID(),
      name: newWorkflowName,
      description: 'Nouveau workflow personnalisé',
      steps: []
    };

    saveWorkflows([...workflows, newWorkflow]);
    setActiveWorkflow(newWorkflow);
    setNewWorkflowName('');
    toast.success('Workflow créé');
  };

  const deleteWorkflow = (id: string) => {
    saveWorkflows(workflows.filter(w => w.id !== id));
    if (activeWorkflow?.id === id) {
      setActiveWorkflow(null);
    }
    toast.success('Workflow supprimé');
  };

  const addStep = (stepType: string) => {
    if (!activeWorkflow) return;

    const stepTemplate = AVAILABLE_STEPS.find(s => s.type === stepType);
    if (!stepTemplate) return;

    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      type: stepType,
      name: stepTemplate.name,
      icon: stepTemplate.icon,
      config: {},
      enabled: true
    };

    const updated = {
      ...activeWorkflow,
      steps: [...activeWorkflow.steps, newStep]
    };

    setActiveWorkflow(updated);
    saveWorkflows(workflows.map(w => w.id === updated.id ? updated : w));
  };

  const removeStep = (stepId: string) => {
    if (!activeWorkflow) return;

    const updated = {
      ...activeWorkflow,
      steps: activeWorkflow.steps.filter(s => s.id !== stepId)
    };

    setActiveWorkflow(updated);
    saveWorkflows(workflows.map(w => w.id === updated.id ? updated : w));
  };

  const toggleStep = (stepId: string) => {
    if (!activeWorkflow) return;

    const updated = {
      ...activeWorkflow,
      steps: activeWorkflow.steps.map(s => 
        s.id === stepId ? { ...s, enabled: !s.enabled } : s
      )
    };

    setActiveWorkflow(updated);
    saveWorkflows(workflows.map(w => w.id === updated.id ? updated : w));
  };

  const runWorkflow = async () => {
    if (!activeWorkflow || activeWorkflow.steps.length === 0) {
      toast.error('Ajoutez des étapes au workflow');
      return;
    }

    setIsRunning(true);
    setRunProgress(0);

    const enabledSteps = activeWorkflow.steps.filter(s => s.enabled);

    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      setCurrentStep(step.id);

      try {
        await fetch('http://localhost:3001/api/workflow/run-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step })
        });

        setRunProgress(((i + 1) / enabledSteps.length) * 100);
      } catch (error) {
        toast.error(`Erreur à l'étape: ${step.name}`);
        break;
      }
    }

    setIsRunning(false);
    setCurrentStep(null);
    toast.success('Workflow terminé !');
  };

  const duplicateWorkflow = (workflow: WorkflowTemplate) => {
    const duplicate: WorkflowTemplate = {
      ...workflow,
      id: crypto.randomUUID(),
      name: `${workflow.name} (copie)`
    };
    saveWorkflows([...workflows, duplicate]);
    toast.success('Workflow dupliqué');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-indigo-500" />
          Workflows Automatisés
        </CardTitle>
        <CardDescription>
          Créez des chaînes de traitement automatiques pour vos médias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {/* Workflow List */}
          <div className="space-y-3">
            <Label>Workflows disponibles</Label>
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-2">
                {workflows.map(workflow => (
                  <div
                    key={workflow.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      activeWorkflow?.id === workflow.id
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-border"
                    )}
                    onClick={() => setActiveWorkflow(workflow)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{workflow.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateWorkflow(workflow);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkflow(workflow.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {workflow.steps.length} étapes
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Nouveau workflow..."
                className="flex-1"
              />
              <Button onClick={createNewWorkflow} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Workflow Editor */}
          <div className="col-span-2 space-y-3">
            {activeWorkflow ? (
              <>
                <div className="flex items-center justify-between">
                  <Label>{activeWorkflow.name}</Label>
                  <Button
                    onClick={runWorkflow}
                    disabled={isRunning || activeWorkflow.steps.length === 0}
                    className="gap-2"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        En cours... {runProgress.toFixed(0)}%
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Exécuter
                      </>
                    )}
                  </Button>
                </div>

                {/* Steps List */}
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {activeWorkflow.steps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Ajoutez des étapes ci-dessous
                      </p>
                    ) : (
                      activeWorkflow.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg border transition-all",
                            !step.enabled && "opacity-50",
                            currentStep === step.id && "border-primary bg-primary/10"
                          )}
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <Badge variant="outline" className="text-xs">
                            {index + 1}
                          </Badge>
                          <div className="flex items-center gap-2 flex-1">
                            {step.icon}
                            <span className="text-sm">{step.name}</span>
                          </div>
                          {currentStep === step.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          )}
                          <Switch
                            checked={step.enabled}
                            onCheckedChange={() => toggleStep(step.id)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Add Steps */}
                <div className="space-y-2">
                  <Label className="text-xs">Ajouter une étape</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_STEPS.map(step => (
                      <Button
                        key={step.type}
                        variant="outline"
                        size="sm"
                        onClick={() => addStep(step.type)}
                        className="gap-1 text-xs"
                      >
                        {step.icon}
                        {step.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sélectionnez un workflow ou créez-en un nouveau
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
