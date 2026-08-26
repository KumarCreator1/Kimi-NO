import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import db from "../db/connectDb.js";
import { subjects, documents } from "../models/Db.schema.js";
import {
  createSubjectSchema,
  updateSubjectSchema,
  subjectIdParamSchema,
} from "../validations/validations.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";

// Create a subject in a class.
// POST /api/v1/class/:classId/subject
// Requires checkClassRole() — any member.
const createSubject = async (req, res) => {
  const parsed = createSubjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId } = req; // set by checkClassRole
  const { subjectName, description } = parsed.data;

  // onConflictDoNothing on the (classId, subjectName) unique index avoids
  // a check-then-insert race — two people naming a subject the same thing
  // at the same moment can't both succeed.
  const [newSubject] = await db
    .insert(subjects)
    .values({ classId, subjectName, description })
    .onConflictDoNothing({ target: [subjects.classId, subjects.subjectName] })
    .returning();

  if (!newSubject) {
    throw new AppError(
      400,
      "A subject with this name already exists in this class",
    );
  }

  return new ApiResponse(
    201,
    { subject: newSubject },
    "Subject created successfully",
  ).send(res);
};

// List subjects in a class, with document counts.
// GET /api/v1/class/:classId/subject
// Requires checkClassRole() — any member.
//
// Two queries total regardless of subject count — grouped aggregate,
// not one count query per subject.
const listSubjects = async (req, res) => {
  const { classId } = req;

  const classSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.classId, classId))
    .orderBy(subjects.createdAt);

  if (classSubjects.length === 0) {
    return new ApiResponse(
      200,
      { subjects: [] },
      "Subjects fetched successfully",
    ).send(res);
  }

  const subjectIds = classSubjects.map((s) => s.id);

  const docCounts = await db
    .select({
      subjectId: documents.subjectId,
      total: sql`count(*)`.mapWith(Number),
    })
    .from(documents)
    // exclude soft-deleted documents from the count
    .where(
      and(
        inArray(documents.subjectId, subjectIds),
        isNull(documents.deletedAt),
      ),
    )
    .groupBy(documents.subjectId);

  const docCountMap = new Map(docCounts.map((d) => [d.subjectId, d.total]));

  const result = classSubjects.map((s) => ({
    ...s,
    documentCount: docCountMap.get(s.id) ?? 0,
  }));

  return new ApiResponse(
    200,
    { subjects: result },
    "Subjects fetched successfully",
  ).send(res);
};

// Get a single subject's detail.
// GET /api/v1/class/:classId/subject/:subjectId
// Requires checkClassRole() — any member.
const getSubjectDetail = async (req, res) => {
  const parsedParams = subjectIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new AppError(400, parsedParams.error.issues[0].message);
  }

  const { classId, subjectId } = parsedParams.data;

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.classId, classId)));

  if (!subject) {
    throw new AppError(404, "Subject not found in this class");
  }

  const [docCount] = await db
    .select({ total: sql`count(*)`.mapWith(Number) })
    .from(documents)
    .where(
      and(eq(documents.subjectId, subjectId), isNull(documents.deletedAt)),
    );

  return new ApiResponse(
    200,
    { subject: { ...subject, documentCount: docCount?.total ?? 0 } },
    "Subject detail fetched",
  ).send(res);
};

// Rename / update a subject's description.
// PATCH /api/v1/class/:classId/subject/:subjectId
// Requires checkClassRole("admin").
const updateSubject = async (req, res) => {
  const parsedParams = subjectIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new AppError(400, parsedParams.error.issues[0].message);
  }

  const parsedBody = updateSubjectSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new AppError(400, parsedBody.error.issues[0].message);
  }

  const { classId, subjectId } = parsedParams.data;
  const { subjectName, description } = parsedBody.data;

  let updated;
  try {
    [updated] = await db
      .update(subjects)
      .set({
        ...(subjectName !== undefined && { subjectName }),
        ...(description !== undefined && { description }),
      })
      // scope by BOTH id and classId — never trust subjectId alone, even
      // though UUIDs aren't realistically guessable, this is what actually
      // stops a subject from one class being edited via another class's URL
      .where(and(eq(subjects.id, subjectId), eq(subjects.classId, classId)))
      .returning();
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        400,
        "A subject with this name already exists in this class",
      );
    }
    throw error;
  }

  if (!updated) {
    throw new AppError(404, "Subject not found in this class");
  }

  return new ApiResponse(
    200,
    { subject: updated },
    "Subject updated successfully",
  ).send(res);
};

// Delete a subject (cascades to its documents).
// DELETE /api/v1/class/:classId/subject/:subjectId
// Requires checkClassRole("admin").
const deleteSubject = async (req, res) => {
  const parsedParams = subjectIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new AppError(400, parsedParams.error.issues[0].message);
  }

  const { classId, subjectId } = parsedParams.data;

  const [deleted] = await db
    .delete(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.classId, classId)))
    .returning();

  if (!deleted) {
    throw new AppError(404, "Subject not found in this class");
  }

  return new ApiResponse(200, null, "Subject deleted successfully").send(res);
};

export {
  createSubject,
  listSubjects,
  getSubjectDetail,
  updateSubject,
  deleteSubject,
};
