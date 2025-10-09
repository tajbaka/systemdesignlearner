-- Create email_subscriptions table for newsletter signups and feedback tracking
CREATE TABLE email_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('newsletter', 'feedback')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(email, type) -- Allow same email for different types
);

-- Create feedback_submissions table for detailed feedback
CREATE TABLE feedback_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  feedback TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_email_subscriptions_email ON email_subscriptions(email);
CREATE INDEX idx_email_subscriptions_type ON email_subscriptions(type);
CREATE INDEX idx_email_subscriptions_email_type ON email_subscriptions(email, type);
CREATE INDEX idx_email_subscriptions_created_at ON email_subscriptions(created_at);
CREATE INDEX idx_feedback_submissions_email ON feedback_submissions(email);
CREATE INDEX idx_feedback_submissions_timestamp ON feedback_submissions(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous inserts (allow anyone to submit)
CREATE POLICY "Allow anonymous email subscription inserts" ON email_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous feedback submission inserts" ON feedback_submissions
  FOR INSERT WITH CHECK (true);

-- Create policies for reading (optional - for admin purposes)
CREATE POLICY "Allow authenticated users to read email subscriptions" ON email_subscriptions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read feedback submissions" ON feedback_submissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_email_subscriptions_updated_at
  BEFORE UPDATE ON email_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
