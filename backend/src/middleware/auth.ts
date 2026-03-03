import { Request, Response, NextFunction } from "express";
import { jwtVerify, SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "coachify-dev-secret-change-in-production"
);

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export async function createToken(
  payload: Omit<JWTPayload, "exp">
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.coachify_token;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : cookieToken;

    if (!token) {
      res.status(401).json({ error: "Unauthorized — no token provided" });
      return;
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: "Unauthorized — invalid token" });
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
}


