-- Migration to update unique constraint for existing databases
-- Run this if you've already created the tables with the old schema

-- Drop the existing unique constraint on email
ALTER TABLE email_subscriptions DROP CONSTRAINT email_subscriptions_email_key;

-- Add composite unique constraint on (email, type)
ALTER TABLE email_subscriptions ADD CONSTRAINT email_subscriptions_email_type_key UNIQUE (email, type);

-- Add the composite index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_email_type ON email_subscriptions(email, type);
