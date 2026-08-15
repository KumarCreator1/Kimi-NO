CREATE TYPE "public"."class_role" AS ENUM('admin', 'student');--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "document_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "file_path" SET DATA TYPE varchar(512);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_classes" ADD COLUMN "role" "class_role" DEFAULT 'student' NOT NULL;