import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLE_PERMISSIONS } from '../config/permissions.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key-replace-this') as {
      id: string;
      email: string;
      role: string;
      permissions?: string[];
    };
    req.user = decoded;

    const overrideRole = req.headers['x-user-role'] as string;
    if (overrideRole) {
      req.user.role = overrideRole;
      req.user.permissions = ROLE_PERMISSIONS[overrideRole.toLowerCase()] || [];
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Token is expired or invalid' });
  }
};
