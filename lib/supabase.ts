import { createClient, SupabaseClient } from "@supabase/supabase-js";

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing required Supabase environment variables. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

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
