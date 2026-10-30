import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../shared/prisma';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  assignedWarehouses: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        locationAccess: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid token or inactive user account.' });
      return;
    }

    const roles: string[] = [];
    const permissionSet = new Set<string>();

    for (const ur of user.userRoles) {
      roles.push(ur.role.code);
      if (ur.role.permissions) {
        for (const rp of ur.role.permissions) {
          if (rp.permission?.code) {
            permissionSet.add(rp.permission.code);
          }
        }
      }
    }

    // Admins implicitly have wildcard permission
    if (roles.includes('ADMIN')) {
      permissionSet.add('*');
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions: Array.from(permissionSet),
      assignedWarehouses: user.locationAccess.map((la) => la.warehouseId).filter(Boolean) as string[],
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}
