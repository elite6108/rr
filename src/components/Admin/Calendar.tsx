import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, X, ChevronDown, Calendar as CalendarIcon, MapPin, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  notes?: string;
  calendarId: string;
  assigned_to?: number[];
}

interface CalendarCategory {
  id: string;
  name: string;
  color: string;
}

interface CalendarProps {
  onBack: () => void;
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
}

type ViewType = 'day' | 'week' | 'month' | 'agenda';

// Helper function to generate consistent user ID hash
const getUserIdHash = (userId: string): number => {
  const hash = Math.abs(userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0));
  return -hash; // Return negative to distinguish from staff IDs
};

// Helper function to check if a date is in the past
const isDateInPast = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};

const toLocalISOString = (date: Date) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Format date for iCalendar format (YYYYMMDDTHHMMSSZ)
const formatDateForICS = (date: Date) => {
  const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return utcDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

export function Calendar({ onBack }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isViewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [agendaDays, setAgendaDays] = useState(7);
  const [showDeleteCalendarModal, setShowDeleteCalendarModal] = useState(false);
  const [calendarToDelete, setCalendarToDelete] = useState<CalendarCategory | null>(null);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  
  // Drag and drop state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    start: new Date(),
    end: new Date(),
    allDay: false,
    location: '',
    notes: '',
    calendarId: '',
    assigned_to: []
  });
  const [newCalendar, setNewCalendar] = useState({ name: '', color: 'bg-blue-500' });
  
  // Staff and Users state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [combinedStaffUsers, setCombinedStaffUsers] = useState<CombinedStaffUser[]>([]);

  // Generate iCalendar (.ics) content
  const generateICSContent = (events: CalendarEvent[], calendars: CalendarCategory[]) => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Calendar App//Calendar Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach(event => {
      const calendar = calendars.find(c => c.id === event.calendarId);
      const now = new Date();
      
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@calendar-app.com`,
        `DTSTAMP:${formatDateForICS(now)}`,
        `CREATED:${formatDateForICS(now)}`,
        `LAST-MODIFIED:${formatDateForICS(now)}`,
        `SUMMARY:${event.title.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`,
        event.allDay 
          ? `DTSTART;VALUE=DATE:${event.start.toISOString().split('T')[0].replace(/-/g, '')}`
          : `DTSTART:${formatDateForICS(event.start)}`,
        event.allDay 
          ? `DTEND;VALUE=DATE:${event.end.toISOString().split('T')[0].replace(/-/g, '')}`
          : `DTEND:${formatDateForICS(event.end)}`
      );

      if (event.location) {
        icsContent.push(`LOCATION:${event.location.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`);
      }

      if (event.notes) {
        icsContent.push(`DESCRIPTION:${event.notes.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`);
      }

      if (calendar) {
        icsContent.push(`CATEGORIES:${calendar.name.replace(/,/g, '\\,').replace(/;/g, '\\;')}`);
      }

      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');
    return icsContent.join('\r\n');
  };

  // Download .ics file
  const downloadICSFile = () => {
    const icsContent = generateICSContent(events, calendars);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-events-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load data on component mount
  useEffect(() => {
    loadCalendarCategories();
    loadEvents();
    fetchStaff();
    fetchUsers();
  }, []);

  // Combine staff and users when either list changes
  useEffect(() => {
    if (staff.length > 0 || users.length > 0) {
      combineStaffAndUsers();
    }
  }, [staff, users]);

  // Load calendar categories from Supabase
  const loadCalendarCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const categories: CalendarCategory[] = data.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color
      }));

      setCalendars(categories);
      
      // Set default calendar for new events to first category
      if (categories.length > 0 && !newEvent.calendarId) {
        setNewEvent(prev => ({ ...prev, calendarId: categories[0].id }));
      }
    } catch (error) {
      console.error('Error loading calendar categories:', error);
    }
  };

  // Load events from Supabase
  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calendar')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;

      const eventsData: CalendarEvent[] = data.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_date),
        end: new Date(event.end_date),
        allDay: event.all_day,
        location: event.location || '',
        notes: event.notes || '',
        calendarId: event.calendar_id,
        assigned_to: event.assigned_to || []
      }));

      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save event to Supabase
  const saveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      const { data, error } = await supabase
        .from('calendar')
        .insert([{
          title: eventData.title,
          calendar_id: eventData.calendarId,
          all_day: eventData.allDay,
          start_date: eventData.start?.toISOString(),
          end_date: eventData.end?.toISOString(),
          location: eventData.location || null,
          notes: eventData.notes || null,
          assigned_to: eventData.assigned_to || []
        }])
        .select()
        .single();

      if (error) throw error;

      // Add the new event to local state
      const newEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        start: new Date(data.start_date),
        end: new Date(data.end_date),
        allDay: data.all_day,
        location: data.location || '',
        notes: data.notes || '',
        calendarId: data.calendar_id,
        assigned_to: data.assigned_to || []
      };

      setEvents(prev => [...prev, newEvent]);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  // Update event in Supabase
  const updateEvent = async (eventId: string, eventData: Partial<CalendarEvent>) => {
    try {
      const { data, error } = await supabase
        .from('calendar')
        .update({
          title: eventData.title,
          calendar_id: eventData.calendarId,
          all_day: eventData.allDay,
          start_date: eventData.start?.toISOString(),
          end_date: eventData.end?.toISOString(),
          location: eventData.location || null,
          notes: eventData.notes || null,
          assigned_to: eventData.assigned_to || []
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const updatedEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        start: new Date(data.start_date),
        end: new Date(data.end_date),
        allDay: data.all_day,
        location: data.location || '',
        notes: data.notes || '',
        calendarId: data.calendar_id,
        assigned_to: data.assigned_to || []
      };

      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  // Delete event from Supabase
  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Fetch staff from Supabase
  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, position')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching staff:', error);
      return;
    }

    setStaff(data || []);
  };

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      console.log('Fetching all verified users via Edge Function...');
      
      // Get current session to pass authorization header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('No valid session found');
        setUsers([]);
        return;
      }

      // Call the Edge Function to get all verified users
      const { data, error } = await supabase.functions.invoke('get-all-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        // Fallback to current user only if Edge Function fails
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUsers([{
            id: user.id,
            full_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || 'Current User',
            email: user.email || ''
          }]);
          console.log('Fallback: Using current authenticated user only:', user.email);
        } else {
          setUsers([]);
        }
        return;
      }

      if (data?.users) {
        setUsers(data.users.map((user: any) => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email
        })));
        console.log(`Successfully fetched ${data.users.length} verified users:`, data.users.map((u: any) => u.email));
      } else {
        console.log('No users returned from Edge Function');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to current user only if there's an error
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUsers([{
            id: user.id,
            full_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || 'Current User',
            email: user.email || ''
          }]);
          console.log('Error fallback: Using current authenticated user only:', user.email);
        } else {
          setUsers([]);
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setUsers([]);
      }
    }
  };

  // Combine staff and users
  const combineStaffAndUsers = () => {
    const combined: CombinedStaffUser[] = [
      // Add staff members
      ...staff.map(staffMember => ({
        id: `staff_${staffMember.id}`,
        name: staffMember.name,
        type: 'staff' as const,
        original_id: staffMember.id,
        email: '', // Staff table doesn't have email in this interface
        position: staffMember.position
      })),
      // Add users from profiles, but exclude those who already exist as staff
      ...users.filter(user => !staff.some(staffMember => staffMember.name.toLowerCase().includes(user.full_name.toLowerCase()) || user.full_name.toLowerCase().includes(staffMember.name.toLowerCase())))
        .map(user => ({
          id: `user_${user.id}`,
          name: user.full_name || user.email || 'Unknown User',
          type: 'user' as const,
          original_id: user.id,
          email: user.email
        }))
    ];
    
    console.log('Combined staff and users for calendar:', combined);
    setCombinedStaffUsers(combined);
  };

  // Save calendar category to Supabase
  const saveCalendarCategory = async (categoryData: { name: string; color: string }) => {
    try {
      const { data, error } = await supabase
        .from('calendar_categories')
        .insert([{
          name: categoryData.name,
          color: categoryData.color
        }])
        .select()
        .single();

      if (error) throw error;

      const newCategory: CalendarCategory = {
        id: data.id,
        name: data.name,
        color: data.color
      };

      setCalendars(prev => [...prev, newCategory]);
    } catch (error) {
      console.error('Error saving calendar category:', error);
    }
  };

  // Update calendar category in Supabase
  const updateCalendarCategory = async (categoryId: string, categoryData: { name: string; color: string }) => {
    try {
      const { data, error } = await supabase
        .from('calendar_categories')
        .update({
          name: categoryData.name,
          color: categoryData.color
        })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;

      const updatedCategory: CalendarCategory = {
        id: data.id,
        name: data.name,
        color: data.color
      };

      setCalendars(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
    } catch (error) {
      console.error('Error updating calendar category:', error);
    }
  };

  // Delete calendar category from Supabase
  const deleteCalendarCategory = async (categoryId: string) => {
    try {
      // Check if category has events
      const { data: eventsInCategory } = await supabase
        .from('calendar')
        .select('id')
        .eq('calendar_id', categoryId);

      if (eventsInCategory && eventsInCategory.length > 0) {
        alert('Cannot delete calendar with events. Please delete events first.');
        return;
      }

      const { error } = await supabase
        .from('calendar_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCalendars(prev => prev.filter(c => c.id !== categoryId));
    } catch (error) {
      console.error('Error deleting calendar category:', error);
    }
  };

  useEffect(() => {
    const body = document.body;
    const isModalOpen = showEventDetailModal || showEventForm || showCalendarForm;
    
    if (isModalOpen) {
      body.style.overflow = 'hidden';
      // Scroll to top of viewport when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll when component unmounts
    return () => {
      body.style.overflow = 'unset';
    };
  }, [showEventDetailModal, showEventForm, showCalendarForm]);

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
    'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];

  const eventColorStyles: { [key: string]: { bg: string; border: string; text: string; bgHover: string } } = {
    'bg-blue-500': { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', bgHover: 'hover:bg-blue-100' },
    'bg-green-500': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', bgHover: 'hover:bg-green-100' },
    'bg-purple-500': { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', bgHover: 'hover:bg-purple-100' },
    'bg-red-500': { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', bgHover: 'hover:bg-red-100' },
    'bg-yellow-500': { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-700', bgHover: 'hover:bg-yellow-100' },
    'bg-pink-500': { bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-700', bgHover: 'hover:bg-pink-100' },
    'bg-indigo-500': { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-700', bgHover: 'hover:bg-indigo-100' },
    'bg-teal-500': { bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700', bgHover: 'hover:bg-teal-100' },
    'bg-gray-400': { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', bgHover: 'hover:bg-gray-200' },
  };

  // Get calendar month data for mini-calendar (starting Monday)
  const getMonthDataForMiniCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Get calendar month data for main view (starting Monday)
  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    const dayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks for a complete view
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Get week data (starting Monday for week view)
  const getWeekData = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Check if date is weekend (Saturday or Sunday)
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  // Get time slots for week/day view
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 20; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  // Format time for display
  const formatTime = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  // Get events for a specific date and hour
  const getEventsForDateAndHour = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      const eventHour = eventDate.getHours();
      const eventEndDate = new Date(event.end);
      const eventEndHour = eventEndDate.getHours();
      
      return eventDate.toDateString() === date.toDateString() && 
             (event.allDay || (eventHour <= hour && hour <= eventEndHour));
    });
  };

  // Calculate event height and position
  const getEventStyle = (event: CalendarEvent) => {
    if (event.allDay) {
      return { height: '100%', top: '0' };
    }
    
    const startHour = event.start.getHours();
    const startMinutes = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMinutes = event.end.getMinutes();
    
    const startPercent = (startMinutes / 60) * 100;
    const duration = (endHour - startHour) + ((endMinutes - startMinutes) / 60);
    const heightPercent = duration * 100;
    
    return {
      height: `${Math.max(heightPercent, 25)}%`,
      top: `${startPercent}%`
    };
  };

  // Check if event spans multiple days
  const isMultiDayEvent = (event: CalendarEvent) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    return startDate.toDateString() !== endDate.toDateString();
  };

  // Get the number of days an event spans
  const getEventSpanDays = (event: CalendarEvent, startDate: Date) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Calculate how many days this event spans from the start date
    const daysDiff = Math.ceil((eventEnd.getTime() - Math.max(eventStart.getTime(), startDate.getTime())) / (1000 * 60 * 60 * 24));
    return Math.max(1, daysDiff);
  };

  // Check if this is the first day the event appears
  const isEventStartDate = (event: CalendarEvent, date: Date) => {
    const eventStart = new Date(event.start);
    return eventStart.toDateString() === date.toDateString();
  };

  // Get events that start on a specific date (for multi-day rendering)
  const getEventsStartingOnDate = (date: Date) => {
    return events.filter(event => isEventStartDate(event, date));
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      
      return (eventStart <= dateEnd && eventEnd >= dateStart);
    });
  };

  // Delete functions
  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
    setShowDeleteEventModal(false);
    setEventToDelete(null);
    setShowEventDetailModal(false);
  };

  const handleDeleteEventClick = (event: CalendarEvent) => {
    setEventToDelete(event);
    setShowDeleteEventModal(true);
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    // Don't delete if it's the last calendar
    if (calendars.length <= 1) return;
    await deleteCalendarCategory(calendarId);
    setShowDeleteCalendarModal(false);
    setCalendarToDelete(null);
  };

  const handleDeleteCalendarClick = (calendar: CalendarCategory) => {
    if (calendars.length <= 1) return;
    setCalendarToDelete(calendar);
    setShowDeleteCalendarModal(true);
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', event.id);
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.6';
      e.currentTarget.style.transform = 'scale(0.95)';
    }
  };

  const handleDragEnd = (e: DragEvent) => {
    setDraggedEvent(null);
    setDragOverDate(null);
    
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  const handleDragOver = (e: DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    setDragOverDate(targetDate);
  };

  const handleDragLeave = (e: DragEvent) => {
    // Only clear drag over if we're actually leaving the drop zone
    if (!e.currentTarget!.contains(e.relatedTarget as Node)) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e: DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);

    if (!draggedEvent) return;
    
    // Prevent dropping events on past dates
    if (isDateInPast(targetDate)) {
      return;
    }

    try {
      let newStart: Date;
      let newEnd: Date;

      if (view === 'month' || view === 'agenda') {
        // For month/agenda view: only change the date, keep the same time
        const originalDate = new Date(draggedEvent.start);
        const timeDiff = targetDate.getTime() - new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate()).getTime();
        
        newStart = new Date(draggedEvent.start.getTime() + timeDiff);
        newEnd = new Date(draggedEvent.end.getTime() + timeDiff);
      } else {
        // For week/day view: change both date and time to the dropped time slot
        const eventDuration = draggedEvent.end.getTime() - draggedEvent.start.getTime();
        
        newStart = new Date(targetDate);
        newEnd = new Date(targetDate.getTime() + eventDuration);
      }

      // Update the event with new dates
      await updateEvent(draggedEvent.id, {
        ...draggedEvent,
        start: newStart,
        end: newEnd
      });

      console.log(`Moved event "${draggedEvent.title}" to ${newStart.toLocaleString()}`);
    } catch (error) {
      console.error('Error moving event:', error);
    } finally {
      setDraggedEvent(null);
    }
  };

  // Edit calendar
  const [editingCalendar, setEditingCalendar] = useState<CalendarCategory | null>(null);

  const handleEditCalendar = (calendar: CalendarCategory) => {
    setEditingCalendar(calendar);
    setNewCalendar({ name: calendar.name, color: calendar.color });
    setShowCalendarForm(true);
  };

  const handleUpdateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCalendar) {
      await updateCalendarCategory(editingCalendar.id, newCalendar);
      setEditingCalendar(null);
    } else {
      await saveCalendarCategory(newCalendar);
    }
    
    setShowCalendarForm(false);
    setNewCalendar({ name: '', color: 'bg-blue-500' });
  };

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEvent) {
      const updatedEventData: Partial<CalendarEvent> = {
        title: newEvent.title || '',
        start: newEvent.allDay ? new Date(new Date(newEvent.start!).setHours(7,0,0,0)) : newEvent.start || new Date(),
        end: newEvent.allDay ? new Date(new Date(newEvent.start!).setHours(21,0,0,0)) : newEvent.end || new Date(),
        allDay: newEvent.allDay || false,
        location: newEvent.location || '',
        notes: newEvent.notes || '',
        calendarId: newEvent.calendarId || calendars[0]?.id || '',
        assigned_to: newEvent.assigned_to || []
      };
      await updateEvent(editingEvent.id, updatedEventData);
      setEditingEvent(null);
    } else {
      const eventData: Partial<CalendarEvent> = {
        title: newEvent.title || '',
        start: newEvent.allDay ? new Date(new Date(newEvent.start!).setHours(7,0,0,0)) : newEvent.start || new Date(),
        end: newEvent.allDay ? new Date(new Date(newEvent.start!).setHours(21,0,0,0)) : newEvent.end || new Date(),
        allDay: newEvent.allDay || false,
        location: newEvent.location || '',
        notes: newEvent.notes || '',
        calendarId: newEvent.calendarId || calendars[0]?.id || '',
        assigned_to: newEvent.assigned_to || []
      };
      await saveEvent(eventData);
    }
    
    setShowEventForm(false);
    setNewEvent({
      title: '',
      start: new Date(),
      end: new Date(),
      allDay: false,
      location: '',
      notes: '',
      calendarId: calendars[0]?.id || '',
      assigned_to: []
    });
  };

  // Handle start time change and automatically update end time
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = new Date(e.target.value);
    const currentEndTime = newEvent.end || newStartTime;
    
    // If end time is same or before start time, set end time to 1 hour after start
    let newEndTime = currentEndTime;
    if (currentEndTime <= newStartTime) {
      newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // Add 1 hour
    }
    
    setNewEvent({ 
      ...newEvent, 
      start: newStartTime,
      end: newEndTime
    });
  };

  const handleAddCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCalendarCategory(newCalendar);
    setShowCalendarForm(false);
    setNewCalendar({ name: '', color: 'bg-blue-500' });
  };

  const handleDateClick = (date: Date) => {
    // Prevent adding events on past dates
    if (isDateInPast(date)) {
      return; // Do nothing if date is in the past
    }
    
    setSelectedDate(date);
    setEditingEvent(null);
    // Create new date objects at local time to avoid timezone issues
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0); // Default 9 AM
    const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0); // Default 10 AM
    setNewEvent({
      ...newEvent,
      start: startDate,
      end: endDate,
      allDay: false,
      calendarId: calendars[0]?.id || ''
    });
    setShowEventForm(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      ...event,
      start: event.start,
      end: event.end,
    });
    setShowEventForm(true);
  };

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetailModal(true);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header and Breadcrumb */}
      <div className="px-0 py-0">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Company Section
          </button>
        </div>
        <br></br>

        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Calendar</h2>
      </div>

      {/* Main Calendar Layout */}
      <div className="flex relative rounded-lg overflow-hidden">
          {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${sidebarCollapsed ? 'w-0 p-0' : 'w-80 p-6'}`}>
          {/* Top Date Display */}
          <div className="mb-8">
            <h1 className="text-lg font-bold text-gray-800">
                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h1>
            <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
          </div>
          
          {/* Mini Calendar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <div className="flex space-x-1">
                <button onClick={goToPrevious} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={goToNext} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-y-2 text-xs text-center text-gray-500 mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <div key={day} className="font-medium">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-y-2">
              {getMonthDataForMiniCalendar().map((date, index) => {
                const isSelected = date.toDateString() === currentDate.toDateString();
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const weekend = isWeekend(date);
                const isPastDate = isDateInPast(date);
                const hasEvents = events.some(event => {
                  const eventDate = new Date(event.start);
                  return eventDate.toDateString() === date.toDateString();
                });
                
                return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  disabled={isPastDate}
                    className={`text-xs py-1 text-center w-8 h-8 rounded-full mx-auto flex items-center justify-center relative
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-800 dark:text-white'}
                      ${isPastDate && isCurrentMonth ? 'text-gray-400 cursor-not-allowed opacity-50' : ''}
                      ${isSelected ? 'bg-blue-600 text-white' : ''}
                      ${!isSelected && isCurrentMonth && weekend && !isPastDate ? 'bg-pink-100 dark:bg-[#171e29]' : ''}
                      ${!isSelected && isCurrentMonth && !weekend && !isPastDate ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    `}
                >
                  {date.getDate()}
                  {hasEvents && isCurrentMonth && (
                    <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                      isSelected ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                  )}
                </button>
                );
              })}
            </div>
          </div>

          {/* Calendars */}
          <div className="mb-8">
            <h3 className="uppercase text-xs font-bold text-gray-500 mb-4">Calendars</h3>
            <div className="space-y-3">
              {calendars.map(calendar => (
                <div key={calendar.id} className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${calendar.color} mr-3`}></div>
                    <span className="text-sm text-gray-700">{calendar.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditCalendar(calendar); }}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                      title="Edit calendar"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    {calendars.length > 1 && (
                      <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCalendarClick(calendar); }}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                        title="Delete calendar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
                onClick={() => { setShowCalendarForm(true); setEditingCalendar(null); }}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm font-semibold"
            >
                Add Calendars
            </button>
          </div>

          {/* Upcoming Events */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="uppercase text-xs font-bold text-gray-500 mb-2">Upcoming Events</h3>
            <div className="max-h-[235px] space-y-3 overflow-y-auto pr-2">
              {events
                  .filter(event => {
                    const now = new Date();
                    const fiveDaysFromNow = new Date();
                    fiveDaysFromNow.setDate(now.getDate() + 5);
                    fiveDaysFromNow.setHours(23, 59, 59, 999); // End of the 5th day
                    
                    // Show events that:
                    // 1. Start from now onwards (haven't passed yet)
                    // 2. Are within the next 5 days
                    return event.start >= now && event.start <= fiveDaysFromNow;
                  })
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map(event => {
                const calendar = calendars.find(c => c.id === event.calendarId);
                    const styles = eventColorStyles[calendar?.color || 'bg-gray-400'];
                return (
                      <div key={event.id} className={`p-3 rounded-lg flex items-center bg-white border-l-4 ${styles.border}`}>
                      <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                        <p className="text-xs text-gray-500">
                                {event.start.toLocaleDateString([], {day: '2-digit', month: 'short', year: 'numeric'})}
                        </p>
                      </div>
                          <div className="text-right">
                              <p className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {event.allDay ? 'All Day' : `${event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})} - ${event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}`}
                              </p>
                    </div>
                  </div>
                );
                  })
              }
            </div>
          </div>
        </div>

      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`absolute top-14 -translate-y-1/2 bg-white border-2 border-gray-200 rounded-full p-0.5 z-20 hover:bg-gray-100 focus:outline-none transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'left-1' : 'left-80 -translate-x-1/2'
        }`}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4 text-gray-600" /> : <ChevronLeft className="w-4 h-4 text-gray-600" />}
      </button>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Calendar */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-800 sm:pl-[87px]">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
                <div className="flex items-center space-x-1 border border-gray-300 rounded-md p-1">
                    <button onClick={goToPrevious} className="p-1 rounded-md hover:bg-gray-100">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button onClick={goToToday} className="px-3 py-1 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                  Today
                </button>
                    <button onClick={goToNext} className="p-1 rounded-md hover:bg-gray-100">
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
                <div className="flex items-center space-x-3">
                <div className="relative">
                    <button
                        onClick={() => setViewDropdownOpen(!isViewDropdownOpen)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                        <span className="capitalize">{view}</span>
                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {isViewDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-20 border">
                            <button onClick={() => { setView('day'); setViewDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Day</button>
                            <button onClick={() => { setView('week'); setViewDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Week</button>
                            <button onClick={() => { setView('month'); setViewDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Month</button>
                            <button onClick={() => { setView('agenda'); setViewDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Agenda</button>
                        </div>
                    )}
                </div>
                
            <button
                  onClick={() => setShowEventForm(true)}
                          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-semibold w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4 mr-1" />
                    Add Event
            </button>
                </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {/* Month View */}
            {view === 'month' && (() => {
              const monthDays = getMonthData();
              const eventLayouts: { event: CalendarEvent; key: string; top: string; left: string; width: string; }[] = [];
              
              const weekSlots: number[][][] = Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => []));

              const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
              const viewStart = monthDays[0];
              const viewEnd = monthDays[monthDays.length - 1];

              for (const event of sortedEvents) {
                const eventStart = new Date(event.start);
                eventStart.setHours(0, 0, 0, 0);
                const eventEnd = new Date(event.end);
                eventEnd.setHours(0, 0, 0, 0);

                if (eventEnd < viewStart || eventStart > viewEnd) continue;

                let currentDay = new Date(eventStart < viewStart ? viewStart : eventStart);
                
                while(currentDay <= eventEnd && currentDay <= viewEnd) {
                  const weekIndex = monthDays.findIndex(d => d.toDateString() === currentDay.toDateString());
                  if (weekIndex === -1) {
                    currentDay.setDate(currentDay.getDate() + 1);
                    continue;
                  }
                  
                  const week = Math.floor(weekIndex / 7);
                  if (week >= 6) break;

                  const weekEndDay = monthDays[week * 7 + 6];

                  const segStart = currentDay;
                  const segEnd = eventEnd < weekEndDay ? eventEnd : weekEndDay;

                  const segStartIndex = monthDays.findIndex(d => d.toDateString() === segStart.toDateString());
                  const segEndIndex = monthDays.findIndex(d => d.toDateString() === segEnd.toDateString());

                  const startDayOfWeek = segStartIndex % 7;
                  const endDayOfWeek = segEndIndex % 7;
                  const span = endDayOfWeek - startDayOfWeek + 1;
                  
                  let slot = 0;
                  while(true) {
                    let isTaken = false;
                    for (let i = startDayOfWeek; i <= endDayOfWeek; i++) {
                      if (weekSlots[week][i].includes(slot)) {
                        isTaken = true;
                        break;
                      }
                    }
                    if (!isTaken) {
                      for (let i = startDayOfWeek; i <= endDayOfWeek; i++) {
                        weekSlots[week][i].push(slot);
                      }
                      break;
                    }
                    slot++;
                  }
                  
                  eventLayouts.push({
                    event,
                    key: `${event.id}-${week}`,
                    top: `calc(${week * 10}rem + 4rem + ${slot * 2.25}rem)`,
                    left: `calc(${(startDayOfWeek / 7) * 100}% + 2px)`,
                    width: `calc(${(span / 7) * 100}% - 4px)`,
                  });

                  currentDay = new Date(segEnd);
                  currentDay.setDate(currentDay.getDate() + 1);
                }
              }

              return (
                <div className="relative">
                  <div className="grid grid-cols-7">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="pb-2 text-sm font-medium text-gray-600 text-left border-b-2 border-gray-200">
                      {day}
                    </div>
                  ))}
                    {monthDays.map((date, index) => {
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const weekend = isWeekend(date);
                      const isPastDate = isDateInPast(date);
                      const isDragOver = dragOverDate?.toDateString() === date.toDateString();
                      
                      return (
                    <div
                      key={index}
                          className={`h-40 p-2 flex flex-col transition-colors duration-200 ${
                            isPastDate ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            isToday ? 'border-2 border-blue-500' : 'border-b border-r'
                          } ${
                            isToday ? 'bg-blue-50 dark:bg-[#002949]' : ''
                          } ${
                            isCurrentMonth ? (weekend ? 'bg-pink-50 dark:bg-[#171e29]' : 'bg-white dark:bg-gray-800') : 'bg-gray-100 dark:bg-gray-700'
                          } ${
                            isDragOver && !isPastDate ? 'bg-blue-100 border-blue-300' : ''
                          } ${
                            isToday ? '' : 'border-gray-200 dark:border-[#32405a]'
                          } ${
                            !isToday && !isDragOver && !isPastDate ? 'hover:bg-gray-50 dark:hover:bg-[#2563eb]' : ''
                          }`}
                      onClick={() => handleDateClick(date)}
                      onDragOver={(e: any) => handleDragOver(e, date)}
                      onDragLeave={(e: any) => handleDragLeave(e)}
                      onDrop={(e: any) => handleDrop(e, date)}
                    >
                          <div className={`text-sm mb-2 ${
                            isPastDate && isCurrentMonth ? 'text-gray-400 dark:text-gray-500' :
                            isCurrentMonth ? 'text-gray-800 dark:text-white' : 'text-gray-400'
                          }`}>
                        {date.getDate()}
                          </div>
                        </div>
                      );
                    })}
                      </div>
                      
                  <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                    {eventLayouts.map(({ event, key, top, left, width }) => {
                          const calendar = calendars.find(c => c.id === event.calendarId);
                      const styles = eventColorStyles[calendar?.color || 'bg-gray-400'];
                      const isDragging = draggedEvent?.id === event.id;
                      
                          return (
                            <div
                          key={key} 
                          onClick={(e) => { e.stopPropagation(); handleViewEvent(event); }}
                          className={`absolute pointer-events-auto p-1 rounded cursor-move transition-all duration-200 ${styles.bg} border-l-4 ${styles.border} ${
                            isDragging ? 'opacity-60 scale-95 z-50' : 'hover:shadow-md'
                          }`}
                          style={{ top, left, width, height: '3rem' }}
                          draggable
                          onDragStart={(e: any) => handleDragStart(e, event)}
                          onDragEnd={(e: any) => handleDragEnd(e)}
                        >
                          <div className="overflow-hidden">
                            <p className={`text-xs truncate ${styles.text}`}>
                                {event.allDay ? 'All day' : event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                            </p>
                            <p className={`text-xs font-semibold truncate ${styles.text}`}>{event.title}</p>
                          </div>
                            </div>
                          );
                        })}
                          </div>
                      </div>
              )
            })()}

            {view === 'agenda' && (() => {
                const fromDate = new Date(currentDate);
                fromDate.setHours(0, 0, 0, 0);

                const agendaDates = [];
                for (let i = 0; i < agendaDays; i++) {
                    const day = new Date(fromDate);
                    day.setDate(fromDate.getDate() + i);
                    agendaDates.push(day);
                }
                
                const agendaData = agendaDates.map(date => {
                    const dayEvents = events
                        .filter(event => new Date(event.start).toDateString() === date.toDateString())
                        .sort((a, b) => a.start.getTime() - b.start.getTime());
                    return { date, events: dayEvents };
                });

                return (
                    <div className="bg-white dark:bg-gray-800 p-6 overflow-auto">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {agendaData.map(({ date, events }) => (
                                <div key={date.toISOString()} className="py-6">
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                        {date.toLocaleDateString('en-US', { weekday: 'long' })}
                                        <span className="text-gray-500 dark:text-gray-400 font-normal">, {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                                    </h3>
                                    {events.length > 0 ? (
                                        <div className="mt-4 w-full divide-y divide-gray-100 dark:divide-gray-700">
                                            {events.map(event => {
                                                const calendar = calendars.find(c => c.id === event.calendarId);
                                                return (
                                                    <div key={event.id} className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 py-4" onClick={() => handleViewEvent(event)}>
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${calendar?.color}`}></div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {event.allDay ? 'All Day' : `${event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                                                                </p>
                                                                <p className="font-semibold text-gray-900 dark:text-white">{event.title}</p>
                                                                {event.location && <p className="text-sm text-gray-500 dark:text-gray-400">{event.location}</p>}
                    </div>
                </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="mt-4">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No events scheduled.</p>
              </div>
            )}
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-6">
                            <button
                                onClick={() => setAgendaDays(days => days + 7)}
                                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-sm font-semibold"
                            >
                                Load 7 more days
                            </button>
                        </div>
                    </div>
                )
            })()}

            {/* Week View */}
            {view === 'week' && (
              <div className="bg-white dark:bg-gray-800">
                {/* Week Header */}
                <div className="grid grid-cols-[auto_repeat(7,1fr)] bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700 mb-4">
                  <div className="w-16 border-r border-gray-200 dark:border-gray-700"></div>
                  {getWeekData().map((date) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const weekend = isWeekend(date);
                    return (
                      <div key={date.toISOString()} className={`p-2 text-center border-r border-gray-200 dark:border-gray-700 ${
                        isToday ? 'bg-blue-50 dark:bg-[#002949]' : ''
                      } ${
                        weekend && !isToday ? 'bg-pink-50 dark:bg-[#171e29]' : ''
                      }`}>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span>
                        <h3 className={`text-xl font-semibold mt-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>{date.getDate()}</h3>
                      </div>
                    );
                  })}
                      </div>
                
                {/* All Day Events */}
                <div className="relative border-b border-gray-200 dark:border-gray-700" style={{ height: '65px' }}>
                  <div className="grid grid-cols-[auto_repeat(7,1fr)] h-full">
                    <div className="w-16 flex items-center justify-center border-r border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400">All day</span>
                    </div>
                    {getWeekData().map((date, dayIndex) => (
                      <div key={dayIndex} className="relative border-r border-gray-100 dark:border-gray-700 h-full"></div>
                    ))}
                  </div>
                  <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
                    {(() => {
                        const weekData = getWeekData();
                        const weekStart = weekData[0];
                        const weekEnd = weekData[6];
                        const allDayEvents = events.filter(e => e.allDay || isMultiDayEvent(e))
                            .filter(e => new Date(e.start) <= weekEnd && new Date(e.end) >= weekStart);
                        
                        const slots: number[][] = Array.from({ length: 7 }, () => []);
                        const layouts: any[] = [];

                        allDayEvents.forEach(event => {
                            const segStart = new Date(event.start) > weekStart ? new Date(event.start) : weekStart;
                            const segEnd = new Date(event.end) < weekEnd ? new Date(event.end) : weekEnd;
                            const startDay = Math.max(0, Math.floor((segStart.getTime() - weekStart.getTime()) / (1000*60*60*24)));
                            const endDay = Math.min(6, Math.floor((segEnd.getTime() - weekStart.getTime()) / (1000*60*60*24)));
                            const span = endDay - startDay + 1;
                            
                            let slot = 0;
                            while(true){
                                let taken = false;
                                for(let i = startDay; i <= endDay; i++) if(slots[i]?.includes(slot)) taken = true;
                                if(!taken) break;
                                slot++;
                            }
                            for(let i = startDay; i <= endDay; i++) slots[i].push(slot);

                            layouts.push({ event, slot, startDay, span });
                        });

                        return layouts.map(({event, slot, startDay, span}) => {
                           const calendar = calendars.find(c => c.id === event.calendarId);
                           const styles = eventColorStyles[calendar?.color || 'bg-gray-400'];
                           return (
                               <div key={event.id}
                                   onClick={(e) => { e.stopPropagation(); handleViewEvent(event); }}
                                   className={`absolute pointer-events-auto p-1 rounded ${styles.bg} border-l-4 ${styles.border} cursor-pointer`}
                                   style={{
                                       top: `${slot * 1.75}rem`,
                                       left: `calc(${(startDay / 7) * 100}% + 2px)`,
                                       width: `calc(${(span / 7) * 100}% - 4px)`,
                                       height: '3rem',
                                   }}>
                                    <div className="overflow-hidden">
                                        <p className={`text-xs truncate ${styles.text}`}>
                                            {event.allDay ? 'All day' : event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                        </p>
                                        <p className={`text-xs font-semibold truncate ${styles.text}`}>{event.title}</p>
                                    </div>
                               </div>
                           )
                        });
                    })()}
                  </div>
                </div>
                
                {/* Week Body */}
                <div className="relative mt-2">
                  {/* Time Grid */}
                  <div className="grid grid-cols-[auto_repeat(7,1fr)]">
                    <div className="w-16">
                      {getTimeSlots().map(hour => (
                        <div key={hour} className="h-16 text-right pr-2 border-r border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400 relative -top-2">{formatTime(hour)}</span>
                        </div>
                      ))}
                        </div>
                    {/* Day columns */}
                    {getWeekData().map((date, dayIndex) => (
                      <div key={dayIndex} className={`relative border-r border-gray-100 dark:border-gray-700 ${
                        isWeekend(date) ? 'bg-pink-50 dark:bg-[#171e29]' : 'bg-white dark:bg-gray-800'
                      }`}>
                        {getTimeSlots().map(hour => {
                          const slotDate = new Date(date);
                          slotDate.setHours(hour, 0, 0, 0);
                          const isPastSlot = isDateInPast(slotDate);
                          const isDragOver = dragOverDate?.getTime() === slotDate.getTime();
                          
                          return (
                            <div 
                              key={hour} 
                              className={`h-16 border-t border-gray-100 dark:border-gray-700 transition-colors duration-200 ${
                                isPastSlot ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                              } ${
                                isDragOver && !isPastSlot ? 'bg-blue-100 border-blue-300' : ''
                              } ${
                                !isDragOver && !isPastSlot ? 'hover:bg-gray-50 dark:hover:bg-[#2563eb]' : ''
                              }`}
                              onClick={() => handleDateClick(slotDate)}
                              onDragOver={(e: any) => handleDragOver(e, slotDate)}
                              onDragLeave={(e: any) => handleDragLeave(e)}
                              onDrop={(e: any) => handleDrop(e, slotDate)}
                            />
                          );
                        })}
                    </div>
                  ))}
                  </div>
                  
                  {/* Floating Events */}
                  <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
                    {getWeekData().map((date, dayIndex) => {
                      const dayEvents = getEventsForDate(date).filter(event => !event.allDay && !isMultiDayEvent(event) && event.end.getHours() >= 7 && event.start.getHours() <= 20);
                      if (dayEvents.length === 0) return null;
                      
                      // Sort events by start time
                      const sortedEvents = dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
                      
                      // Calculate overlaps and positions
                      const eventPositions = sortedEvents.map((event, index) => {
                        const overlapping = sortedEvents.filter(otherEvent => 
                          otherEvent !== event &&
                          ((event.start >= otherEvent.start && event.start < otherEvent.end) ||
                           (otherEvent.start >= event.start && otherEvent.start < event.end))
                        );
                        
                        const totalOverlapping = overlapping.length + 1;
                        const eventIndex = overlapping.filter(e => e.start <= event.start).length;
                        
                        return { event, totalOverlapping, eventIndex };
                      });
                      
                      return eventPositions.map(({ event, totalOverlapping, eventIndex }) => {
                        const startHour = event.start.getHours();
                        const endHour = event.end.getHours();
                        const startMinutes = event.start.getMinutes();
                        const endMinutes = event.end.getMinutes();
                        
                        const topPosition = ((startHour - 7) * 64) + (startMinutes / 60 * 64);
                        const duration = (endHour - startHour) + ((endMinutes - startMinutes) / 60);
                        const height = Math.max(duration * 64, 20);
                        const calendar = calendars.find(c => c.id === event.calendarId);
                        const styles = eventColorStyles[calendar?.color || 'bg-gray-400'];
                        const isDragging = draggedEvent?.id === event.id;
                        
                        const eventWidth = (100 / 7) / totalOverlapping;
                        const eventLeft = (100 / 7) * dayIndex + (eventWidth * eventIndex);
                        
                        return (
                          <div
                            key={event.id}
                            onClick={() => handleViewEvent(event)}
                            className={`absolute pointer-events-auto p-2 rounded-lg cursor-move transition-all duration-200 ${styles.bg} border-l-4 ${styles.border} ${styles.bgHover} ${
                              isDragging ? 'opacity-60 scale-95 z-50' : 'hover:shadow-md'
                            }`}
                            style={{
                              top: `${topPosition}px`,
                              left: `calc(${eventLeft}% + 4px)`,
                              width: `calc(${eventWidth}% - 8px)`,
                              height: `${height}px`
                            }}
                            draggable
                            onDragStart={(e: any) => handleDragStart(e, event)}
                            onDragEnd={(e: any) => handleDragEnd(e)}
                          >
                            <div className="overflow-hidden">
                                <p className={`text-xs truncate ${styles.text}`}>{event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                <p className={`text-sm font-semibold truncate ${styles.text}`}>{event.title}</p>
                            </div>
                          </div>
                        );
                      });
                      })}
                    </div>
                </div>
              </div>
            )}

            {/* Day View */}
            {view === 'day' && (
              <div className="bg-white dark:bg-gray-800 relative">
                  {/* Time Grid */}
                <div className="grid grid-cols-[auto_1fr]">
                  <div className="w-16">
                    {getTimeSlots().map(hour => (
                      <div key={hour} className="h-20 text-right pr-2 border-r border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400 relative -top-2">
                          {formatTime(hour).replace(' ', '')}
                        </span>
                      </div>
                    ))}
                      </div>
                  <div className="relative bg-white dark:bg-gray-800">
                    {getTimeSlots().map(hour => {
                      const slotDate = new Date(currentDate);
                      slotDate.setHours(hour, 0, 0, 0);
                      const isPastSlot = isDateInPast(slotDate);
                      const isDragOver = dragOverDate?.getTime() === slotDate.getTime();
                      
                      return (
                        <div 
                          key={hour} 
                          className={`h-20 border-b border-gray-100 dark:border-gray-700 transition-colors duration-200 ${
                            isPastSlot ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            isDragOver && !isPastSlot ? 'bg-blue-100 border-blue-300' : ''
                          } ${
                            !isDragOver && !isPastSlot ? 'hover:bg-gray-50 dark:hover:bg-[#2563eb]' : ''
                          }`}
                          onClick={() => handleDateClick(slotDate)}
                          onDragOver={(e: any) => handleDragOver(e, slotDate)}
                          onDragLeave={(e: any) => handleDragLeave(e)}
                          onDrop={(e: any) => handleDrop(e, slotDate)}
                        />
                      );
                    })}
                  </div>
                </div>
                  
                  {/* Floating Events */}
                <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
                  {(() => {
                    const dayEvents = getEventsForDate(currentDate).filter(event => !event.allDay && event.end.getHours() >= 7 && event.start.getHours() <= 20);
                    const sortedEvents = dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
                    
                    const eventPositions = sortedEvents.map((event, index) => {
                      const overlapping = sortedEvents.filter(otherEvent => 
                        otherEvent !== event &&
                        ((event.start >= otherEvent.start && event.start < otherEvent.end) ||
                         (otherEvent.start >= event.start && otherEvent.start < event.end))
                      );
                      
                      const totalOverlapping = overlapping.length + 1;
                      const eventIndex = overlapping.filter(e => e.start <= event.start).length;
                      
                      return { event, totalOverlapping, eventIndex };
                    });
                    
                    return eventPositions.map(({ event, totalOverlapping, eventIndex }) => {
                      const startHour = event.start.getHours();
                      const endHour = event.end.getHours();
                      const startMinutes = event.start.getMinutes();
                      const endMinutes = event.end.getMinutes();
                      
                      const topPosition = ((startHour - 7) * 80) + (startMinutes / 60 * 80);
                      const duration = (endHour - startHour) + ((endMinutes - startMinutes) / 60);
                      const height = Math.max(duration * 80, 20);
                      const calendar = calendars.find(c => c.id === event.calendarId);
                      const styles = eventColorStyles[calendar?.color || 'bg-gray-400'];
                      const isDragging = draggedEvent?.id === event.id;
                      
                      const eventWidth = 100 / totalOverlapping;
                      const eventLeft = eventWidth * eventIndex;
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => handleViewEvent(event)}
                          className={`absolute pointer-events-auto p-2 rounded-lg cursor-move transition-all duration-200 ${styles.bg} border-l-4 ${styles.border} ${styles.bgHover} ${
                            isDragging ? 'opacity-60 scale-95 z-50' : 'hover:shadow-md'
                          }`}
                          style={{
                            top: `${topPosition}px`,
                            left: `calc(${eventLeft}% + 8px)`,
                            width: `calc(${eventWidth}% - 16px)`,
                            height: `${height}px`
                          }}
                          draggable
                          onDragStart={(e: any) => handleDragStart(e, event)}
                          onDragEnd={(e: any) => handleDragEnd(e)}
                        >
                          <div className="overflow-hidden">
                              <p className={`text-xs truncate ${styles.text}`}>
                                {event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true}).toLowerCase()}
                              </p>
                              <p className={`text-sm font-semibold ${styles.text}`}>{event.title}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventDetailModal && selectedEvent && createPortal((() => {
        const calendar = calendars.find(c => c.id === selectedEvent.calendarId);
        const styles = eventColorStyles[calendar?.color || 'bg-gray-400'];
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
                          <button
                  onClick={() => setShowEventDetailModal(false)} 
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10">
                <X className="w-6 h-6" />
                          </button>

              <div className={`p-4 rounded-t-lg ${styles.bg}`}>
                <h2 className={`text-xl font-bold uppercase pr-8 ${styles.text}`}>{selectedEvent.title}</h2>
                        </div>

              <div className="p-6 space-y-4 text-gray-700">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm">
                    {selectedEvent.start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {!selectedEvent.allDay && ` (${selectedEvent.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${selectedEvent.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`}
                  </span>
                  </div>
                {selectedEvent.location && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">{selectedEvent.location}</span>
                </div>
                )}
                {selectedEvent.notes && (
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">{selectedEvent.notes}</span>
              </div>
            )}
          </div>

              <div className="flex flex-col sm:flex-row justify-end items-center p-4 bg-gray-50 rounded-b-lg space-y-2 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={() => {
                    setShowEventDetailModal(false);
                    handleEditEvent(selectedEvent);
                  }}
                  className="flex items-center justify-center w-full sm:w-auto text-blue-600 hover:text-blue-800 font-semibold px-4 py-2 text-sm"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button 
                  onClick={() => {
                    handleDeleteEventClick(selectedEvent);
                  }}
                  className="flex items-center justify-center w-full sm:w-auto text-red-600 hover:text-red-800 font-semibold px-4 py-2 text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
        </div>
      </div>
          </div>
        );
      })(), document.body)}

      {/* Event Form Modal */}
      {showEventForm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                      required
                    />
                  </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calendar</label>
                <select
                  value={newEvent.calendarId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewEvent({ ...newEvent, calendarId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  {calendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>{calendar.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">All Day</label>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, allDay: !newEvent.allDay })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      newEvent.allDay ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newEvent.allDay ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {!newEvent.allDay && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                      <input
                        type="datetime-local"
                      value={newEvent.start ? toLocalISOString(newEvent.start) : ''}
                      onChange={handleStartTimeChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                      required={!newEvent.allDay}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                      <input
                        type="datetime-local"
                      value={newEvent.end ? toLocalISOString(newEvent.end) : ''}
                      onChange={(e) => setNewEvent({ ...newEvent, end: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                      required={!newEvent.allDay}
                    />
                  </div>
                </div>
              )}
              
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newEvent.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Staff <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 dark:bg-[#29303b] dark:border-gray-600">
                  {combinedStaffUsers.map((member) => {
                    // For staff members, use their numeric ID directly
                    // For users, we'll use negative IDs to distinguish them from staff
                    let isChecked = false;
                    if (member.type === 'staff') {
                      const staffId = member.original_id as number;
                      isChecked = (newEvent.assigned_to || []).includes(staffId);
                    } else {
                      // For users, use the helper function to get consistent ID
                      const userId = member.original_id as string;
                      const negativeId = getUserIdHash(userId);
                      isChecked = (newEvent.assigned_to || []).includes(negativeId);
                    }
                    
                    return (
                      <label
                        key={member.id}
                        className="relative flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer group"
                      >
                        <div className="flex items-center h-5">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let newStaffIds: number[];
                                
                                if (member.type === 'staff') {
                                  // Handle staff members normally
                                  const staffId = member.original_id as number;
                                  newStaffIds = e.target.checked
                                    ? [...(newEvent.assigned_to || []), staffId]
                                    : (newEvent.assigned_to || []).filter((id) => id !== staffId);
                                } else {
                                  // For users, use the helper function to get consistent ID
                                  const userId = member.original_id as string;
                                  const negativeId = getUserIdHash(userId);
                                  
                                  newStaffIds = e.target.checked
                                    ? [...(newEvent.assigned_to || []), negativeId]
                                    : (newEvent.assigned_to || []).filter((id) => id !== negativeId);
                                }
                                
                                setNewEvent({
                                  ...newEvent,
                                  assigned_to: newStaffIds,
                                });
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
                              {member.position || (member.type === 'user' ? 'User' : '')}
                            </span>
                            <span className={`ml-2 inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                              member.type === 'staff' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {member.type}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                    <button
                      type="button"
                  onClick={() => setShowEventForm(false)}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      {editingEvent ? 'Update Event' : 'Add Event'}
                    </button>
                  </div>
                </form>
            </div>
          </div>
              </div>,
        document.body
            )}

      {/* Calendar Form Modal */}
      {showCalendarForm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingCalendar ? 'Edit Calendar' : 'Add New Calendar'}
            </h3>
            <form onSubmit={handleUpdateCalendar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newCalendar.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCalendar({ ...newCalendar, color })}
                      className={`w-8 h-8 rounded-full ${color} ${
                        newCalendar.color === color ? 'ring-2 ring-gray-400 ring-offset-2' : ''
                      } transition-all duration-200 hover:scale-110`}
                    />
                  ))}
                </div>
                  </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCalendarForm(false)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {editingCalendar ? 'Update Calendar' : 'Add Calendar'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
        )}

      {/* Delete Calendar Confirmation Modal */}
      {showDeleteCalendarModal && calendarToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-12 h-12 rounded-full ${calendarToDelete.color} flex items-center justify-center`}>
                <Trash2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
              Delete Calendar
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete the calendar "{calendarToDelete.name}"? This action cannot be undone and will also delete all events in this calendar.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => {
                  setShowDeleteCalendarModal(false);
                  setCalendarToDelete(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCalendar(calendarToDelete.id)}
                className="flex items-center justify-center w-full sm:w-auto text-red-600 hover:text-red-800 font-semibold px-4 py-2 text-sm bg-white border border-red-300 rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Calendar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Event Confirmation Modal */}
      {showDeleteEventModal && eventToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
              Delete Event
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete the event "{eventToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => {
                  setShowDeleteEventModal(false);
                  setEventToDelete(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEvent(eventToDelete.id)}
                className="flex items-center justify-center w-full sm:w-auto text-red-600 hover:text-red-800 font-semibold px-4 py-2 text-sm bg-white border border-red-300 rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Event
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
    </div>
  );
}
