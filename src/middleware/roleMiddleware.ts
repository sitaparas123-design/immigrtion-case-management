import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have permissions for this action' });
    }

    next();
  };
};
