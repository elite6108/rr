// netlify/functions/send-notification-email.js
const sgMail = require('@sendgrid/mail');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse the request body
    const { recipient, subject, content, fromEmail } = JSON.parse(event.body);

    // Validate required fields
    if (!recipient || !subject || !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Check if we have the API key in environment variables
    if (!process.env.SENDGRID_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'SendGrid API key not configured in environment variables' }),
      };
    }

    // Set SendGrid API key from environment variable
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Create email message
    const msg = {
      to: recipient,
      from: fromEmail || process.env.SENDGRID_FROM_EMAIL || 'notifications@yourdomain.com',
      subject: subject,
      html: content,
    };

    // Send email
    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', details: error.message }),
    };
  }
};
