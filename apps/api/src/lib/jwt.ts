import crypto from "crypto";
import jwt, {
  JwtPayload as JsonWebTokenPayload,
  TokenExpiredError,
  type SignOptions
} from "jsonwebtoken";
import { JwtPayload } from "@campushire/types";
import { env } from "../config/env";

const JWT_ISSUER = "campushire-api";
const JWT_AUDIENCE = "campushire";
const JWT_ALGORITHM = "HS256";

const castPayload = (decoded: string | JsonWebTokenPayload): JwtPayload => {
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload.");
  }

  const userId = decoded.userId;
  const role = decoded.role;
  const tenantId = decoded.tenantId;
  const subRole = decoded.subRole;
  const familyId = decoded.familyId;
  const jti = decoded.jti;

  if (
    typeof userId !== "string" ||
    typeof role !== "string" ||
    (typeof tenantId !== "string" && tenantId !== null) ||
    (typeof subRole !== "string" && subRole !== null && subRole !== undefined) ||
    (familyId !== undefined && familyId !== null && typeof familyId !== "string") ||
    (jti !== undefined && typeof jti !== "string")
  ) {
    throw new Error("Invalid token payload.");
  }

  return {
    userId,
    role: role as JwtPayload["role"],
    tenantId,
    subRole: (subRole as JwtPayload["subRole"]) ?? null,
    familyId: familyId ?? null,
    jti
  };
};

export const generateAccessToken = (payload: JwtPayload): string => {
  const expiresIn = env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    jwtid: crypto.randomUUID(),
    algorithm: JWT_ALGORITHM
  });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const expiresIn = env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    jwtid: crypto.randomUUID(),
    algorithm: JWT_ALGORITHM
  });
};

const hasModernClaims = (token: string): boolean => {
  const decoded = jwt.decode(token);
  return Boolean(
    decoded &&
      typeof decoded === "object" &&
      ("iss" in decoded || "aud" in decoded)
  );
};

const verifyToken = (token: string, secret: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: [JWT_ALGORITHM]
    });
    return castPayload(decoded);
  } catch (error) {
    if (hasModernClaims(token)) {
      throw error;
    }
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM]
    });
    return castPayload(decoded);
  }
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return verifyToken(token, env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return verifyToken(token, env.JWT_REFRESH_SECRET);
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const isTokenExpiredError = (error: unknown): boolean => {
  return error instanceof TokenExpiredError;
};
