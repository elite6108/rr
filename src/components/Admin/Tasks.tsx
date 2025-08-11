import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
  FileText,
  Pencil,
  Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { sendTaskAssignmentEmail } from '../../utils/emailNotifications';

interface TasksProps {
  setShowTasks: (show: boolean) => void;
  setShowAdminDashboard: (show: boolean) => void;
}

interface Board {
  id: number;
  name: string;
  description: string | null;
  border_color: string | null;
  sort_order: number;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status:
    | 'to_schedule'
    | 'booked_in'
    | 'over_due'
    | 'in_progress'
    | 'purchased'
    | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  project_id: string | null;
  board_id: number;
  notes: string | null;
  tags: string[];
  staff_ids: number[];
  due_date: string | null;
  cost: number | null;
  created_at: string;
  updated_at: string;
  category:
    | 'Quote'
    | 'Repair'
    | 'Aftersales'
    | 'Complaints'
    | 'Remedials'
    | 'Finance'
    | 'Insurance'
    | 'Tax'
    | 'Banking'
    | null;
  attachments?: TaskAttachment[];
}

interface Project {
  id: string;
  name: string;
}

interface StaffMember {
  id: number;
  name: string;
  position: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface CombinedStaffUser {
  id: string;
  name: string;
  type: 'staff' | 'user';
  original_id: string | number;
  email: string;
  position?: string;
  phone?: string;
  ni_number?: string;
  start_date?: string;
  token?: string;
}

interface TaskAttachment {
  id: number;
  task_id: number;
  file_name: string;
  file_type: string;
  display_name: string;
  file_url?: string;
  created_at?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  status:
    | 'to_schedule'
    | 'booked_in'
    | 'over_due'
    | 'in_progress'
    | 'purchased'
    | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  project_id: string | null;
  board_id: number | null;
  notes: string;
  tags: string[];
  staff_ids: number[];
  attachments: File[];
  existing_attachments: TaskAttachment[];
  due_date: string;
  cost: number | null;
  category:
    | 'Quote'
    | 'Repair'
    | 'Aftersales'
    | 'Complaints'
    | 'Remedials'
    | 'Finance'
    | 'Insurance'
    | 'Tax'
    | 'Banking'
    | null;
}

// Rest of the component code...

const Tasks: React.FC<TasksProps> = ({
  setShowTasks,
  setShowAdminDashboard,
}) => {
  // State variables
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [combinedStaffUsers, setCombinedStaffUsers] = useState<CombinedStaffUser[]>([]);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedBoards, setExpandedBoards] = useState<Set<number>>(new Set());
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [boardFormData, setBoardFormData] = useState({
    name: '',
    description: '',
    border_color: '#3b82f6',
  });
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'to_schedule',
    priority: 'low',
    project_id: null,
    board_id: null,
    notes: '',
    tags: [],
    staff_ids: [],
    attachments: [],
    existing_attachments: [],
    due_date: '',
    cost: null,
    category: null,
  });
  const [newTag, setNewTag] = useState('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverBoard, setDragOverBoard] = useState<number | null>(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<TaskAttachment | null>(null);

  // Functions for handling various operations
  // ...

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;

    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardToDelete.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setBoardToDelete(null);
      fetchBoards();
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  const toggleBoardExpansion = (boardId: number) => {
    setExpandedBoards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(boardId)) {
        newSet.delete(boardId);
      } else {
        newSet.add(boardId);
      }
      return newSet;
    });
  };

  // Helper function to compare arrays
  const arraysEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  // Helper function to get a signed URL for a file
  const getSignedFileUrl = async (fileName: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(fileName, 60 * 60); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in getSignedFileUrl:', error);
      return null;
    }
  };

  // Function to handle task submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Store original staff_ids if editing a task (for comparison later)
      const originalStaffIds = editingTask ? [...editingTask.staff_ids] : [];

      // Handle file uploads first
      const uploadedFiles = await Promise.all(
        taskFormData.attachments.map(async (file: File) => {
          const fileName = `${Date.now()}-${file.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Generate a signed URL for immediate UI display
          const signedUrl = await getSignedFileUrl(fileName);

          return {
            file_name: fileName,
            file_type: file.type,
            display_name: file.name,
          };
        })
      );

      // Prepare task data
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description || null,
        status: taskFormData.status,
        priority: taskFormData.priority,
        project_id: taskFormData.project_id,
        board_id: taskFormData.board_id || selectedBoard?.id,
        notes: taskFormData.notes || null,
        tags: taskFormData.tags,
        staff_ids: taskFormData.staff_ids,
        due_date: taskFormData.due_date || null,
        cost: taskFormData.cost || null,
        category: taskFormData.category,
      };

      // Variable to store the task ID and task data
      let taskId: number;
      let updatedTaskData: Task | null = null;
      
      // Update or create task
      if (editingTask) {
        // Update existing task
        const { error: taskError } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (taskError) throw taskError;
        
        // Use the existing task ID
        taskId = editingTask.id;

        // Handle removed attachments
        const removedAttachments = editingTask.attachments
          ? editingTask.attachments.filter(
              (oldAttachment) =>
                !taskFormData.existing_attachments.some(
                  (a) => a.id === oldAttachment.id
                )
            )
          : [];

        if (removedAttachments.length > 0) {
          // First delete files from storage
          for (const attachment of removedAttachments) {
            const { error: storageError } = await supabase.storage
              .from('task-attachments')
              .remove([attachment.file_name]);

            if (storageError) {
              console.error('Error deleting file from storage:', storageError);
              // Continue with other deletions even if one fails
            }
          }

          // Then delete attachment records from database
          const { error: deleteError } = await supabase
            .from('task_attachments')
            .delete()
            .in(
              'id',
              removedAttachments.map((a) => a.id)
            );

          if (deleteError) throw deleteError;
        }

        // Add new attachments
        if (uploadedFiles.length > 0) {
          const { error: attachmentError } = await supabase
            .from('task_attachments')
            .insert(
              uploadedFiles.map((file) => ({
                task_id: taskId,
                file_name: file.file_name,
                file_type: file.file_type,
                display_name: file.display_name,
                // Don't store the signed URL in the database
                file_url: '', 
              }))
            );

          if (attachmentError) throw attachmentError;
        }
      } else {
        // Create new task
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert([taskData])
          .select()
          .single();

        if (taskError) throw taskError;
        
        if (!newTask) {
          console.error('Failed to create new task');
          return;
        }
        
        // Use the new task ID
        taskId = newTask.id;

        // Add attachments to new task
        if (uploadedFiles.length > 0) {
          const { error: attachmentError } = await supabase
            .from('task_attachments')
            .insert(
              uploadedFiles.map((file) => ({
                task_id: taskId,
                file_name: file.file_name,
                file_type: file.file_type,
                display_name: file.display_name,
                // Don't store the signed URL in the database
                file_url: '',
              }))
            );

          if (attachmentError) throw attachmentError;
        }
      }
      
      // Fetch the complete task data
      const { data: fetchedTaskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
        
      if (fetchedTaskData) {
        updatedTaskData = fetchedTaskData as Task;
        
        // Check if this is a new task or if staff assignments have changed
        const isNewTask = !editingTask;
        const staffAssignmentsChanged = !arraysEqual(originalStaffIds, taskFormData.staff_ids);
        
        // Send email notifications if it's a new task or staff assignments changed
        if ((isNewTask || staffAssignmentsChanged) && taskFormData.staff_ids.length > 0) {
          try {
            await sendTaskAssignmentEmail(updatedTaskData, taskFormData.staff_ids);
            console.log('Task assignment emails sent successfully');
          } catch (emailError) {
            console.error('Error sending task assignment emails:', emailError);
            // Continue with the task creation/update even if email sending fails
          }
        }
      }

      setShowTaskModal(false);
      setEditingTask(null);
      setTaskFormData({
        title: '',
        description: '',
        status: 'to_schedule',
        priority: 'low',
        project_id: null,
        board_id: null,
        notes: '',
        tags: [],
        staff_ids: [],
        attachments: [],
        existing_attachments: [],
        due_date: '',
        cost: null,
        category: null,
      });
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  // Rest of the component code...
  
  // Return JSX
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default Tasks;
