import { Request, Response, NextFunction } from 'express';

export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
      return;
    }

    const hasRole = req.user.roles.includes('ADMIN') || req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Required role: ${allowedRoles.join(' or ')}. Your active roles: ${req.user.roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

export function requirePermissions(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
      return;
    }

    // Admins bypass
    if (req.user.roles.includes('ADMIN') || req.user.permissions.includes('*')) {
      return next();
    }

    const hasPermission = requiredPermissions.every((p) => req.user!.permissions.includes(p));
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Missing required permission: ${requiredPermissions.join(', ')}.`,
      });
      return;
    }

    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
      return;
    }

    if (req.user.roles.includes('ADMIN') || req.user.permissions.includes('*')) {
      return next();
    }

    const hasAny = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasAny) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Requires at least one permission: ${permissions.join(' or ')}.`,
      });
      return;
    }

    next();
  };
}

export function requireWarehouseAccess(getWarehouseId: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
      return;
    }

    // Admins bypass warehouse scoping
    if (req.user.roles.includes('ADMIN')) {
      return next();
    }

    const warehouseId = getWarehouseId(req);
    if (!warehouseId) {
      return next();
    }

    const hasAccess = req.user.assignedWarehouses.includes(warehouseId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Forbidden. You do not have permission to access warehouse ${warehouseId}. Assigned facilities: ${req.user.assignedWarehouses.join(', ') || 'None'}`,
      });
      return;
    }

    next();
  };
}
