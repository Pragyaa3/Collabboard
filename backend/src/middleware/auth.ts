import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { TokenPayload } from "../types";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const keycloakUrl = process.env.KEYCLOAK_URL!;
const realm = process.env.KEYCLOAK_REALM!;

const jwksClient = jwksRsa({
  jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err, undefined);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
};

export const verifyToken = (token: string): Promise<TokenPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: `${keycloakUrl}/realms/${realm}`,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as TokenPayload);
      }
    );
  });
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    req.user = await verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};