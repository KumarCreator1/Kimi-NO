import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import db from "../db/connectDb.js";
import {
  classes,
  userClasses,
  subjects,
  users,
  documents,
} from "../models/Db.schema.js";
import {
  createClassSchema,
  updateClassSchema,
  classIdParamSchema,
  addMemberSchema,
  memberIdParamSchema,
} from "../validations/validations.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";

// Create a new class. Creator becomes admin.
// two query in sigle transaction
// POST /api/v1/class

const createClass = async (req, res) => {
  const parsed = createClassSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { className, description } = parsed.data;
  const userId = req.user.id;

  // Both inserts succeed together or not at all — transaction ROW LOCK to prevent
  // admin-less class
  const newClass = await db.transaction(async (tx) => {
    const [createdClass] = await tx
      .insert(classes)
      .values({ userId, className, description })
      .returning();

    if (!createdClass) {
      throw new AppError(500, "Failed to create class");
    }

    await tx.insert(userClasses).values({
      userId,
      classId: createdClass.id,
      role: "admin",
    });

    return createdClass;
  });

  return new ApiResponse(
    201,
    { class: newClass },
    "Class created successfully",
  ).send(res);
};

// List classes the logged-in user belongs to, with subject/member counts.
// Three queries total
// counts coming from group aggregate query as well
// GET /api/v1/class

const getUserClasses = async (req, res) => {
  const userId = req.user.id;

  const userClassList = await db
    .select({
      id: classes.id,
      className: classes.className,
      description: classes.description,
      creatorId: classes.userId,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
    })
    .from(classes)
    .innerJoin(userClasses, eq(userClasses.classId, classes.id))
    .where(eq(userClasses.userId, userId));

  if (userClassList.length === 0) {
    return new ApiResponse(
      200,
      { classes: [] },
      "Classes fetched successfully",
    ).send(res);
  }

  const classIds = userClassList.map((c) => c.id);

  const subjectCounts = await db
    .select({
      classId: subjects.classId,
      total: sql`count(*)`.mapWith(Number),
    })
    .from(subjects)
    .where(inArray(subjects.classId, classIds))
    .groupBy(subjects.classId);

  const memberCounts = await db
    .select({
      classId: userClasses.classId,
      total: sql`count(*)`.mapWith(Number),
    })
    .from(userClasses)
    .where(inArray(userClasses.classId, classIds))
    .groupBy(userClasses.classId);

  const subjectCountMap = new Map(
    subjectCounts.map((s) => [s.classId, s.total]),
  );
  const memberCountMap = new Map(memberCounts.map((m) => [m.classId, m.total]));

  const result = userClassList.map((c) => ({
    id: c.id,
    className: c.className,
    description: c.description,
    subjects: subjectCountMap.get(c.id) ?? 0,
    members: memberCountMap.get(c.id) ?? 0,
    isCreator: c.creatorId === userId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return new ApiResponse(
    200,
    { classes: result },
    "Classes fetched successfully",
  ).send(res);
};

// Get class detail: subjects with count of doc member and role
// Requires checkClassRole()      -any member can access
// GET /api/v1/class/:classId

const getClassDetail = async (req, res) => {
  const { classId } = req;
  const { membership } = req;

  const [classData] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId));
  if (!classData) {
    throw new AppError(404, "Class not found");
  }

  const classSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.classId, classId));

  const members = await db
    .select({
      userId: userClasses.userId,
      role: userClasses.role,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(userClasses)
    .innerJoin(users, eq(userClasses.userId, users.id))
    .where(eq(userClasses.classId, classId));

  let subjectsWithDocCount = classSubjects.map((s) => ({
    ...s,
    documentCount: 0,
  }));

  if (classSubjects.length > 0) {
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

    subjectsWithDocCount = classSubjects.map((s) => ({
      ...s,
      documentCount: docCountMap.get(s.id) ?? 0,
    }));
  }

  return new ApiResponse(
    200,
    {
      class: classData,
      subjects: subjectsWithDocCount,
      members,
      role: membership.role,
    },
    "Class detail fetched",
  ).send(res);
};

//  Update class name/description.
//  Requires checkClassRole("admin").

//  Gated on userClasses.role table, not classes.userId — the role column is the
//  single source of truth for "who can administer this class", so it stays
//  correct even if you later add a way to promote a second admin.
//  PATCH /api/v1/class/:classId

const updateClass = async (req, res) => {
  const parsed = updateClassSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId } = req;
  const { className, description } = parsed.data;

  const [updated] = await db
    .update(classes)
    .set({
      ...(className !== undefined && { className }),
      ...(description !== undefined && { description }),
    })
    .where(eq(classes.id, classId))
    .returning();

  if (!updated) {
    throw new AppError(404, "Class not found");
  }

  return new ApiResponse(
    200,
    { class: updated },
    "Class updated successfully",
  ).send(res);
};

//  Delete a class (cascades to subjects/documents/requests).
//  Requires checkClassRole("admin").
//  DELETE /api/v1/class/:classId

const deleteClass = async (req, res) => {
  const { classId } = req;

  const [deleted] = await db
    .delete(classes)
    .where(eq(classes.id, classId))
    .returning();

  if (!deleted) {
    throw new AppError(404, "Class not found");
  }

  return new ApiResponse(200, null, "Class deleted successfully").send(res);
};

//  Add a member to a class by email.
//  Requires checkClassRole("admin").
//  POST /api/v1/class/:classId/member

const addClassMember = async (req, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId } = req;
  const { email } = parsed.data;

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  if (!targetUser) {
    throw new AppError(404, "No user found with this email");
  }

  const [existing] = await db
    .select()
    .from(userClasses)
    .where(
      and(
        eq(userClasses.userId, targetUser.id),
        eq(userClasses.classId, classId),
      ),
    );

  if (existing) {
    throw new AppError(400, "User is already a member of this class");
  }

  await db.insert(userClasses).values({
    userId: targetUser.id,
    classId,
    role: "member", // schema only defines "admin" | "member" — no "student"
  });

  const { password, ...userWithoutPassword } = targetUser;

  return new ApiResponse(
    201,
    { user: userWithoutPassword },
    "Member added successfully",
  ).send(res);
};

//  Remove a member from a class.
//  Requires checkClassRole("admin").
//  DELETE /api/v1/class/:classId/member/:memberId

const removeClassMember = async (req, res) => {
  const parsedParams = memberIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new AppError(400, parsedParams.error.issues[0].message);
  }

  const { classId, memberId } = parsedParams.data;
  const userId = req.user.id;

  if (memberId === userId) {
    throw new AppError(400, "You cannot remove yourself from the class");
  }

  const [target] = await db
    .select()
    .from(userClasses)
    .where(
      and(eq(userClasses.userId, memberId), eq(userClasses.classId, classId)),
    );

  if (!target) {
    throw new AppError(404, "This user is not a member of this class");
  }

  // Guard against leaving the class with zero admins — count is cheap
  // and this path is rare (admin actions), so no need to optimize it away.
  if (target.role === "admin") {
    const admins = await db
      .select({ userId: userClasses.userId })
      .from(userClasses)
      .where(
        and(eq(userClasses.classId, classId), eq(userClasses.role, "admin")),
      );

    if (admins.length <= 1) {
      throw new AppError(400, "Cannot remove the last admin of the class");
    }
  }

  await db
    .delete(userClasses)
    .where(
      and(eq(userClasses.userId, memberId), eq(userClasses.classId, classId)),
    );

  return new ApiResponse(200, null, "Member removed successfully").send(res);
};

export {
  createClass,
  getUserClasses,
  getClassDetail,
  updateClass,
  deleteClass,
  addClassMember,
  removeClassMember,
};
