# Supabase Email Capture Setup

This guide will help you set up the email capture functionality using Supabase.

## 1. Environment Variables

Create a `.env.local` file in your project root with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in your Supabase project dashboard under Settings > API.

## 2. Database Schema

Run the SQL migration in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database/migrations/001_initial_schema.sql
```

This will create:
- `email_subscriptions` table for newsletter signups and feedback tracking (allows same email for different types)
- `feedback_submissions` table for detailed feedback content
- Proper indexes and Row Level Security policies

**Note:** The schema allows the same email to be used for both newsletter subscriptions and feedback submissions.

### Updating Existing Databases

If you've already run the initial schema, run this migration to update the unique constraint:

```sql
-- Copy and paste the contents of database/migrations/002_update_unique_constraint.sql
```

## 3. Test the Setup

1. Start your development server: `npm run dev`
2. Visit the homepage and try submitting the feedback form
3. Try subscribing to the newsletter in the footer
4. Check your Supabase dashboard to see the data being inserted

## 4. View Data

You can view the captured emails and feedback in your Supabase dashboard under the Table Editor for the respective tables.

## Security Notes

- Row Level Security (RLS) is enabled to allow anonymous inserts
- The anon key is safe to expose in client-side code
- Consider setting up additional policies if you need admin access

## Troubleshooting

- Make sure your Supabase project allows anonymous access
- Check that the environment variables are correctly set
- Verify the API routes are working by checking the browser network tab
