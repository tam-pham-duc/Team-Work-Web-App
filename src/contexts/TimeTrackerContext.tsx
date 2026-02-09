import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TrackerTask {
  taskId: string;
  taskTitle: string;
  projectName?: string;
}

interface TimeTrackerContextType {
  activeTrackerTask: TrackerTask | null;
  openTracker: (task: TrackerTask) => void;
  closeTracker: () => void;
  isTrackerOpen: boolean;
}

const TimeTrackerContext = createContext<TimeTrackerContextType | null>(null);

export function TimeTrackerProvider({ children }: { children: ReactNode }) {
  const [activeTrackerTask, setActiveTrackerTask] = useState<TrackerTask | null>(null);

  const openTracker = useCallback((task: TrackerTask) => {
    setActiveTrackerTask(task);
  }, []);

  const closeTracker = useCallback(() => {
    setActiveTrackerTask(null);
  }, []);

  return (
    <TimeTrackerContext.Provider
      value={{
        activeTrackerTask,
        openTracker,
        closeTracker,
        isTrackerOpen: activeTrackerTask !== null,
      }}
    >
      {children}
    </TimeTrackerContext.Provider>
  );
}

export function useTimeTracker() {
  const context = useContext(TimeTrackerContext);
  if (!context) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
}
