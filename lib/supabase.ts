import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface EmailSubscription {
  id: string;
  email: string;
  name?: string;
  type: "newsletter" | "feedback";
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSubmission {
  id: string;
  email: string;
  name?: string;
  feedback: string;
  timestamp: string;
}
