import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, MessageSquare, Edit, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Lead, LeadStatus } from './LeadManagement';

interface Activity {
  id: string;
  activity_type: 'email_sent' | 'phone_call' | 'note_added' | 'status_changed';
  description: string;
  created_at: string;
  created_by_name: string;
  metadata?: any;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  created_by_name: string;
}

interface LeadFormProps {
  onClose: () => void;
  onSuccess: () => void;
  leadToEdit?: Lead | null;
  initialStep?: number;
}

export function LeadForm({ onClose, onSuccess, leadToEdit, initialStep = 1 }: LeadFormProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({
    name: leadToEdit?.name || '',
    email: leadToEdit?.email || '',
    phone: leadToEdit?.phone || '',
    company: leadToEdit?.company || '',
    source: leadToEdit?.source || '',
    message: leadToEdit?.message || '',
    budget: leadToEdit?.budget || '',
    status: leadToEdit?.status || 'new' as LeadStatus,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newActivity, setNewActivity] = useState({
    type: 'email_sent' as Activity['activity_type'],
    description: ''
  });
  const [newNote, setNewNote] = useState('');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    if (leadToEdit && leadToEdit.id) {
      fetchActivities();
      fetchNotes();
    }
  }, [leadToEdit]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get display name from user metadata or use email
        const displayName = user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'Unknown User';
        
        setCurrentUser({
          name: displayName,
          email: user.email || ''
        });
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
      setCurrentUser({ name: 'Unknown User', email: '' });
    }
  };

  const fetchActivities = async () => {
    if (!leadToEdit?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadToEdit.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchNotes = async () => {
    if (!leadToEdit?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadToEdit.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) {
      nextStep();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (leadToEdit) {
        const { error } = await supabase
          .from('leads')
          .update(formData)
          .eq('id', leadToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leads').insert([formData]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addActivity = async () => {
    if (!leadToEdit?.id || !newActivity.description.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadToEdit.id,
          activity_type: newActivity.type,
          description: newActivity.description,
          created_by_name: currentUser?.name || 'Unknown User'
        }]);

      if (error) throw error;
      
      setNewActivity({ type: 'email_sent', description: '' });
      fetchActivities();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add activity');
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('lead_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      fetchActivities();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity');
    }
  };

  const addNote = async () => {
    if (!leadToEdit?.id || !newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_notes')
        .insert([{
          lead_id: leadToEdit.id,
          content: newNote,
          created_by_name: currentUser?.name || 'Unknown User'
        }]);

      if (error) throw error;
      
      setNewNote('');
      fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('lead_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const getActivityIcon = (type: Activity['activity_type']) => {
    switch (type) {
      case 'email_sent': return <Mail className="h-4 w-4" />;
      case 'phone_call': return <Phone className="h-4 w-4" />;
      case 'note_added': return <MessageSquare className="h-4 w-4" />;
      case 'status_changed': return <Edit className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getActivityLabel = (type: Activity['activity_type']) => {
    switch (type) {
      case 'email_sent': return 'Email Sent';
      case 'phone_call': return 'Phone Call';
      case 'note_added': return 'Note Added';
      case 'status_changed': return 'Status Changed';
      default: return 'Activity';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStepIndicator = () => {
    const stepLabels = ['Lead Details', 'Activity', 'Notes'];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600 dark:text-indigo-400">
            {stepLabels[currentStep - 1]}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep} of 3
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const renderStepNavigation = () => (
    <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 pt-4 border-gray-200 dark:border-gray-600">
      <button
        type="button"
        onClick={onClose}
        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Cancel
      </button>
      <div className="flex flex-col sm:flex-row gap-3">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Previous
          </button>
        )}
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading
              ? 'Saving...'
              : leadToEdit
              ? 'Update Lead'
              : 'Create Lead'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {leadToEdit ? 'Edit Lead' : 'Add New Lead'}
          </h3>
          <button
            onClick={() => {
              onClose();
              setCurrentStep(1);
            }}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Lead Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

              <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Company *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="new">New</option>
                    <option value="cold">Cold</option>
                    <option value="hot">Quote Sent</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lead Value
                </label>
                <input
                  type="text"
                    id="budget"
                    name="budget"
                    value={formData.budget}
                  onChange={handleChange}
                    placeholder="e.g., £10,000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                </div>
              </div>

              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Source *
                </label>
                <select
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a source...</option>
                  <option value="Website">Website</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Google">Google</option>
                  <option value="Referral">Referral</option>
                  <option value="Phone">Phone</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Initial message or description from the lead"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Step 2: Activity */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {leadToEdit ? (
                <>
                  {/* Add New Activity */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Add New Activity</h4>
                    <div className="space-y-3">
                <div>
                        <label htmlFor="activityType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Activity Type
                  </label>
                  <select
                          id="activityType"
                          value={newActivity.type}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewActivity(prev => ({ ...prev, type: e.target.value as Activity['activity_type'] }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="email_sent">Email Sent</option>
                          <option value="phone_call">Phone Call</option>
                          <option value="note_added">Note Added</option>
                          <option value="status_changed">Status Changed</option>
                  </select>
                      </div>
                      <div>
                        <label htmlFor="activityDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Description
                        </label>
                        <textarea
                          id="activityDescription"
                          value={newActivity.description}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                          placeholder="Describe the activity..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addActivity}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Activity
                      </button>
                    </div>
                  </div>

                  {/* Activity History */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Recent Activities</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {activities.length > 0 ? (
                        activities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div className="flex-shrink-0 mt-0.5">
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {getActivityLabel(activity.activity_type)}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(activity.created_at)}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => deleteActivity(activity.id)}
                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    title="Delete Activity"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {activity.description}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                by {activity.created_by_name}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No activities recorded yet.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Activities will be available after creating the lead.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Notes */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {leadToEdit ? (
                <>
                  {/* Add New Note */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Add New Note</h4>
                    <div className="space-y-3">
                      <textarea
                        value={newNote}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
                        rows={3}
                        placeholder="Add a note about this lead..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={addNote}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Note
                      </button>
                    </div>
                  </div>

                  {/* Notes History */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Notes</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {notes.length > 0 ? (
                        notes.map((note) => (
                          <div key={note.id} className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(note.created_at)} by {note.created_by_name}
                              </p>
                              <button
                                type="button"
                                onClick={() => deleteNote(note.id)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete Note"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                              {note.content}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No notes added yet.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Notes will be available after creating the lead.</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {renderStepNavigation()}
        </form>
      </div>
    </div>
  );
}
