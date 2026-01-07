import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  Pause,
  Trash2,
  Plus,
  Calendar,
  Moon,
  Sun,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScheduledTask {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
  schedule: {
    type: 'once' | 'daily' | 'weekly';
    time: string;
    dayOfWeek?: number;
    date?: string;
  };
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

interface QueueItem {
  id: string;
  taskId: string;
  taskName: string;
  mediaCount: number;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export const BatchScheduler = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>(() => {
    const saved = localStorage.getItem('mediavault-scheduled-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    workflowId: '',
    scheduleType: 'daily' as 'once' | 'daily' | 'weekly',
    time: '03:00',
    dayOfWeek: 1,
    date: ''
  });

  // Get workflows from localStorage
  const [workflows, setWorkflows] = useState<Array<{ id: string; name: string }>>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('mediavault-workflows');
    if (saved) {
      const parsed = JSON.parse(saved);
      setWorkflows(parsed.map((w: any) => ({ id: w.id, name: w.name })));
    }
  }, []);

  const saveTasks = (updated: ScheduledTask[]) => {
    localStorage.setItem('mediavault-scheduled-tasks', JSON.stringify(updated));
    setTasks(updated);
  };

  const createTask = () => {
    if (!newTask.name.trim()) {
      toast.error('Entrez un nom pour la tâche');
      return;
    }

    if (!newTask.workflowId) {
      toast.error('Sélectionnez un workflow');
      return;
    }

    const workflow = workflows.find(w => w.id === newTask.workflowId);
    const now = new Date();
    const [hours, minutes] = newTask.time.split(':').map(Number);
    
    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const task: ScheduledTask = {
      id: crypto.randomUUID(),
      name: newTask.name,
      workflowId: newTask.workflowId,
      workflowName: workflow?.name || 'Inconnu',
      schedule: {
        type: newTask.scheduleType,
        time: newTask.time,
        dayOfWeek: newTask.dayOfWeek,
        date: newTask.date
      },
      enabled: true,
      nextRun,
      status: 'idle'
    };

    saveTasks([...tasks, task]);
    setNewTask({
      name: '',
      workflowId: '',
      scheduleType: 'daily',
      time: '03:00',
      dayOfWeek: 1,
      date: ''
    });
    toast.success('Tâche planifiée créée');
  };

  const deleteTask = (taskId: string) => {
    saveTasks(tasks.filter(t => t.id !== taskId));
    toast.success('Tâche supprimée');
  };

  const toggleTask = (taskId: string) => {
    saveTasks(tasks.map(t => 
      t.id === taskId ? { ...t, enabled: !t.enabled } : t
    ));
  };

  const runTaskNow = async (task: ScheduledTask) => {
    const queueItem: QueueItem = {
      id: crypto.randomUUID(),
      taskId: task.id,
      taskName: task.name,
      mediaCount: 0,
      progress: 0,
      status: 'queued',
      startedAt: new Date()
    };

    setQueue(prev => [...prev, queueItem]);
    setIsProcessing(true);

    try {
      // Update status to processing
      setQueue(prev => prev.map(q => 
        q.id === queueItem.id ? { ...q, status: 'processing' } : q
      ));

      // Simulate processing
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setQueue(prev => prev.map(q => 
          q.id === queueItem.id ? { ...q, progress: i } : q
        ));
      }

      // Complete
      setQueue(prev => prev.map(q => 
        q.id === queueItem.id ? { 
          ...q, 
          status: 'completed', 
          progress: 100,
          completedAt: new Date()
        } : q
      ));

      // Update task last run
      saveTasks(tasks.map(t => 
        t.id === task.id ? { ...t, lastRun: new Date(), status: 'completed' } : t
      ));

      toast.success(`${task.name} terminé !`);
    } catch (error) {
      setQueue(prev => prev.map(q => 
        q.id === queueItem.id ? { 
          ...q, 
          status: 'failed',
          error: 'Erreur lors de l\'exécution'
        } : q
      ));
      toast.error(`Erreur: ${task.name}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(q => q.status !== 'completed'));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatNextRun = (date?: Date) => {
    if (!date) return 'Non planifié';
    return new Date(date).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          Planificateur de Tâches
        </CardTitle>
        <CardDescription>
          Planifiez des traitements batch automatiques pendant les heures creuses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Task */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-4">
          <Label className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle tâche planifiée
          </Label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Nom de la tâche</Label>
              <Input
                value={newTask.name}
                onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Backup nocturne"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Workflow à exécuter</Label>
              <Select
                value={newTask.workflowId}
                onValueChange={(v) => setNewTask(prev => ({ ...prev, workflowId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Fréquence</Label>
              <Select
                value={newTask.scheduleType}
                onValueChange={(v) => setNewTask(prev => ({ 
                  ...prev, 
                  scheduleType: v as 'once' | 'daily' | 'weekly'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Une fois</SelectItem>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Heure d'exécution</Label>
              <Input
                type="time"
                value={newTask.time}
                onChange={(e) => setNewTask(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>

            {newTask.scheduleType === 'weekly' && (
              <div className="space-y-2">
                <Label className="text-xs">Jour de la semaine</Label>
                <Select
                  value={newTask.dayOfWeek.toString()}
                  onValueChange={(v) => setNewTask(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lundi</SelectItem>
                    <SelectItem value="2">Mardi</SelectItem>
                    <SelectItem value="3">Mercredi</SelectItem>
                    <SelectItem value="4">Jeudi</SelectItem>
                    <SelectItem value="5">Vendredi</SelectItem>
                    <SelectItem value="6">Samedi</SelectItem>
                    <SelectItem value="0">Dimanche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={createTask} className="w-full gap-2">
            <Calendar className="w-4 h-4" />
            Créer la tâche planifiée
          </Button>
        </div>

        {/* Scheduled Tasks List */}
        <div className="space-y-2">
          <Label>Tâches planifiées ({tasks.length})</Label>
          <ScrollArea className="h-48">
            <div className="space-y-2 pr-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune tâche planifiée
                </p>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      !task.enabled && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {task.schedule.type === 'daily' ? (
                        <Moon className="w-4 h-4 text-indigo-400" />
                      ) : task.schedule.type === 'weekly' ? (
                        <Calendar className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-400" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{task.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.workflowName} • {task.schedule.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Prochaine exécution</p>
                        <p className="text-xs">{formatNextRun(task.nextRun)}</p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => runTaskNow(task)}
                        disabled={isProcessing}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => toggleTask(task.id)}
                      />
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Queue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>File d'attente ({queue.length})</Label>
            {queue.some(q => q.status === 'completed') && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Effacer terminées
              </Button>
            )}
          </div>
          <ScrollArea className="h-32">
            <div className="space-y-2 pr-2">
              {queue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune tâche en cours
                </p>
              ) : (
                queue.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.taskName}</p>
                      {item.status === 'processing' && (
                        <Progress value={item.progress} className="h-1 mt-1" />
                      )}
                    </div>
                    <Badge variant={
                      item.status === 'completed' ? 'default' :
                      item.status === 'failed' ? 'destructive' :
                      'secondary'
                    }>
                      {item.status === 'queued' && 'En attente'}
                      {item.status === 'processing' && `${item.progress}%`}
                      {item.status === 'completed' && 'Terminé'}
                      {item.status === 'failed' && 'Échec'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
