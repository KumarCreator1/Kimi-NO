const isProduction = process.env.NODE_ENV === "production";

export const getCookieOptions = (maxAgeMs = undefined) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  ...(maxAgeMs !== undefined && { maxAge: maxAgeMs }),
});
