import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { sendTaskAssignmentEmail } from '../../utils/emailNotifications';

/**
 * Tasks component props interface
 */
interface TasksProps {
  setShowTasks: (show: boolean) => void;
  setShowAdminDashboard: (show: boolean) => void;
}

// Task interface
interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'to_schedule' | 'booked_in' | 'over_due' | 'in_progress' | 'purchased' | 'completed';
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
  category: 'Quote' | 'Repair' | 'Aftersales' | 'Complaints' | 'Remedials' | 'Finance' | 'Insurance' | 'Tax' | 'Banking' | null;
}

// Board interface
interface Board {
  id: number;
  name: string;
  description: string | null;
  border_color: string | null;
  sort_order: number;
}

// Staff member interface
interface StaffMember {
  id: number;
  name: string;
  email: string;
  position: string;
}

// Task form data interface
interface TaskFormData {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  project_id: string | null;
  board_id: number | null;
  notes: string;
  tags: string[];
  staff_ids: number[];
  due_date: string;
  cost: number | null;
  category: Task['category'];
}

/**
 * Tasks component for the admin dashboard
 */
const Tasks = ({
  setShowTasks,
  setShowAdminDashboard,
}: TasksProps) => {
  // State variables
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'to_schedule',
    priority: 'medium',
    project_id: null,
    board_id: null,
    notes: '',
    tags: [],
    staff_ids: [],
    due_date: '',
    cost: null,
    category: null,
  });
  
  // Fetch tasks from the database
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Fetch boards from the database
  const fetchBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  // Fetch staff members from the database
  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle staff selection
  const handleStaffSelection = (staffId: number) => {
    setTaskFormData(prev => {
      const staffIds = [...prev.staff_ids];
      const index = staffIds.indexOf(staffId);
      
      if (index === -1) {
        staffIds.push(staffId);
      } else {
        staffIds.splice(index, 1);
      }
      
      return {
        ...prev,
        staff_ids: staffIds
      };
    });
  };

  // Create or update a task
  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const isNewTask = !editingTask;
      
      // Store original staff_ids if editing a task (for comparison later)
      const originalStaffIds = editingTask ? [...editingTask.staff_ids] : [];
      
      // Prepare task data
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description || null,
        status: taskFormData.status,
        priority: taskFormData.priority,
        project_id: taskFormData.project_id,
        board_id: taskFormData.board_id,
        notes: taskFormData.notes || null,
        tags: taskFormData.tags,
        staff_ids: taskFormData.staff_ids,
        due_date: taskFormData.due_date || null,
        cost: taskFormData.cost || null,
        category: taskFormData.category,
      };

      // Update or create task
      if (isNewTask) {
        // Create new task
        const { data, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select()
          .single();
        
        if (error) throw error;
        const updatedTaskData = data;
      } else {
        // Update existing task
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id)
          .select()
          .single();
        
        if (error) throw error;
        const updatedTaskData = data;

        // Check if we need to send email notifications
        if (updatedTaskData) {
          // Helper function to check if arrays are equal
          const arraysEqual = (a: number[], b: number[]) => {
            if (a.length !== b.length) return false;
            return a.every((val, index) => val === b[index]);
          };
          
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

        // Reset form and close modal
        setShowTaskModal(false);
        setEditingTask(null);
        setTaskFormData({
          title: '',
          description: '',
          status: 'to_schedule',
          priority: 'medium',
          project_id: null,
          board_id: null,
          notes: '',
          tags: [],
          staff_ids: [],
          due_date: '',
          cost: null,
          category: null,
        });
        
        // Refresh tasks
        fetchTasks();
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  // Open task modal for editing
  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      project_id: task.project_id,
      board_id: task.board_id,
      notes: task.notes || '',
      tags: task.tags || [],
      staff_ids: task.staff_ids || [],
      due_date: task.due_date || '',
      cost: task.cost || null,
      category: task.category,
    });
    setShowTaskModal(true);
  };

  // Delete a task
  const deleteTask = async (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);
        
        if (error) throw error;
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };
  
  // Back to dashboard
  const handleBack = () => {
    setShowTasks(false);
    setShowAdminDashboard(true);
  };

  // Send test email
  const sendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress) return;
    
    setTestEmailStatus('sending');
    
    try {
      // Create a test task
      const testTask = {
        id: 0,
        title: 'Test Email Task',
        description: 'This is a test email to verify SendGrid is working correctly.',
        status: 'to_schedule' as const,
        priority: 'medium' as const,
        project_id: null,
        board_id: 1,
        notes: 'This is a test email sent from the Tasks component.',
        tags: ['test'],
        staff_ids: [],
        due_date: new Date().toISOString().split('T')[0],
        cost: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: null
      };
      
      // Send the test email directly to the provided email address
      const response = await fetch('/.netlify/functions/send-notification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: testEmailAddress,
          subject: 'SendGrid Test Email',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">SendGrid Test Email</h2>
              <p>This is a test email to verify that SendGrid is working correctly.</p>
              
              <div style="background-color: #f9fafb; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Test Task</h3>
                <p><strong>Priority:</strong> ${testTask.priority.toUpperCase()}</p>
                <p><strong>Status:</strong> ${testTask.status.replace('_', ' ')}</p>
                <p><strong>Due Date:</strong> ${testTask.due_date}</p>
                <p><strong>Description:</strong> ${testTask.description}</p>
              </div>
              
              <p>If you received this email, your SendGrid configuration is working correctly.</p>
              <p>This is an automated test email. Please do not reply.</p>
            </div>
          `,
          fromEmail: 'support@stonepad.co.uk'
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send test email:', errorText);
        throw new Error(`Failed to send test email: ${errorText}`);
      }
      
      setTestEmailStatus('success');
      setTimeout(() => {
        setShowTestEmailModal(false);
        setTestEmailStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestEmailStatus('error');
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchTasks();
    fetchBoards();
    fetchStaff();
  }, []);

  // Return JSX
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Management</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowTaskModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create New Task
          </button>
          <button 
            onClick={() => setShowTestEmailModal(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Test SendGrid
          </button>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks found. Create a new task to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'over_due' ? 'bg-red-100 text-red-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {task.staff_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.staff_ids.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <span key={staffId} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {staffMember.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => openEditTaskModal(task)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SendGrid Test Email Modal */}
      {showTestEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Test SendGrid Email</h2>
            <form onSubmit={sendTestEmail}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTestEmailModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  disabled={testEmailStatus === 'sending'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded text-white ${
                    testEmailStatus === 'sending' ? 'bg-gray-400 cursor-not-allowed' :
                    testEmailStatus === 'success' ? 'bg-green-500 hover:bg-green-600' :
                    testEmailStatus === 'error' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-purple-500 hover:bg-purple-600'
                  }`}
                  disabled={testEmailStatus === 'sending'}
                >
                  {testEmailStatus === 'idle' && 'Send Test Email'}
                  {testEmailStatus === 'sending' && 'Sending...'}
                  {testEmailStatus === 'success' && 'Email Sent!'}
                  {testEmailStatus === 'error' && 'Failed - Try Again'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
            <form onSubmit={saveTask}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={taskFormData.title}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={taskFormData.description}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={taskFormData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="to_schedule">To Schedule</option>
                    <option value="booked_in">Booked In</option>
                    <option value="in_progress">In Progress</option>
                    <option value="over_due">Over Due</option>
                    <option value="purchased">Purchased</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    name="priority"
                    value={taskFormData.priority}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
                  <select
                    name="board_id"
                    value={taskFormData.board_id || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a board</option>
                    {boards.map(board => (
                      <option key={board.id} value={board.id}>{board.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={taskFormData.due_date}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <input
                    type="number"
                    name="cost"
                    value={taskFormData.cost || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={taskFormData.category || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a category</option>
                    <option value="Quote">Quote</option>
                    <option value="Repair">Repair</option>
                    <option value="Aftersales">Aftersales</option>
                    <option value="Complaints">Complaints</option>
                    <option value="Remedials">Remedials</option>
                    <option value="Finance">Finance</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Tax">Tax</option>
                    <option value="Banking">Banking</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Staff</label>
                  <div className="border rounded p-2 max-h-40 overflow-y-auto">
                    {staff.map(staffMember => (
                      <div key={staffMember.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          id={`staff-${staffMember.id}`}
                          checked={taskFormData.staff_ids.includes(staffMember.id)}
                          onChange={() => handleStaffSelection(staffMember.id)}
                          className="mr-2"
                        />
                        <label htmlFor={`staff-${staffMember.id}`}>{staffMember.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={taskFormData.notes}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { Tasks };

