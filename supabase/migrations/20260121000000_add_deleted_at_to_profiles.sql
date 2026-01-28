-- Add deleted_at column to profiles table for soft delete support
ALTER TABLE "profiles" 
ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
