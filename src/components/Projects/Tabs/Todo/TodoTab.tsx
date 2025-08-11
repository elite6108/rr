import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../lib/supabase';
import { 
  Anvil,
  Axe,
  Bell,
  Bolt,
  BookUser,
  BrickWall,
  Brush,
  Cable,
  Camera,
  Cctv,
  ChartColumnBig,
  CircleCheckBig,
  CircleParking,
  CirclePoundSterling,
  CirclePower,
  Clipboard,
  ClipboardCheck,
  Cuboid,
  Drill,
  File,
  FileCheck,
  FileText,
  FireExtinguisher,
  Gavel,
  Hammer,
  HardHat,
  House,
  HousePlug,
  Image,
  Info,
  LandPlot,
  Map,
  MapPin,
  Maximize2,
  Megaphone,
  Milestone,
  Move3d,
  PaintBucket,
  PaintRoller,
  Paintbrush,
  Paperclip,
  Pen,
  Pencil,
  PencilRuler,
  Phone,
  Pickaxe,
  Pin,
  Plus,
  Power,
  Radius,
  ReceiptPoundSterling,
  Route,
  Ruler,
  Send,
  ShieldAlert,
  Shovel,
  Sprout,
  SquareMinus,
  SquarePen,
  SquarePlus,
  Stamp,
  TestTube,
  TestTubeDiagonal,
  TreeDeciduous,
  TreePine,
  Trees,
  Wifi,
  Wrench,
  Zap,
  Trash2, 
  Calendar, 
  AlertTriangle,
  Calendar as CalendarIcon,
  Search,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface Task {
  id: string;
  name: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  category?: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  cost?: number;
  staff_ids: number[];
  tags: string[];
  notes?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  project_id: string;
}

interface StaffMember {
  id: number;
  name: string;
  position: string;
}

interface TodoTabProps {
  projectId: string;
}

type ViewType = 'inbox' | 'today' | 'next7days' | 'category';

// Available icons for categories - sorted alphabetically
const CATEGORY_ICONS = [
  { name: 'Anvil', icon: Anvil },
  { name: 'Axe', icon: Axe },
  { name: 'Bell', icon: Bell },
  { name: 'Bolt', icon: Bolt },
  { name: 'BookUser', icon: BookUser },
  { name: 'BrickWall', icon: BrickWall },
  { name: 'Brush', icon: Brush },
  { name: 'Cable', icon: Cable },
  { name: 'Camera', icon: Camera },
  { name: 'Cctv', icon: Cctv },
  { name: 'ChartColumnBig', icon: ChartColumnBig },
  { name: 'CircleCheckBig', icon: CircleCheckBig },
  { name: 'CircleParking', icon: CircleParking },
  { name: 'CirclePoundSterling', icon: CirclePoundSterling },
  { name: 'CirclePower', icon: CirclePower },
  { name: 'Clipboard', icon: Clipboard },
  { name: 'ClipboardCheck', icon: ClipboardCheck },
  { name: 'Cuboid', icon: Cuboid },
  { name: 'Drill', icon: Drill },
  { name: 'File', icon: File },
  { name: 'FileCheck', icon: FileCheck },
  { name: 'FileText', icon: FileText },
  { name: 'FireExtinguisher', icon: FireExtinguisher },
  { name: 'Gavel', icon: Gavel },
  { name: 'Hammer', icon: Hammer },
  { name: 'HardHat', icon: HardHat },
  { name: 'House', icon: House },
  { name: 'HousePlug', icon: HousePlug },
  { name: 'Image', icon: Image },
  { name: 'Info', icon: Info },
  { name: 'LandPlot', icon: LandPlot },
  { name: 'Map', icon: Map },
  { name: 'MapPin', icon: MapPin },
  { name: 'Maximize2', icon: Maximize2 },
  { name: 'Megaphone', icon: Megaphone },
  { name: 'Milestone', icon: Milestone },
  { name: 'Move3d', icon: Move3d },
  { name: 'PaintBucket', icon: PaintBucket },
  { name: 'PaintRoller', icon: PaintRoller },
  { name: 'Paintbrush', icon: Paintbrush },
  { name: 'Paperclip', icon: Paperclip },
  { name: 'Pen', icon: Pen },
  { name: 'Pencil', icon: Pencil },
  { name: 'PencilRuler', icon: PencilRuler },
  { name: 'Phone', icon: Phone },
  { name: 'Pickaxe', icon: Pickaxe },
  { name: 'Pin', icon: Pin },
  { name: 'Plus', icon: Plus },
  { name: 'Power', icon: Power },
  { name: 'Radius', icon: Radius },
  { name: 'ReceiptPoundSterling', icon: ReceiptPoundSterling },
  { name: 'Route', icon: Route },
  { name: 'Ruler', icon: Ruler },
  { name: 'Send', icon: Send },
  { name: 'ShieldAlert', icon: ShieldAlert },
  { name: 'Shovel', icon: Shovel },
  { name: 'Sprout', icon: Sprout },
  { name: 'SquareMinus', icon: SquareMinus },
  { name: 'SquarePen', icon: SquarePen },
  { name: 'SquarePlus', icon: SquarePlus },
  { name: 'Stamp', icon: Stamp },
  { name: 'TestTube', icon: TestTube },
  { name: 'TestTubeDiagonal', icon: TestTubeDiagonal },
  { name: 'TreeDeciduous', icon: TreeDeciduous },
  { name: 'TreePine', icon: TreePine },
  { name: 'Trees', icon: Trees },
  { name: 'Wifi', icon: Wifi },
  { name: 'Wrench', icon: Wrench },
  { name: 'Zap', icon: Zap }
];

export function TodoTab({ projectId }: TodoTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('inbox');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showDeleteTask, setShowDeleteTask] = useState(false);
  const [showDeleteCategory, setShowDeleteCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Add new state for active tab - only info now (single step)
  const [activeTab, setActiveTab] = useState<'info'>('info');

  // Form states
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    category: '',
    cost: null as number | null,
    staff_ids: [] as number[],
    tags: [] as string[],
    notes: ''
  });

  const [editTask, setEditTask] = useState({
    name: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    category: '',
    cost: null as number | null,
    staff_ids: [] as number[],
    tags: [] as string[],
    notes: ''
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: 'FileText'
  });

  const [editCategory, setEditCategory] = useState({
    name: '',
    icon: 'FileText'
  });

  useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchStaff();
  }, [projectId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showAddTask || showAddCategory || editingTask !== null;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      // Scroll to top of viewport when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddTask, showAddCategory, editingTask]);

  // Handle sidebar scroll to top on mobile when opened
  useEffect(() => {
    if (sidebarOpen) {
      // Scroll to top of viewport when sidebar opens on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [sidebarOpen]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('project_todo')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('project_todo_categories')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, position')
        .order('name', { ascending: true });

      if (error) throw error;

      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('project_todo')
        .insert([
          {
            name: newTask.name,
            description: newTask.description || null,
            priority: newTask.priority,
            due_date: newTask.due_date || null,
            category: newTask.category || null,
            project_id: projectId,
            completed: false,
            cost: newTask.cost,
            staff_ids: newTask.staff_ids.length > 0 ? newTask.staff_ids : [],
            tags: newTask.tags.length > 0 ? newTask.tags : [],
            notes: newTask.notes || null
          }
        ]);

      if (error) throw error;

      setNewTask({
        name: '',
        description: '',
        priority: 'medium',
        due_date: '',
        category: '',
        cost: null,
        staff_ids: [],
        tags: [],
        notes: ''
      });
      setShowAddTask(false);
      setActiveTab('info');
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask) return;

    try {
      const { error } = await supabase
        .from('project_todo')
        .update({
          name: editTask.name,
          description: editTask.description || null,
          priority: editTask.priority,
          due_date: editTask.due_date || null,
          category: editTask.category || null,
          cost: editTask.cost,
          staff_ids: editTask.staff_ids.length > 0 ? editTask.staff_ids : [],
          tags: editTask.tags.length > 0 ? editTask.tags : [],
          notes: editTask.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      // Reset form state
      setEditingTask(null);
      setEditTask({
        name: '',
        description: '',
        priority: 'medium',
        due_date: '',
        category: '',
        cost: null,
        staff_ids: [],
        tags: [],
        notes: ''
      });
      setActiveTab('info');
      
      // Fetch updated tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const startEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTask({
      name: task.name,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date || '',
      category: task.category || '',
      cost: task.cost || null,
      staff_ids: task.staff_ids || [],
      tags: task.tags || [],
      notes: task.notes || ''
    });
    setActiveTab('info');
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    try {
      const { error } = await supabase
        .from('project_todo_categories')
        .insert([{
          name: newCategory.name,
          icon: newCategory.icon,
          project_id: projectId
        }]);

      if (error) throw error;

      setNewCategory({ name: '', icon: 'FileText' });
      setShowAddCategory(false);
      setIconSearch('');
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategory({
      name: category.name,
      icon: category.icon
    });
    setShowEditCategory(true);
  };

  const updateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      const { error } = await supabase
        .from('project_todo_categories')
        .update({
          name: editCategory.name,
          icon: editCategory.icon
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      await fetchCategories();
      setShowEditCategory(false);
      setEditingCategory(null);
      setIconSearch('');
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteTask(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      const { error } = await supabase
        .from('project_todo')
        .delete()
        .eq('id', taskToDelete);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setShowDeleteTask(false);
      setTaskToDelete(null);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setShowDeleteCategory(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      // First update all tasks with this category to have no category
      await supabase
        .from('project_todo')
        .update({ category: null })
        .eq('category', categoryToDelete);

      // Then delete the category
      const { error } = await supabase
        .from('project_todo_categories')
        .delete()
        .eq('id', categoryToDelete);

      if (error) throw error;
      
      await fetchTasks();
      await fetchCategories();
      
      // If we're currently viewing this category, switch to inbox
      if (selectedCategory === categoryToDelete) {
        setCurrentView('inbox');
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setShowDeleteCategory(false);
      setCategoryToDelete(null);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const updateData: any = { 
        completed: !completed,
        updated_at: new Date().toISOString()
      };
      
      if (!completed) {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('project_todo')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getFilteredTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    let filtered = tasks;

    switch (currentView) {
      case 'today':
        filtered = tasks.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });
        break;
      case 'next7days':
        filtered = tasks.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return dueDate >= today && dueDate <= next7Days;
        });
        break;
      case 'category':
        if (selectedCategory) {
          filtered = tasks.filter(task => task.category === selectedCategory);
        }
        break;
      default: // inbox
        filtered = tasks;
    }

    return filtered;
  };

  const incompleteTasks = getFilteredTasks().filter(task => !task.completed);
  const completedTasks = getFilteredTasks().filter(task => task.completed);

  // Helper functions for task counts
  const getTodayTaskCount = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return tasks.filter(task => {
      if (!task.due_date || task.completed) return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;
  };

  const getNext7DaysTaskCount = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);
    return tasks.filter(task => {
      if (!task.due_date || task.completed) return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= today && dueDate <= next7Days;
    }).length;
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'today': return 'Today';
      case 'next7days': return 'Next 7 Days';
      case 'category': 
        const category = categories.find(c => c.id === selectedCategory);
        return category ? category.name : 'Category';
      default: return 'Main Tasks';
    }
  };

  const getCategoryIcon = (iconName: string) => {
    const iconData = CATEGORY_ICONS.find(icon => icon.name === iconName);
    return iconData ? iconData.icon : Anvil;
  };

  const getFilteredIcons = () => {
    if (!iconSearch.trim()) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(iconData =>
      iconData.name.toLowerCase().includes(iconSearch.toLowerCase())
    );
  };

  const Sidebar = () => (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-gray-50 dark:bg-gray-800 transform transition-transform duration-300 ease-in-out
      lg:translate-x-0 lg:static lg:inset-0 lg:z-0
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      flex flex-col rounded-l-lg lg:rounded-l-lg
      lg:h-auto h-screen
    `}>
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <div className="p-4">
        <nav className="space-y-1">
          <button
            onClick={() => {
              setCurrentView('inbox');
              setSelectedCategory(null);
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              currentView === 'inbox'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FileText className="mr-3 h-5 w-5" />
            Main Tasks
            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
              {tasks.filter(t => !t.completed).length}
            </span>
          </button>

          <button
            onClick={() => {
              setCurrentView('today');
              setSelectedCategory(null);
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              currentView === 'today'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <CalendarIcon className="mr-3 h-5 w-5" />
            Today
            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
              {getTodayTaskCount()}
            </span>
          </button>

          <button
            onClick={() => {
              setCurrentView('next7days');
              setSelectedCategory(null);
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              currentView === 'next7days'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="mr-3 h-5 w-5" />
            Next 7 Days
            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
              {getNext7DaysTaskCount()}
            </span>
          </button>
        </nav>
      </div>

      {/* Categories */}
      <div className="flex-1 px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Categories</h3>
          <button
            onClick={() => setShowAddCategory(true)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1">
          {categories.map((category) => {
            const IconComponent = getCategoryIcon(category.icon);
            return (
              <div
                key={category.id}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-md group ${
                  currentView === 'category' && selectedCategory === category.id
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <button
                  onClick={() => {
                    setCurrentView('category');
                    setSelectedCategory(category.id);
                    setSidebarOpen(false);
                  }}
                  className="flex-1 flex items-center min-w-0"
                >
                  <IconComponent className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{category.name}</span>
                </button>
                
                <button
                  onClick={() => startEditCategory(category)}
                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Edit"
                >
                  <Pencil className="h-5 w-5" />
                </button>

                <button
                  onClick={() => deleteCategory(category.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Mobile overlay
  const SidebarOverlay = () => (
    <div
      className={`fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden transition-opacity duration-300 ${
        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={() => setSidebarOpen(false)}
    />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 relative">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">To do</h2>
      <br></br>
      <div className="flex mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Sidebar Overlay */}
        <SidebarOverlay />
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-r-lg lg:rounded-r-lg min-w-0">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FileText className="h-6 w-6" />
              </button>
              
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {getViewTitle()}
              </h1>
              
              {/* Add task button - mobile */}
              <button
                onClick={() => setShowAddTask(true)}
                className="lg:hidden text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {/* Incomplete tasks */}
            <div className="space-y-2">
              {incompleteTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-3 py-3 sm:py-2 group hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md px-2 -mx-2"
                >
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 transition-colors"
                  >
                  </button>
                  
                  <span className="flex-1 text-gray-900 dark:text-white text-sm sm:text-sm min-w-0 break-words">
                    {task.name}
                  </span>

                  <button
                    onClick={() => startEditTask(task)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Edit"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add task button - desktop */}
            <button
              onClick={() => setShowAddTask(true)}
              className="hidden lg:flex items-center space-x-2 py-2 px-2 -mx-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors mt-4"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Add task</span>
            </button>

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-3 sm:py-2 px-2 -mx-2 rounded-md transition-colors w-full"
                >
                  {showCompleted ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm">+ {completedTasks.length} Completed Tasks</span>
                  </div>
                </button>

                {showCompleted && (
                  <div className="space-y-2 mt-2 ml-6">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center space-x-3 py-3 sm:py-2 group hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md px-2 -mx-2 opacity-60"
                      >
                        <button
                          onClick={() => toggleTask(task.id, task.completed)}
                          className="flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                        >
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        <span className="flex-1 text-gray-500 dark:text-gray-400 text-sm line-through min-w-0 break-words">
                          {task.name}
                        </span>

                        <button
                          onClick={() => startEditTask(task)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {incompleteTasks.length === 0 && completedTasks.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <FileText className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No tasks yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Get started by adding your first task.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile floating add button */}
      <button
        onClick={() => setShowAddTask(true)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add Task Modal */}
      {showAddTask && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New Task</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTask(false);
                    setActiveTab('info');
                    setNewTask({
                      name: '',
                      description: '',
                      priority: 'medium',
                      due_date: '',
                      category: '',
                      cost: null,
                      staff_ids: [],
                      tags: [],
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Step Indicator - Single step now */}
              <div className="mb-8 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-medium text-indigo-600">
                    Task Details
                  </div>
                  <div className="text-sm text-gray-500">
                    Step 1 of 1
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Form Content - Single form for all fields */}
              <form onSubmit={addTask}>
                <div className="max-h-[500px] overflow-y-auto pr-4">
                  <div className="grid grid-cols-2 gap-4 singlerow">
                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Task Name *
                      </label>
                      <input
                        type="text"
                        value={newTask.name}
                        onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        required
                      />
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 singlerow">
                      <div className="fullw">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Priority
                        </label>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div className="fullw">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category
                        </label>
                        <select
                          value={newTask.category}
                          onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        >
                          <option value="">No Category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                      />
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Assigned Staff
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 dark:bg-gray-700 dark:border-gray-600">
                        {staff.map((member) => (
                          <label
                            key={member.id}
                            className="relative flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer group"
                          >
                            <div className="flex items-center h-5">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={newTask.staff_ids.includes(member.id)}
                                  onChange={(e) => {
                                    const newStaffIds = e.target.checked
                                      ? [...newTask.staff_ids, member.id]
                                      : newTask.staff_ids.filter((id) => id !== member.id);
                                    setNewTask({ ...newTask, staff_ids: newStaffIds });
                                  }}
                                  className="peer appearance-none h-5 w-5 border border-gray-300 rounded-md transition-all duration-200 ease-in-out cursor-pointer checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                                />
                                <svg
                                  className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-white peer-checked:opacity-100 opacity-0 transition-opacity duration-200"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M13.3334 4L6.00008 11.3333L2.66675 8"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <div className="ml-3 flex items-center">
                                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                                  {member.name}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {member.position}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cost
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newTask.cost || ''}
                        onChange={(e) => setNewTask({ ...newTask, cost: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        placeholder="Enter cost..."
                      />
                    </div>

                    <div className="col-span-2 fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tags
                      </label>
                      <p>Type your tag and press enter.</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {newTask.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = [...newTask.tags];
                                newTags.splice(index, 1);
                                setNewTask({ ...newTask, tags: newTags });
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a tag"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              const value = input.value.trim();
                              if (value && !newTask.tags.includes(value)) {
                                setNewTask({ ...newTask, tags: [...newTask.tags, value] });
                                input.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Notes field moved to bottom of Step 1 */}
                    <div className="col-span-2 fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={newTask.notes}
                        onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        rows={4}
                        placeholder="Add any additional notes..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTask(false);
                      setActiveTab('info');
                      setNewTask({
                        name: '',
                        description: '',
                        priority: 'medium',
                        due_date: '',
                        category: '',
                        cost: null,
                        staff_ids: [],
                        tags: [],
                        notes: ''
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 w-full sm:w-auto"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Task Modal */}
      {editingTask && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Task</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setActiveTab('info');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="mb-8 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-medium text-indigo-600">
                    Task Details
                  </div>
                  <div className="text-sm text-gray-500">
                    Step 1 of 1
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={updateTask}>
                {/* Tab Content */}
                <div className="max-h-[500px] overflow-y-auto pr-4">
                  <div className="grid grid-cols-2 gap-4 singlerow">
                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Task Name *
                      </label>
                      <input
                        type="text"
                        value={editTask.name}
                        onChange={(e) => setEditTask({ ...editTask, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        required
                      />
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editTask.description}
                        onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 singlerow">
                      <div className="fullw">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Priority
                        </label>
                        <select
                          value={editTask.priority}
                          onChange={(e) => setEditTask({ ...editTask, priority: e.target.value as Task['priority'] })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div className="fullw">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category
                        </label>
                        <select
                          value={editTask.category}
                          onChange={(e) => setEditTask({ ...editTask, category: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        >
                          <option value="">No Category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={editTask.due_date}
                        onChange={(e) => setEditTask({ ...editTask, due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                      />
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Assigned Staff
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 dark:bg-gray-700 dark:border-gray-600">
                        {staff.map((member) => (
                          <label
                            key={member.id}
                            className="relative flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer group"
                          >
                            <div className="flex items-center h-5">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={editTask.staff_ids.includes(member.id)}
                                  onChange={(e) => {
                                    const newStaffIds = e.target.checked
                                      ? [...editTask.staff_ids, member.id]
                                      : editTask.staff_ids.filter((id) => id !== member.id);
                                    setEditTask({ ...editTask, staff_ids: newStaffIds });
                                  }}
                                  className="peer appearance-none h-5 w-5 border border-gray-300 rounded-md transition-all duration-200 ease-in-out cursor-pointer checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                                />
                                <svg
                                  className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-white peer-checked:opacity-100 opacity-0 transition-opacity duration-200"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M13.3334 4L6.00008 11.3333L2.66675 8"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <div className="ml-3 flex items-center">
                                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                                  {member.name}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {member.position}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cost
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editTask.cost || ''}
                        onChange={(e) => setEditTask({ ...editTask, cost: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        placeholder="Enter cost..."
                      />
                    </div>

                    <div className="col-span-2 fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editTask.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = [...editTask.tags];
                                newTags.splice(index, 1);
                                setEditTask({ ...editTask, tags: newTags });
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a tag"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              const value = input.value.trim();
                              if (value && !editTask.tags.includes(value)) {
                                setEditTask({ ...editTask, tags: [...editTask.tags, value] });
                                input.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Notes field moved to bottom of Edit Task form */}
                    <div className="col-span-2 fullw">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={editTask.notes}
                        onChange={(e) => setEditTask({ ...editTask, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                        rows={4}
                        placeholder="Add any additional notes..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      setActiveTab('info');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 w-full sm:w-auto"
                  >
                    Update Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Task Modal */}
      {showDeleteTask && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Delete Task
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowDeleteTask(false);
                  setTaskToDelete(null);
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 touch-manipulation"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Category Modal */}
      {showAddCategory && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New Category</h3>
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setIconSearch('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={addCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Icon
                  </label>
                  
                  {/* Icon Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search icons..."
                      value={iconSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIconSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                    />
                  </div>

                  {/* Icon Grid */}
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-48 sm:max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
                    {getFilteredIcons().map((iconData) => {
                      const IconComponent = iconData.icon;
                      return (
                        <button
                          key={iconData.name}
                          type="button"
                          onClick={() => setNewCategory({ ...newCategory, icon: iconData.name })}
                          className={`p-2 sm:p-2 rounded-md border-2 transition-colors ${
                            newCategory.icon === iconData.name
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                          title={iconData.name}
                        >
                          <IconComponent className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        </button>
                      );
                    })}
                  </div>
                  
                  {getFilteredIcons().length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No icons found matching "{iconSearch}"
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selected: {newCategory.icon}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false);
                      setIconSearch('');
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 order-1 sm:order-2"
                  >
                    Add Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Category Modal */}
      {showEditCategory && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Category</h3>
                <button
                  onClick={() => {
                    setShowEditCategory(false);
                    setEditingCategory(null);
                    setIconSearch('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={updateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={editCategory.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCategory({ ...editCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Icon
                  </label>
                  
                  {/* Icon Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search icons..."
                      value={iconSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIconSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                    />
                  </div>

                  {/* Icon Grid */}
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-48 sm:max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
                    {getFilteredIcons().map((iconData) => {
                      const IconComponent = iconData.icon;
                      return (
                        <button
                          key={iconData.name}
                          type="button"
                          onClick={() => setEditCategory({ ...editCategory, icon: iconData.name })}
                          className={`p-2 sm:p-2 rounded-md border-2 transition-colors ${
                            editCategory.icon === iconData.name
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                          title={iconData.name}
                        >
                          <IconComponent className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        </button>
                      );
                    })}
                  </div>
                  
                  {getFilteredIcons().length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No icons found matching "{iconSearch}"
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selected: {editCategory.icon}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCategory(false);
                      setEditingCategory(null);
                      setIconSearch('');
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 order-1 sm:order-2"
                  >
                    Update Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Category Modal */}
      {showDeleteCategory && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Delete Category
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete this category? All tasks in this category will be moved to "No Category". This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowDeleteCategory(false);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 touch-manipulation"
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
