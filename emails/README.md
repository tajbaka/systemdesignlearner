# Email Templates

This directory contains React Email templates for sending confirmation emails to users.

## Templates

- **feedback-confirmation.tsx**: Sent when a user submits feedback
- **newsletter-confirmation.tsx**: Sent when a user subscribes to the newsletter

## Setup

### 1. Install Dependencies

Already installed:

```bash
npm install react-email @react-email/components resend
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Resend API Key (required for sending emails)
RESEND_API_KEY=re_your_api_key_here

# Email sender address (optional, defaults to onboarding@resend.dev)
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Get a Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Verify your domain (or use their test domain `onboarding@resend.dev` for testing)
3. Get your API key from the dashboard
4. Add it to your `.env` file

### 4. Verify Your Domain (Production)

For production use, you need to verify your domain in Resend:

1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add the DNS records they provide to your domain's DNS settings
4. Wait for verification (usually takes a few minutes)
5. Update `EMAIL_FROM` in your `.env` to use your domain (e.g., `noreply@yourdomain.com`)

## Development & Testing

### Preview Emails Locally

React Email provides a development server to preview emails:

```bash
npx react-email dev
```

This will open a browser with all your email templates, allowing you to preview and test them.

### Testing Email Sending

For development/testing, you can use Resend's test domain (`onboarding@resend.dev`) without domain verification. However, emails will only be sent to your Resend account email address.

For full testing, verify your domain as described above.

## How It Works

### Email Service (`lib/email.ts`)

The email service provides two functions:

1. **sendFeedbackConfirmation**: Sends a confirmation email after feedback submission
2. **sendNewsletterConfirmation**: Sends a welcome email after newsletter subscription

Both functions:

- Check if `RESEND_API_KEY` is configured
- Render the React Email template to HTML
- Send the email via Resend
- Handle errors gracefully (log but don't throw)

### API Integration

The email functions are called in:

- `app/api/feedback/route.ts`: Sends feedback confirmation after successful submission
- `app/api/subscribe/route.ts`: Sends newsletter confirmation after successful subscription

Both API routes use a fire-and-forget pattern - the email is sent asynchronously and doesn't block the API response. If the email fails, the user data is still saved successfully.

## Customization

### Modifying Templates

Edit the template files directly:

- `emails/feedback-confirmation.tsx`
- `emails/newsletter-confirmation.tsx`

React Email uses inline styles for maximum email client compatibility. All styles are defined at the bottom of each template file.

### Adding New Templates

1. Create a new `.tsx` file in this directory
2. Import React Email components
3. Build your template
4. Export a function in `lib/email.ts` to send it
5. Call it from the appropriate API route

## Email Client Compatibility

React Email templates are designed to work across all major email clients:

- Gmail
- Outlook
- Apple Mail
- Yahoo Mail
- Mobile clients (iOS Mail, Gmail app, etc.)

All styles are inlined automatically and use email-safe CSS.

## Resources

- [React Email Documentation](https://react.email/docs/introduction)
- [React Email Components](https://react.email/components)
- [Resend Documentation](https://resend.com/docs)
