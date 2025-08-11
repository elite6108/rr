// src/utils/emailNotifications.ts
import { supabase } from '../lib/supabase';
import { Task } from '../types/notifications';

/**
 * Sends an email notification for a task assignment
 * @param taskId The ID of the task that was assigned
 * @param assigneeIds Array of staff/user IDs who were assigned to the task
 */
export const sendTaskAssignmentEmail = async (
  task: Task, 
  assigneeIds: (number | string)[]
): Promise<boolean> => {
  try {
    // Get the SendGrid API key from environment variables or Supabase
    const { data: configData } = await supabase
      .from('app_config')
      .select('sendgrid_api_key, notification_from_email')
      .single();
    
    if (!configData?.sendgrid_api_key) {
      console.error('SendGrid API key not found in configuration');
      return false;
    }

    // Get user emails for the assignees
    const userEmails = await Promise.all(
      assigneeIds.map(async (id) => {
        // If ID is negative, it's a user ID (from getUserIdHash)
        if (typeof id === 'number' && id < 0) {
          // Convert back to original user ID format
          const { data } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', Math.abs(id).toString())
            .single();
          
          return data?.email;
        } else {
          // It's a staff ID
          const { data } = await supabase
            .from('staff')
            .select('email')
            .eq('id', id)
            .single();
          
          return data?.email;
        }
      })
    );

    // Filter out any undefined emails
    const validEmails = userEmails.filter(email => email) as string[];
    
    if (validEmails.length === 0) {
      console.error('No valid emails found for assignees');
      return false;
    }

    // Format due date if available
    const dueDate = task.due_date 
      ? new Date(task.due_date).toLocaleDateString() 
      : 'Not specified';

    // Create email content
    const emailSubject = `Task Assignment: ${task.title}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">New Task Assignment</h2>
        <p>You have been assigned to the following task:</p>
        
        <div style="background-color: #f9fafb; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.title}</h3>
          <p><strong>Priority:</strong> ${task.priority.toUpperCase()}</p>
          <p><strong>Status:</strong> ${task.status.replace('_', ' ')}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
        </div>
        
        <p>Please log in to the system to view more details and take action on this task.</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    `;

    // Send email to each recipient
    for (const email of validEmails) {
      const response = await fetch('/.netlify/functions/send-notification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: email,
          subject: emailSubject,
          content: emailContent,
          fromEmail: configData.notification_from_email || 'support@stonepad.co.uk'
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send email to ${email}:`, await response.text());
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending task assignment email:', error);
    return false;
  }
};

/**
 * Sends an email notification for a calendar event assignment
 * @param eventId The ID of the calendar event
 * @param assigneeIds Array of staff/user IDs who were assigned to the event
 */
export const sendCalendarEventAssignmentEmail = async (
  eventId: string,
  assigneeIds: (number | string)[]
): Promise<boolean> => {
  try {
    // Get event details
    const { data: event, error } = await supabase
      .from('calendar')
      .select('*')
      .eq('id', eventId)
      .single();
    
    if (error || !event) {
      console.error('Error fetching calendar event:', error);
      return false;
    }

    // Get the SendGrid API key from environment variables or Supabase
    const { data: configData } = await supabase
      .from('app_config')
      .select('sendgrid_api_key, notification_from_email')
      .single();
    
    if (!configData?.sendgrid_api_key) {
      console.error('SendGrid API key not found in configuration');
      return false;
    }

    // Get user emails for the assignees (same logic as task assignment)
    const userEmails = await Promise.all(
      assigneeIds.map(async (id) => {
        // If ID is negative, it's a user ID (from getUserIdHash)
        if (typeof id === 'number' && id < 0) {
          // Convert back to original user ID format
          const { data } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', Math.abs(id).toString())
            .single();
          
          return data?.email;
        } else {
          // It's a staff ID
          const { data } = await supabase
            .from('staff')
            .select('email')
            .eq('id', id)
            .single();
          
          return data?.email;
        }
      })
    );

    // Filter out any undefined emails
    const validEmails = userEmails.filter(email => email) as string[];
    
    if (validEmails.length === 0) {
      console.error('No valid emails found for assignees');
      return false;
    }

    // Format dates
    const startDate = new Date(event.start_date).toLocaleString();
    const endDate = event.end_date ? new Date(event.end_date).toLocaleString() : 'Not specified';

    // Create email content
    const emailSubject = `Calendar Event: ${event.title}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Calendar Event Assignment</h2>
        <p>You have been assigned to the following calendar event:</p>
        
        <div style="background-color: #f9fafb; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${event.title}</h3>
          <p><strong>Start:</strong> ${startDate}</p>
          <p><strong>End:</strong> ${endDate}</p>
          <p><strong>Location:</strong> ${event.location || 'Not specified'}</p>
          ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
        </div>
        
        <p>Please log in to the system to view more details about this event.</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    `;

    // Send email to each recipient
    for (const email of validEmails) {
      const response = await fetch('/.netlify/functions/send-notification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: email,
          subject: emailSubject,
          content: emailContent,
          fromEmail: configData.notification_from_email || 'support@stonepad.co.uk'
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send email to ${email}:`, await response.text());
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending calendar event assignment email:', error);
    return false;
  }
};
