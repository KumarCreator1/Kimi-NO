import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const classRoleEnum = z.enum(["student", "teacher", "admin"]);

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(40, "First name cannot exceed 40 characters"),
  lastName: z
    .string()
    .trim()
    .max(40, "Last name cannot exceed 40 characters")
    .optional()
    .nullable(),
  email: z
    .email("Invalid email address format")
    .max(255, "Email cannot exceed 255 characters"),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters long")
    .max(255, "Password cannot exceed 255 characters"),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

export const addUserToClassSchema = z.object({
  userId: uuidSchema,
  classId: uuidSchema,
  role: classRoleEnum.default("student"),
});

export const createSubjectSchema = z.object({
  classId: uuidSchema,
  subjectName: z
    .string()
    .min(1, "Subject name is required")
    .max(50, "Subject name cannot exceed 50 characters"),
  description: z
    .string()
    .max(255, "Description cannot exceed 255 characters")
    .optional()
    .nullable(),
});

////===============================================//////////////////////////////////////////////////////////////

// ──────────────────────────────────────────────────────────
// NOTE: this file only contains schemas for the class endpoints.
// I don't have the content of your existing validations.js
// (registerSchema, loginSchema, etc.) — paste it and I'll merge these
// in properly instead of you doing it by hand.
// ──────────────────────────────────────────────────────────

const classNameField = z
  .string()
  .trim()
  .min(1, "Class name is required")
  .max(50, "Class name must be at most 50 characters");

const descriptionField = z
  .string()
  .trim()
  .max(255, "Description must be at most 255 characters")
  .optional();

export const createClassSchema = z.object({
  className: classNameField,
  description: descriptionField,
});

export const updateClassSchema = z
  .object({
    className: classNameField.optional(),
    description: descriptionField,
  })
  .refine(
    (data) => data.className !== undefined || data.description !== undefined,
    { message: "Provide at least one of className or description to update" },
  );

export const classIdParamSchema = z.object({
  classId: z.string().uuid("Invalid class id"),
});

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export const memberIdParamSchema = z.object({
  classId: z.string().uuid("Invalid class id"),
  memberId: z.string().uuid("Invalid member id"),
});
