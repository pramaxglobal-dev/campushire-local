-- Add nullable session-management foundation fields to refresh_tokens.
-- Existing rows remain valid and existing refresh-token behavior is unchanged.
ALTER TABLE "refresh_tokens"
  ADD COLUMN "family_id" TEXT,
  ADD COLUMN "replaced_by_token_id" TEXT,
  ADD COLUMN "revoked_reason" TEXT,
  ADD COLUMN "last_used_at" TIMESTAMP(3);

CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
