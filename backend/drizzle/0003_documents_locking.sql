ALTER TABLE documents
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS documents_status_locked_created_idx
ON documents (status, locked_at, created_at);
