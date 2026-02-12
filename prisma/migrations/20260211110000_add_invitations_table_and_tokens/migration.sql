-- Create invitation status enum when missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvitationStatus') THEN
    CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
  END IF;
END
$$;

-- Create invitations table if it does not exist (for environments without prior manual setup).
CREATE TABLE IF NOT EXISTS "invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "companyId" TEXT NOT NULL,
  "invitedBy" TEXT NOT NULL,
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys when missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_companyId_fkey') THEN
    ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_invitedBy_fkey') THEN
    ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_invitedBy_fkey"
    FOREIGN KEY ("invitedBy") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Add indexes.
CREATE INDEX IF NOT EXISTS "invitations_companyId_status_idx" ON "invitations"("companyId", "status");
CREATE INDEX IF NOT EXISTS "invitations_email_companyId_idx" ON "invitations"("email", "companyId");
CREATE INDEX IF NOT EXISTS "invitations_expiresAt_idx" ON "invitations"("expiresAt");
