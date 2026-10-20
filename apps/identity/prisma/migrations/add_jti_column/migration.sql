-- Add jti column to Session table
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "jti" TEXT;
