import { z } from "zod";

export const uuidSchema = z.uuid("Invalid UUID format");

export const classRoleEnum = z.enum(["admin", "member"]);

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
  role: classRoleEnum.default("member"),
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

export const updateSubjectSchema = z
  .object({
    subjectName: z
      .string()
      .trim()
      .min(1, "Subject name is required")
      .max(50, "Subject name cannot exceed 50 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(255, "Description cannot exceed 255 characters")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => data.subjectName !== undefined || data.description !== undefined,
    {
      message: "Provide at least one of subjectName or description to update",
    },
  );

export const subjectIdParamSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema,
});

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
  classId: z.uuid("Invalid class id"),
});

export const addMemberSchema = z.object({
  email: z.email("Invalid email address"),
});

export const memberIdParamSchema = z.object({
  classId: z.uuid("Invalid class id"),
  memberId: z.uuid("Invalid member id"),
});

// Document upload validators
export const createDocumentSchema = z.object({
  subjectId: z.uuid("Invalid subject id"),
});

export const documentIdParamSchema = z.object({
  classId: z.uuid("Invalid class id"),
  documentId: z.uuid("Invalid document id"),
});
