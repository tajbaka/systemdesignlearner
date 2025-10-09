-- Add consent flags and provenance fields for better user management
-- Run this to enhance your existing tables

-- Add consent and provenance fields to feedback_submissions
ALTER TABLE feedback_submissions
ADD COLUMN contact_ok BOOLEAN DEFAULT FALSE,
ADD COLUMN marketing_ok BOOLEAN DEFAULT FALSE,
ADD COLUMN source TEXT DEFAULT 'landing',
ADD COLUMN referrer TEXT,
ADD COLUMN user_agent TEXT,
ADD COLUMN ip_sha256 TEXT;

-- Add consent fields to email_subscriptions (for future use)
ALTER TABLE email_subscriptions
ADD COLUMN contact_ok BOOLEAN DEFAULT FALSE,
ADD COLUMN marketing_ok BOOLEAN DEFAULT FALSE,
ADD COLUMN status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed'));

-- Update the type check constraint to include more future types
ALTER TABLE email_subscriptions DROP CONSTRAINT IF EXISTS email_subscriptions_type_check;
ALTER TABLE email_subscriptions ADD CONSTRAINT email_subscriptions_type_check
CHECK (type IN ('newsletter', 'feedback', 'waitlist', 'beta', 'product-updates'));

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_contact_ok ON feedback_submissions(contact_ok);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_marketing_ok ON feedback_submissions(marketing_ok);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_source ON feedback_submissions(source);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_status ON email_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_contact_ok ON email_subscriptions(contact_ok);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_marketing_ok ON email_subscriptions(marketing_ok);
