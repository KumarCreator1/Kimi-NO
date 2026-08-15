import {z} from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(50, "Full name cannot exceed 50 characters"),
  email: z
    .string()
    .email("Invalid email address format")
    .max(255, "Email cannot exceed 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(255, "Password cannot exceed 255 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

export const createClassSchema = z.object({
  className: z
    .string()
    .min(1, "Class name is required")
    .max(50, "Class name cannot exceed 50 characters"),
  description: z
    .string()
    .max(255, "Description cannot exceed 255 characters")
    .optional()
    .nullable(),
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

