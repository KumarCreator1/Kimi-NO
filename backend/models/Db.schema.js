import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Define the Enum for Access Control (admin vs student)
export const classRoleEnum = pgEnum("class_role", ["admin", "student"]);

// 2. Core Tables
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 40 }).notNull(),
  lastName: varchar("last_name", { length: 40 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  className: varchar("class_name", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// The junction table: Tracks WHO is in the class and if they are an ADMIN
export const userClasses = pgTable(
  "user_classes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    role: classRoleEnum("role").default("student").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.classId] })],
);

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  subjectName: varchar("subject_name", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  documentName: varchar("document_name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  filePath: varchar("file_path", { length: 512 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// -----------------------------------------------------------------------------
// 3. DRIZZLE RELATIONS (This eliminates hard SQL queries)
// -----------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  userClasses: many(userClasses),
}));

export const classesRelations = relations(classes, ({ many }) => ({
  users: many(userClasses),
  subjects: many(subjects),
  documents: many(documents),
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

export const documentsRelations = relations(documents, ({ one }) => ({
  subject: one(subjects, {
    fields: [documents.subjectId],
    references: [subjects.id],
  }),
  class: one(classes, {
    fields: [documents.classId],
    references: [classes.id],
  }),
}));
