import { eq, and } from "drizzle-orm";
import db from "../db/connectDb.js";
import { userClasses } from "../models/Db.schema.js";
import { classIdParamSchema } from "../validations/validations.js";
import AppError from "../utils/appError.js";

/**
 * Confirms the logged-in user belongs to :classId, and (optionally) that
 * their role matches requiredRole. Attaches the membership row to
 * req.membership so downstream controllers never re-query it.
 *
 * Run this AFTER verifyJWT.
 *
 *   router.get("/:classId", verifyJWT, checkClassRole(), getClassDetail);
 *   router.patch("/:classId", verifyJWT, checkClassRole("admin"), updateClass);
 */
const checkClassRole = (requiredRole) => async (req, res, next) => {
  const parsedParams = classIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new AppError(400, parsedParams.error.issues[0].message);
  }

  const { classId } = parsedParams.data;
  const userId = req.user.id;

  const [membership] = await db
    .select()
    .from(userClasses)
    .where(
      and(eq(userClasses.userId, userId), eq(userClasses.classId, classId)),
    );

  if (!membership) {
    throw new AppError(403, "You are not a member of this class");
  }

  if (requiredRole && membership.role !== requiredRole) {
    throw new AppError(
      403,
      `Only a class ${requiredRole} can perform this action`,
    );
  }

  req.classId = classId;
  req.membership = membership;
  next();
};

export default checkClassRole;
