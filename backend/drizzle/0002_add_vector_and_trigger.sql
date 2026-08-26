-- Add vector extension and sync_document_class_id trigger

CREATE EXTENSION IF NOT EXISTS vector;

-- Trigger to keep documents.class_id in sync with subjects
CREATE OR REPLACE FUNCTION sync_document_class_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT class_id INTO NEW.class_id FROM subjects WHERE id = NEW.subject_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_document_class_id ON documents;
CREATE TRIGGER trg_sync_document_class_id
BEFORE INSERT OR UPDATE OF subject_id ON documents
FOR EACH ROW EXECUTE FUNCTION sync_document_class_id();
