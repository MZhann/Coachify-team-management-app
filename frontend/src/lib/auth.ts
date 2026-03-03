import { jwtVerify } from "jose";
import { cookies } from "next/headers";

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

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("coachify_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}


