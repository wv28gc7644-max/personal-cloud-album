import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export interface AITask {
  id: string;
  type: "image" | "video" | "audio" | "voice" | "montage" | "other";
  name: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  params?: Record<string, any>;
}

export function useAITaskQueue() {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Charger depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem("ai-task-queue");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTasks(parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          startedAt: t.startedAt ? new Date(t.startedAt) : undefined,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined
        })));
      } catch (e) {
        console.error("Error loading tasks:", e);
      }
    }
  }, []);

  // Sauvegarder dans localStorage
  useEffect(() => {
    localStorage.setItem("ai-task-queue", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((
    type: AITask["type"],
    name: string,
    params?: Record<string, any>
  ): AITask => {
    const task: AITask = {
      id: crypto.randomUUID(),
      type,
      name,
      status: "pending",
      progress: 0,
      createdAt: new Date(),
      params
    };

    setTasks(prev => [...prev, task]);
    
    toast.info("Tâche ajoutée à la file d'attente", {
      description: name
    });

    return task;
  }, []);

  const updateTask = useCallback((
    id: string,
    updates: Partial<AITask>
  ) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

  const startTask = useCallback((id: string) => {
    updateTask(id, { 
      status: "processing", 
      startedAt: new Date(),
      progress: 0
    });
    setIsProcessing(true);
  }, [updateTask]);

  const completeTask = useCallback((id: string, result?: any) => {
    updateTask(id, { 
      status: "completed", 
      completedAt: new Date(),
      progress: 100,
      result
    });
    
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast.success("Tâche terminée", {
        description: task.name
      });
    }
    
    setIsProcessing(false);
  }, [updateTask, tasks]);

  const failTask = useCallback((id: string, error: string) => {
    updateTask(id, { 
      status: "failed", 
      completedAt: new Date(),
      error
    });
    
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast.error("Tâche échouée", {
        description: `${task.name}: ${error}`
      });
    }
    
    setIsProcessing(false);
  }, [updateTask, tasks]);

  const cancelTask = useCallback((id: string) => {
    updateTask(id, { 
      status: "cancelled", 
      completedAt: new Date()
    });
    
    toast.info("Tâche annulée");
    setIsProcessing(false);
  }, [updateTask]);

  const updateProgress = useCallback((id: string, progress: number) => {
    updateTask(id, { progress: Math.min(100, Math.max(0, progress)) });
  }, [updateTask]);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => 
      t.status !== "completed" && t.status !== "failed" && t.status !== "cancelled"
    ));
    toast.success("Historique nettoyé");
  }, []);

  const getNextPending = useCallback((): AITask | null => {
    return tasks.find(t => t.status === "pending") || null;
  }, [tasks]);

  const getPendingCount = useCallback((): number => {
    return tasks.filter(t => t.status === "pending").length;
  }, [tasks]);

  const getRecentTasks = useCallback((limit: number = 10): AITask[] => {
    return [...tasks]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }, [tasks]);

  return {
    tasks,
    isProcessing,
    addTask,
    updateTask,
    startTask,
    completeTask,
    failTask,
    cancelTask,
    updateProgress,
    removeTask,
    clearCompleted,
    getNextPending,
    getPendingCount,
    getRecentTasks
  };
}
