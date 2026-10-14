-- Add columns needed for session idle timeout and revocation tracking
ALTER TABLE "Session" ADD COLUMN     "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN     "revokedAt" TIMESTAMP(3);
