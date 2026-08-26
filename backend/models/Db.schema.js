import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  primaryKey,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ──────────────────────────────────────────────────────────
// Custom Postgres types Drizzle doesn't ship natively
// ──────────────────────────────────────────────────────────
const tsvector = customType({
  dataType() {
    return "tsvector";
  },
});

// pgvector — requires `CREATE EXTENSION IF NOT EXISTS vector;` in a migration.
// 768 dims = Gemini text-embedding-004. Change if you switch models.
const vector = customType({
  dataType() {
    return "vector(768)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
});

// ──────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────
export const classRoleEnum = pgEnum("class_role", ["admin", "member"]);
export const docStatusEnum = pgEnum("doc_status", [
  "processing",
  "ready",
  "failed",
]);
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
]);

// ──────────────────────────────────────────────────────────
// users — self-rolled auth: firstName/lastName/email/password as you
// specified. `password` stores a bcrypt/argon2 hash, never plaintext.
// ──────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 40 }).notNull(),
  lastName: varchar("last_name", { length: 40 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ──────────────────────────────────────────────────────────
// refresh_tokens — one row per active session/device. Store a HASH of
// the refresh token (never the raw token), so a DB read alone can't be
// replayed as a session. Gives you: multi-device sessions, "log out
// this device" (set revokedAt), "log out everywhere" (revoke all rows
// for a user), and rotation-reuse detection (if a used token is
// presented again, revoke the whole family — flag it as theft).
// ──────────────────────────────────────────────────────────
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }), // fits IPv6
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("refresh_tokens_hash_uidx").on(t.tokenHash),
    index("refresh_tokens_user_idx").on(t.userId),
  ],
);

// ──────────────────────────────────────────────────────────
// password_reset_tokens — short-lived, single-use. Store a hash, not
// the raw token that goes in the email link.
// ──────────────────────────────────────────────────────────
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("password_reset_tokens_hash_uidx").on(t.tokenHash)],
);

// ──────────────────────────────────────────────────────────
// classes
// ──────────────────────────────────────────────────────────
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id") // creator; class-level admin by default
      .notNull()
      // RESTRICT, not cascade: this class is shared with other members —
      // deleting the creator's account must not silently wipe every other
      // member's subjects/documents. Deleting a user who still owns a class
      // fails until ownership is explicitly transferred (or the class is
      // deleted on purpose).
      .references(() => users.id, { onDelete: "restrict" }),
    className: varchar("class_name", { length: 50 }).notNull(),
    description: varchar("description", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // scoped to the CREATOR, not global — a thousand different people can
    // all have a class named "Data Structures"; one person just can't have
    // two of their own
    uniqueIndex("classes_user_classname_uidx").on(t.userId, t.className),
  ],
);

// ──────────────────────────────────────────────────────────
// user_classes — composite PK (yours): the (userId, classId) pair IS
// the natural key, no reason for a surrogate id.
// ──────────────────────────────────────────────────────────
export const userClasses = pgTable(
  "user_classes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    role: classRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.classId] }),
    index("user_classes_class_idx").on(t.classId),
  ],
);

// ──────────────────────────────────────────────────────────
// subjects
// ──────────────────────────────────────────────────────────
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectName: varchar("subject_name", { length: 50 }).notNull(),
    description: varchar("description", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("subjects_class_name_uidx").on(t.classId, t.subjectName)],
);

// ──────────────────────────────────────────────────────────
// documents
//
// classId is DENORMALIZED here (yours) alongside subjectId — every
// permission check and "all docs in this class" query is class-scoped,
// so this skips a join through subjects for the single most common
// query pattern in the app.
//
// Keep it in sync with a trigger (belt-and-suspenders over app-layer
// discipline) — add this in your first migration:
//
//   CREATE OR REPLACE FUNCTION sync_document_class_id()
//   RETURNS TRIGGER AS $$
//   BEGIN
//     SELECT class_id INTO NEW.class_id FROM subjects WHERE id = NEW.subject_id;
//     RETURN NEW;
//   END;
//   $$ LANGUAGE plpgsql;
//
//   CREATE TRIGGER trg_sync_document_class_id
//   BEFORE INSERT OR UPDATE OF subject_id ON documents
//   FOR EACH ROW EXECUTE FUNCTION sync_document_class_id();
//
// This makes documents.classId always correct even from a raw SQL
// console — the app never has to remember to set it.
//
// Soft-delete via deletedAt: an approved delete_document request sets
// this instead of removing the row — audit trail + undo, and it
// doesn't cascade-orphan documentChunks.
// ──────────────────────────────────────────────────────────
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    // nullable: onDelete "set null" means a deleted uploader's docs survive
    // (uploadedBy becomes null) instead of the delete failing outright
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // raw upload
    documentName: varchar("document_name", { length: 255 }).notNull(), // original filename
    filePath: varchar("file_path", { length: 512 }).notNull(), // storage object key
    fileSize: integer("file_size"), // bytes
    mimeType: varchar("mime_type", { length: 50 }), // e.g. "application/pdf"

    // Gemini-enriched fields
    aiTitle: text("ai_title"), // suitable renamed title
    aiSummary: text("ai_summary"), // unbounded — a generated summary
    // shouldn't be capped at 255 chars the way a user-typed description is
    topics: jsonb("topics").default([]),
    // "all docs tagged X" is `WHERE topics @> '["X"]'`, made fast by the
    // GIN index below — no need for a normalized topics table at this scale

    status: docStatusEnum("status").default("processing").notNull(),
    processingError: text("processing_error"),

    // keyword search — maintained by a Postgres trigger from ai_title +
    // ai_summary + topics (raw SQL migration, not expressible in Drizzle TS)
    searchVector: tsvector("search_vector"),

    // whole-document embedding for coarse semantic ranking; fine-grained
    // search lives in documentChunks below
    embedding: vector("embedding"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("documents_class_idx").on(t.classId),
    index("documents_subject_idx").on(t.subjectId),
    index("documents_search_idx").using("gin", t.searchVector),
    index("documents_topics_idx").using("gin", t.topics),
    // cursor-friendly pagination for "recent notes in this subject"
    index("documents_subject_created_idx").on(t.subjectId, t.createdAt),
    // vector index — add once you have data (build after seeding, not in
    // the initial migration):
    // CREATE INDEX documents_embedding_idx ON documents
    //   USING hnsw (embedding vector_cosine_ops);
  ],
);

// ──────────────────────────────────────────────────────────
// document_chunks — page/paragraph-level slices with their own
// embeddings. A single embedding for a 40-page PDF gives mushy results;
// chunk-level embeddings return the exact matching paragraph, and this
// is the shape you'd want if you ever add RAG-style Q&A over notes.
// Populate in the same Gemini pass that does the rename.
// ──────────────────────────────────────────────────────────
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("document_chunks_document_idx").on(t.documentId),
    uniqueIndex("document_chunks_doc_index_uidx").on(
      t.documentId,
      t.chunkIndex,
    ),
  ],
);

// ──────────────────────────────────────────────────────────
// requests — generic approval workflow. Covers add_member, remove_member,
// delete_document today, and any future admin-gated action without a
// schema change: teach the app a new `type` string + what `payload`
// should hold for it.
// ──────────────────────────────────────────────────────────
export const requests = pgTable(
  "requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),

    type: text("type").notNull(), // "add_member" | "remove_member" | "delete_document" | ...
    targetType: text("target_type"), // "user_class" | "document" | null
    targetId: uuid("target_id"), // id within targetType's table; nullable

    payload: jsonb("payload").default({}),

    // nullable: onDelete "set null" means a deleted requester's request
    // history survives (requestedBy becomes null) instead of the delete
    // failing outright
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),

    status: requestStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("requests_class_status_idx").on(t.classId, t.status),
    index("requests_target_idx").on(t.targetType, t.targetId),
  ],
);

// ──────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  userClasses: many(userClasses),
  createdClasses: many(classes),
  uploadedDocuments: many(documents),
  requestsMade: many(requests),
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);

export const classesRelations = relations(classes, ({ one, many }) => ({
  creator: one(users, {
    fields: [classes.userId],
    references: [users.id],
  }),
  users: many(userClasses),
  subjects: many(subjects),
  documents: many(documents),
  requests: many(requests),
}));

export const userClassesRelations = relations(userClasses, ({ one }) => ({
  user: one(users, {
    fields: [userClasses.userId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [userClasses.classId],
    references: [classes.id],
  }),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  class: one(classes, {
    fields: [subjects.classId],
    references: [classes.id],
  }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  class: one(classes, {
    fields: [documents.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [documents.subjectId],
    references: [subjects.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  class: one(classes, {
    fields: [requests.classId],
    references: [classes.id],
  }),
  requester: one(users, {
    fields: [requests.requestedBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [requests.reviewedBy],
    references: [users.id],
  }),
}));
