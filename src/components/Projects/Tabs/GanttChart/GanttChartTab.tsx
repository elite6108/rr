import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gantt, Toolbar, Willow, WillowDark} from 'wx-react-gantt';
import 'wx-react-gantt/dist/gantt.css';
import '../../../../styles/gantt/style.css'
import { supabase } from '../../../../lib/supabase';
import { Plus, Edit, Trash2, X, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';

// Add custom styles for the Gantt toolbar
const styles = `
  /* Style container */
  .wx-toolbar {
    padding: 8px;
    display: flex;
    gap: 8px;
  }

  /* Weekend highlighting */
  .sday {
    background-color: rgba(243, 244, 246, 0.5); /* light gray with transparency */
  }

  @media (prefers-color-scheme: dark) {
    .sday {
      background-color: rgba(55, 65, 81, 0.5); /* dark gray with transparency */
    }
  }

  /* Style the Edit button */
  [data-id="edit-task"] .wx-button {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #374151; /* text-gray-700 */
    background-color: #f3f4f6; /* bg-gray-100 */
    border-radius: 6px;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  [data-id="edit-task"] .wx-button:hover {
    background-color: #e5e7eb; /* hover:bg-gray-200 */
  }

  /* Style the Delete button */
  [data-id="delete-task"] .wx-button {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
    background-color: #dc2626;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  [data-id="delete-task"] .wx-button:hover {
    background-color: #b91c1c;
  }

  /* Dark mode styles */
  @media (prefers-color-scheme: dark) {
    [data-id="edit-task"] .wx-button {
      color: #e5e7eb; /* dark:text-gray-200 */
      background-color: #374151; /* dark:bg-gray-700 */
    }

    [data-id="edit-task"] .wx-button:hover {
      background-color: #4b5563; /* dark:hover:bg-gray-600 */
    }

    [data-id="delete-task"] .wx-button:hover {
      background-color: #991b1b;
    }
  }
`;

interface GanttTask {
  id: number;
  text: string;
  description?: string;
  start: Date;
  end: Date;
  duration: number;
  progress: number;
  type: 'task' | 'milestone' | 'summary';
  parent?: number | null;
}

interface GanttLink {
  id: number;
  source: number;
  target: number;
  type: 'end-to-start' | 'start-to-start' | 'end-to-end' | 'start-to-end';
}

interface Project {
  id: string;
  name: string;
}

interface GanttChartTabProps {
  project: Project;
  onBack: () => void;
}

export function GanttChartTab({ project }: GanttChartTabProps) {
  const apiRef = useRef<any>();
  const [loading, setLoading] = useState(true);
  const [loadedTasks, setLoadedTasks] = useState<GanttTask[]>([]);
  const [loadedLinks, setLoadedLinks] = useState<GanttLink[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState<{ [key: number]: GanttTask }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  const [formData, setFormData] = useState<{
    text: string;
    description: string;
    start: Date;
    end: Date;
    duration: number;
    progress: number;
    type: 'task' | 'milestone' | 'summary';
  }>({
    text: '',
    description: '',
    start: (() => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
    end: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
    duration: 1,
    progress: 0,
    type: 'task',
  });

  const columns = [
    {
      id: 'text',
      header: 'Task name',
      align: 'left' as const,
    },
    {
      id: 'start',
      header: 'Start date',
      align: 'center' as const,
    },
    {
      id: 'duration',
      header: 'Duration',
      align: 'center' as const,
    },
    {
      id: 'action',
      header: '',
      width: 1,
      align: 'center' as const,
    },
  ];

  const dayStyle = (date: Date) => {
    const weekday = date.getDay();
    return weekday === 0 || weekday === 6 ? 'sday' : '';
  };

  const scales = [
    { unit: 'month' as const, step: 1, format: 'MMMM yyyy' },
    { unit: 'day' as const, step: 1, format: 'd', css: dayStyle }
  ];

  // Add dark mode effect
  useEffect(() => {
    const updateTheme = () => {
      // Check if dark mode is active by looking at the html tag's class
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      // Try to find the element with either theme class
      const willowElement = document.querySelector('.wx-willow-theme, .wx-willow-dark-theme');
      if (willowElement) {
        if (isDarkMode) {
          willowElement.classList.remove('wx-willow-theme');
          willowElement.classList.add('wx-willow-dark-theme');
          console.log('Switched to dark theme');
        } else {
          willowElement.classList.remove('wx-willow-dark-theme');
          willowElement.classList.add('wx-willow-theme');
          console.log('Switched to light theme');
        }
      }

      // Set up an observer to watch for the element being added
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Check for either theme class
              const element = node.classList.contains('wx-willow-theme') || node.classList.contains('wx-willow-dark-theme') ? 
                node : node.querySelector('.wx-willow-theme, .wx-willow-dark-theme');
              
              if (element) {
                if (isDarkMode) {
                  element.classList.remove('wx-willow-theme');
                  element.classList.add('wx-willow-dark-theme');
                  console.log('New element switched to dark theme');
                } else {
                  element.classList.remove('wx-willow-dark-theme');
                  element.classList.add('wx-willow-theme');
                  console.log('New element switched to light theme');
                }
                observer.disconnect(); // Stop observing once we've made the change
              }
            }
          });
        });
      });

      // Start observing the document with the configured parameters
      observer.observe(document.body, { childList: true, subtree: true });

      // Cleanup the observer after 2 seconds (should be plenty of time)
      setTimeout(() => observer.disconnect(), 2000);
    };

    // Initial update
    updateTheme();

    // Watch for changes to the document's dark mode class
    const darkModeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target instanceof HTMLElement && 
            mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    // Start observing the html element for class changes
    darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Cleanup
    return () => {
      darkModeObserver.disconnect();
    };
  }, []);

  // Add dark mode detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    // Load tasks and links from Supabase when component mounts
    const loadTasksAndLinks = async () => {
      try {
        setLoading(true);
        // Load tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('gantt_tasks')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });

        if (tasksError) throw tasksError;

        // Load links
        const { data: linksData, error: linksError } = await supabase
          .from('gantt_links')
          .select('*')
          .eq('project_id', project.id);

        if (linksError) throw linksError;

        if (tasksData && tasksData.length > 0) {
          const formattedTasks = tasksData.map((task) => {
            // Ensure proper date formatting
            const startDate = new Date(task.start_date);
            const endDate = new Date(task.end_date);
            
            // Set time to midnight to avoid timezone issues
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            
            return {
            id: task.id,
            text: task.text,
            description: task.description,
              start: startDate,
              end: endDate,
            duration: task.duration,
            progress: task.progress,
            type: task.type,
            parent: task.parent_id
            };
          });

          setLoadedTasks(formattedTasks);
        }

        if (linksData) {
          const formattedLinks = linksData.map((link) => ({
            id: link.id,
            source: link.source_task_id,
            target: link.target_task_id,
            type: link.type
          }));

          setLoadedLinks(formattedLinks);
        }
      } catch (err) {
        console.error('Error loading tasks and links:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTasksAndLinks();
  }, [project.id]);

  const createTask = async (taskData: typeof formData) => {
    try {
      const newTask = {
        project_id: project.id,
        text: taskData.text,
        description: taskData.description,
        start_date: taskData.start.toISOString(),
        end_date: taskData.end.toISOString(),
        duration: taskData.duration,
        progress: taskData.progress,
        type: taskData.type,
        parent_id: null,
      };

      const { data, error } = await supabase
        .from('gantt_tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      const formattedTask = {
        id: data.id,
        text: data.text,
        description: data.description,
        start: new Date(data.start_date),
        end: new Date(data.end_date),
        duration: data.duration,
        progress: data.progress,
        type: data.type as 'task' | 'milestone' | 'summary',
        parent: data.parent_id,
      };

      // Update local state
      setLoadedTasks((prev) => {
        const newTasks = [...prev, formattedTask];
        // Force Gantt chart refresh by updating the tasks in the API
        if (apiRef.current) {
          apiRef.current.exec('tasks', newTasks);
        }
        return newTasks;
      });
      
      return formattedTask;
    } catch (err) {
      console.error('Error creating task:', err);
      return null;
    }
  };

  const handleInit = useCallback(
    (api: any) => {
      apiRef.current = api;
      
      // Initialize with both tasks and links
      if (loadedLinks.length > 0) {
        api.exec('links', loadedLinks);
      }

      // Handle task selection
      api.on('select-task', (task: GanttTask) => {
        setSelectedTask(task.id);
        const selected = loadedTasks.find((t) => t.id === task.id);
        if (selected) {
          setFormData({
            text: selected.text,
            description: selected.description || '',
            start: selected.start,
            end: selected.end,
            duration: selected.duration,
            progress: selected.progress,
            type: selected.type,
          });
        }
      });

      // Handle task dragging and resizing
      api.on('drag-task', async (ev: any) => {
        try {
          console.log('Drag event received:', ev);
          const { id, left, width, inProgress } = ev;
          
          // Only process the event when dragging is complete
          if (inProgress) return;

          const task = loadedTasks.find(t => t.id === id);
          if (!task) {
            console.log('Task not found:', id);
            return;
          }

          // Get the current task from the Gantt API
          const currentTask = apiRef.current.getTask(id);
          if (!currentTask) {
            console.log('Could not get task from Gantt API');
            return;
          }

          console.log('Current task from API:', currentTask);

          let newStart = new Date(currentTask.start);
          let newEnd = task.end;

          // Calculate the time difference between old and new start dates
          const timeDiff = newStart.getTime() - task.start.getTime();

          // Only proceed if there's actually a change
          if (timeDiff === 0) {
            console.log('No change in position');
            return;
          }

          // Prepare the updated task based on type
          let updatedTask: GanttTask;
          if (task.type === 'milestone') {
            updatedTask = {
              ...task,
              start: newStart,
              end: newStart
            };
          } else if (task.type === 'summary') {
            updatedTask = {
              ...task,
              start: newStart
            };
          } else {
            // For regular tasks, maintain the same duration by shifting the end date
            newEnd = new Date(task.end.getTime() + timeDiff);
            const durationInDays = Math.ceil(
              (newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)
            );
            updatedTask = {
              ...task,
              start: newStart,
              end: newEnd,
              duration: durationInDays
            };
          }

          console.log('Adding to unsaved changes:', updatedTask);

          // Add to unsaved changes
          setUnsavedChanges(prev => {
            const newChanges = {
              ...prev,
              [id]: updatedTask
            };
            console.log('Updated unsaved changes:', newChanges);
            return newChanges;
          });

          // Ensure hasChanges is set to true
          setHasChanges(true);
          console.log('Set hasChanges to true');

          // Update local state for visual feedback
          setLoadedTasks(prev => {
            const newTasks = prev.map(t => t.id === id ? updatedTask : t);
            console.log('Updated local tasks:', newTasks);
            return newTasks;
          });

          // Update Gantt view
          if (apiRef.current) {
            apiRef.current.exec('tasks', loadedTasks.map(t => 
              t.id === id ? updatedTask : t
            ));
          }
        } catch (err) {
          console.error('Error handling drag:', err);
          // Revert the drag if there was an error
          if (apiRef.current) {
            apiRef.current.exec('tasks', loadedTasks);
          }
        }
      });

      // Add a new event listener for task resize
      api.on('resize-task', async (ev: any) => {
        try {
          console.log('Resize event received:', ev);
          const { id, start, end } = ev;
          if (!start || !end) return;

          const task = loadedTasks.find(t => t.id === id);
          if (!task || task.type !== 'task') return; // Only regular tasks can be resized

          const newStart = new Date(start);
          const newEnd = new Date(end);
          const durationInDays = Math.ceil(
            (newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)
          );

          const updateData = {
            start_date: newStart.toISOString(),
            end_date: newEnd.toISOString(),
            duration: durationInDays
          };

          console.log('Updating task with resize data:', updateData);

          const { error } = await supabase
            .from('gantt_tasks')
            .update(updateData)
            .eq('id', id);

          if (error) throw error;

          // Update local state and refresh Gantt chart
          setLoadedTasks(prev => {
            const newTasks = prev.map(t => 
              t.id === id 
                ? { 
                    ...t, 
                    start: newStart,
                    end: newEnd,
                    duration: durationInDays
                  }
                : t
            );

            if (apiRef.current) {
              apiRef.current.exec('tasks', newTasks);
            }
            return newTasks;
          });
        } catch (err) {
          console.error('Error resizing task:', err);
          if (apiRef.current) {
            apiRef.current.exec('tasks', loadedTasks);
          }
        }
      });

      // Track progress changes without immediate save
      api.on('progress-change', (taskId: number, progress: number) => {
        const task = loadedTasks.find(t => t.id === taskId);
        if (task) {
          const updatedTask = { ...task, progress };
          setUnsavedChanges(prev => ({
            ...prev,
            [taskId]: updatedTask
          }));
          setHasChanges(true);
          
          // Update local state for visual feedback
          setLoadedTasks(prev => prev.map(t => 
            t.id === taskId ? updatedTask : t
          ));
        }
      });

      // Handle task deselection
      api.on('deselect-all', () => {
        setSelectedTask(null);
      });

      // Handle link creation
      api.on('link-created', async (link: GanttLink) => {
        try {
          console.log('Link created:', link);
          const { data, error } = await supabase
            .from('gantt_links')
            .insert([{
              project_id: project.id,
              source_task_id: link.source,
              target_task_id: link.target,
              type: link.type
            }])
            .select()
            .single();

          if (error) throw error;

          const newLink = {
            id: data.id,
            source: data.source_task_id,
            target: data.target_task_id,
            type: data.type
          };

          setLoadedLinks(prev => [...prev, newLink]);
        } catch (err) {
          console.error('Error saving link:', err);
          // Remove the link from the UI if save failed
          if (apiRef.current) {
            apiRef.current.exec('links', loadedLinks);
          }
        }
      });

      // Handle link deletion
      api.on('link-deleted', async (linkId: number) => {
        try {
          const { error } = await supabase
            .from('gantt_links')
            .delete()
            .eq('id', linkId);

          if (error) throw error;

          setLoadedLinks(prev => prev.filter(link => link.id !== linkId));
        } catch (err) {
          console.error('Error deleting link:', err);
          // Restore the link in the UI if delete failed
          if (apiRef.current) {
            apiRef.current.exec('links', loadedLinks);
          }
        }
      });
    },
    [loadedTasks, loadedLinks, project.id]
  );

  const handleTaskUpdate = useCallback(async (task: GanttTask) => {
    try {
      const { error } = await supabase
        .from('gantt_tasks')
        .update({
          text: task.text,
          description: task.description,
          start_date: task.start.toISOString(),
          end_date: task.end.toISOString(),
          duration: task.duration,
          progress: task.progress,
          type: task.type,
          parent_id: task.parent || null
        })
        .eq('id', task.id);

      if (error) throw error;

      setLoadedTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      return false;
    }
  }, []);

  const handleTaskDelete = useCallback(async (taskId: number) => {
    setTaskToDelete(taskId);
    setShowDeleteModal(true);
  }, []);

  const confirmDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;

    try {
      const { error } = await supabase
        .from('gantt_tasks')
        .delete()
        .eq('id', taskToDelete);

      if (error) throw error;

      // Update local state to remove the deleted task
      setLoadedTasks((prev) => prev.filter((t) => t.id !== taskToDelete));
      
      // Clear any selected task in the Gantt chart
      if (apiRef.current) {
        apiRef.current.getState().selected = [];
      }

      setShowDeleteModal(false);
      setTaskToDelete(null);
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      setShowDeleteModal(false);
      setTaskToDelete(null);
      return false;
    }
  }, [taskToDelete]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'start' || name === 'end') {
      const date = new Date(value);
      date.setHours(0, 0, 0, 0);
      setFormData((prev) => ({
        ...prev,
        [name]: date,
      }));
    } else if (name === 'progress' || name === 'duration') {
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTaskId) {
      // Update existing task
      try {
        // Calculate duration in days
        const durationInDays = Math.ceil(
          (formData.end.getTime() - formData.start.getTime()) / (1000 * 60 * 60 * 24)
        );

        const { error } = await supabase
          .from('gantt_tasks')
          .update({
            text: formData.text,
            description: formData.description,
            start_date: formData.start.toISOString(),
            end_date: formData.end.toISOString(),
            duration: durationInDays,
            progress: formData.progress,
            type: formData.type,
          })
          .eq('id', editingTaskId);

        if (error) throw error;

        // Update local state and refresh Gantt chart
        setLoadedTasks(prev => {
          const newTasks = prev.map(task => 
            task.id === editingTaskId 
              ? {
                  ...task,
                  text: formData.text,
                  description: formData.description,
                  start: formData.start,
                  end: formData.end,
                  duration: durationInDays,
                  progress: formData.progress,
                  type: formData.type,
                }
              : task
          );
          // Force Gantt chart refresh
          if (apiRef.current) {
            apiRef.current.exec('tasks', newTasks);
          }
          return newTasks;
        });
      } catch (err) {
        console.error('Error updating task:', err);
      }
    } else {
      // Create new task - also update this part for consistency
      const durationInDays = Math.ceil(
        (formData.end.getTime() - formData.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      await createTask({
        ...formData,
        duration: durationInDays
      });
    }
    setShowSidebar(false);
    setEditingTaskId(null);
  };

  const handleSaveChanges = async () => {
    try {
      for (const taskId in unsavedChanges) {
        const task = unsavedChanges[taskId];
        const updateData: any = {
          text: task.text,
          description: task.description,
          progress: task.progress,
          type: task.type
        };

        // Add date-related fields based on task type
        if (task.type === 'milestone') {
          updateData.start_date = task.start.toISOString();
        } else if (task.type === 'summary') {
          updateData.start_date = task.start.toISOString();
        } else {
          updateData.start_date = task.start.toISOString();
          updateData.end_date = task.end.toISOString();
          updateData.duration = task.duration;
        }

        const { error } = await supabase
          .from('gantt_tasks')
          .update(updateData)
          .eq('id', taskId);

        if (error) throw error;
      }

      // Clear unsaved changes
      setUnsavedChanges({});
      setHasChanges(false);

      // Refresh all tasks to ensure everything is in sync
      const { data: refreshedData, error: refreshError } = await supabase
        .from('gantt_tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });

      if (!refreshError && refreshedData) {
        const formattedTasks = refreshedData.map((t: any) => ({
          id: t.id,
          text: t.text,
          description: t.description,
          start: new Date(t.start_date),
          end: new Date(t.end_date),
          duration: t.duration,
          progress: t.progress,
          type: t.type as 'task' | 'milestone' | 'summary',
          parent: t.parent_id
        }));

        setLoadedTasks(formattedTasks);
        if (apiRef.current) {
          apiRef.current.exec('tasks', formattedTasks);
        }
      }
    } catch (err) {
      console.error('Error saving changes:', err);
    }
  };

  const toolbarItems = [
    {
      id: 'edit-task',
      comp: 'button',
      icon: <Edit className="h-4 w-4" />,
      text: '',
      className: 'p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
      handler: () => {
        if (apiRef.current) {
          const selectedItemId = apiRef.current.getState().selected[0];
          const selectedItem = apiRef.current.getTask(selectedItemId);
          if (selectedItem) {
            setEditingTaskId(selectedItem.id);
            setFormData({
              text: selectedItem.text,
              description: selectedItem.description || '',
              start: selectedItem.start,
              end: selectedItem.end,
              duration: selectedItem.duration,
              progress: selectedItem.progress,
              type: selectedItem.type,
            });
            setShowSidebar(true);
          }
        }
      },
    },
    {
      id: 'delete-task',
      comp: 'button',
      icon: <Trash2 className="h-4 w-4" />,
      text: '',
      className: 'p-2 text-white bg-red-600 rounded-md hover:bg-red-700 dark:hover:bg-red-500',
      handler: () => {
        if (apiRef.current) {
          const selectedItemId = apiRef.current.getState().selected[0];
          if (selectedItemId) {
            handleTaskDelete(selectedItemId);
          }
        }
      },
    },
    {
      id: 'move-up',
      comp: 'button',
      icon: <ChevronUp className="h-4 w-4" />,
      text: '',
      className: 'p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
      handler: () => {
        if (apiRef.current) {
          const selectedItemId = apiRef.current.getState().selected[0];
          if (selectedItemId) {
            apiRef.current.exec('move-task', { id: selectedItemId, mode: 'up' });
          }
        }
      },
    },
    {
      id: 'move-down',
      comp: 'button',
      icon: <ChevronDown className="h-4 w-4" />,
      text: '',
      className: 'p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
      handler: () => {
        if (apiRef.current) {
          const selectedItemId = apiRef.current.getState().selected[0];
          if (selectedItemId) {
            apiRef.current.exec('move-task', { id: selectedItemId, mode: 'down' });
          }
        }
      },
    },
    {
      id: 'indent-right',
      comp: 'button',
      icon: <ChevronRight className="h-4 w-4" />,
      text: '',
      className: 'p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
      handler: async () => {
        if (apiRef.current) {
          const selectedItemId = apiRef.current.getState().selected[0];
          if (selectedItemId) {
            // Execute the indent action which will handle the parent-child relationship
            apiRef.current.exec('indent-task', { id: selectedItemId, mode: true });
            
            // Get the updated task data to save to database
            const updatedTask = apiRef.current.getTask(selectedItemId);
            if (updatedTask && updatedTask.parent) {
              try {
                // Update the child task's parent_id
                const { error: childError } = await supabase
                  .from('gantt_tasks')
                  .update({
                    parent_id: updatedTask.parent
                  })
                  .eq('id', selectedItemId);

                if (childError) throw childError;

                // Update the parent task to be a summary type and open
                const { error: parentError } = await supabase
                  .from('gantt_tasks')
                  .update({
                    type: 'summary'
                  })
                  .eq('id', updatedTask.parent);

                if (parentError) throw parentError;
                
                // Update local state for both child and parent
                setLoadedTasks(prev => {
                  const newTasks = prev.map(task => {
                    if (task.id === selectedItemId) {
                      return { ...task, parent: updatedTask.parent };
                    } else if (task.id === updatedTask.parent) {
                      return { ...task, type: 'summary' as const };
                    }
                    return task;
                  });

                  // Refresh the Gantt chart with updated data
                  if (apiRef.current) {
                    apiRef.current.exec('tasks', newTasks);
                    // Open the parent task to show its children
                    apiRef.current.exec('open-task', { id: updatedTask.parent, mode: true });
                  }
                  return newTasks;
                });

              } catch (err) {
                console.error('Error updating task hierarchy:', err);
              }
            }
          }
        }
      },
    },
    {
      id: 'indent-left',
      comp: 'button',
      icon: <ChevronLeft className="h-4 w-4" />,
      text: '',
      className: 'p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
      handler: async () => {
        if (apiRef.current) {
          const selectedItemId = apiRef.current.getState().selected[0];
          if (selectedItemId) {
            // Get the current task data before outdenting
            const currentTask = apiRef.current.getTask(selectedItemId);
            const oldParentId = currentTask?.parent;

            // Execute the indent action with mode false to outdent
            apiRef.current.exec('indent-task', { id: selectedItemId, mode: false });
            
            // Get the updated task data to save to database
            const updatedTask = apiRef.current.getTask(selectedItemId);
            if (updatedTask) {
              try {
                // Update the child task's parent_id (should be null after outdenting)
                const { error: childError } = await supabase
                  .from('gantt_tasks')
                  .update({
                    parent_id: updatedTask.parent || null
                  })
                  .eq('id', selectedItemId);

                if (childError) throw childError;

                // Check if the old parent still has children
                if (oldParentId) {
                  const remainingChildren = loadedTasks.filter(task => 
                    task.parent === oldParentId && task.id !== selectedItemId
                  );

                  // If no children remain, convert parent back to task type
                  if (remainingChildren.length === 0) {
                    const { error: parentError } = await supabase
                      .from('gantt_tasks')
                      .update({
                        type: 'task'
                      })
                      .eq('id', oldParentId);

                    if (parentError) throw parentError;
                  }
                }
                
                // Update local state
                setLoadedTasks(prev => {
                  const newTasks = prev.map(task => {
                    if (task.id === selectedItemId) {
                      return { ...task, parent: updatedTask.parent };
                    } else if (task.id === oldParentId) {
                      // Check if this parent still has children
                      const stillHasChildren = prev.some(t => 
                        t.parent === oldParentId && t.id !== selectedItemId
                      );
                      return stillHasChildren ? task : { ...task, type: 'task' as const };
                    }
                    return task;
                  });

                  // Refresh the Gantt chart with updated data
                  if (apiRef.current) {
                    apiRef.current.exec('tasks', newTasks);
                  }
                  return newTasks;
                });

              } catch (err) {
                console.error('Error updating task hierarchy:', err);
              }
            }
          }
        }
      },
    },
  ];

  // Reset editingTaskId when closing the sidebar
  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setEditingTaskId(null);
  };

  // Update the New Task button click handler
  const handleNewTaskClick = () => {
    setEditingTaskId(null);
    setFormData({
      text: '',
      description: '',
      start: new Date(),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 0,
      progress: 0,
      type: 'task' as const,
    });
    setShowSidebar(true);
  };

  // Add a check in the render to verify the Save Changes button visibility
  useEffect(() => {
    console.log('Current hasChanges state:', hasChanges);
    console.log('Current unsavedChanges:', unsavedChanges);
  }, [hasChanges, unsavedChanges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Gantt Chart - {project.name}
        </h2>
        <div className="flex items-center gap-4">
          {selectedTask && (
            <div className="flex items-center gap-2">
              {toolbarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.handler}
                  className={item.className}
                  title={item.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          )}
          <div className="hidden lg:flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Save Changes
              </button>
            )}
            <button
              onClick={handleNewTaskClick}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Portrait Message */}
      <div className="block lg:hidden text-center p-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900">
        <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">
          Please view on another device
        </h3>
        <p className="text-amber-700 dark:text-amber-300">
        For the best viewing experience of the Gantt chart, please use a desktop computer. Alternatively, a laptop or tablet in landscape mode will also provide acceptable viewing.
        </p>
      </div>

      {/* Desktop/Landscape Gantt View */}
      <div className="hidden lg:block">
        <p style={{ margin: 0 }}><strong>Tip:</strong> For the best experience, view this page in landscape mode using a tablet or a desktop computer.</p>
        <p style={{ margin: 0 }}>To zoom the timeline, hold <strong>Ctrl</strong> (or <strong>⌘ Command</strong> on Mac) and scroll with your mouse wheel whilst over the timeline.</p>
        <div className="demo-rows w-full h-full relative">
          <Willow>
            <Gantt
              apiRef={apiRef}
              tasks={loadedTasks}
              links={loadedLinks}
              scales={scales}
              zoom={true}
              columns={columns}
              init={handleInit}
              dayStyle={dayStyle}
              readonly={true}
            />
          </Willow>
        </div>
      </div>

      {/* Task Form Sidebar */}
      {showSidebar && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={handleCloseSidebar}></div>
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {editingTaskId ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                    onClick={handleCloseSidebar}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Task Name
                </label>
                <input
                  type="text"
                  name="text"
                  value={formData.text}
                  onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        setFormData(prev => ({ ...prev, type: e.target.value as 'task' | 'milestone' | 'summary' }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="task">Task</option>
                      <option value="milestone">Milestone</option>
                      <option value="summary">Summary</option>
                    </select>
                  </div>

                  {(formData.type === 'task' || formData.type === 'summary') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
            </div>
                  )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start"
                  value={formData.start.toISOString().split('T')[0]}
                  onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

                  {formData.type === 'task' && (
                    <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <input
                  type="date"
                  name="end"
                  value={formData.end.toISOString().split('T')[0]}
                  onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progress ({formData.progress}%)
                </label>
                <div className="flex items-center gap-4">
                <input
                    type="range"
                  name="progress"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={handleFormChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                    {formData.progress}%
                  </span>
                </div>
              </div>
                    </>
                  )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                      {editingTaskId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full m-4">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Confirm Task Deletion
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}