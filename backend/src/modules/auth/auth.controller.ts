import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { config } from '../../config';
import { logAudit } from '../../shared/audit';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
});

const assignLocationSchema = z.object({
  warehouseId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  accessLevel: z.enum(['READ_ONLY', 'OPERATOR', 'MANAGER', 'FULL']).default('FULL'),
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { usernameOrEmail, password } = loginSchema.parse(req.body);

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
        include: {
          employee: {
            include: { department: true, company: true },
          },
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
          locationAccess: {
            include: { warehouse: true, site: true },
          },
        },
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ success: false, message: 'User account is deactivated. Contact administrator.' });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
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

      if (roles.includes('ADMIN')) {
        permissionSet.add('*');
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          roles,
        },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      await logAudit({
        actorId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        reference: user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            employee: user.employee
              ? {
                  code: user.employee.employeeCode,
                  name: `${user.employee.firstName} ${user.employee.lastName}`,
                  designation: user.employee.designation,
                  department: user.employee.department?.name,
                  company: user.employee.company.name,
                }
              : null,
            roles,
            permissions: Array.from(permissionSet),
            warehouses: user.locationAccess.map((la) => ({
              id: la.warehouseId,
              code: la.warehouse?.code,
              name: la.warehouse?.name,
              accessLevel: la.accessLevel,
            })),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          employee: {
            include: { department: true, company: true },
          },
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
          locationAccess: {
            include: { warehouse: true, site: true },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
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

      if (roles.includes('ADMIN')) {
        permissionSet.add('*');
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          employee: user.employee
            ? {
                code: user.employee.employeeCode,
                name: `${user.employee.firstName} ${user.employee.lastName}`,
                designation: user.employee.designation,
                department: user.employee.department?.name,
                company: user.employee.company.name,
              }
            : null,
          roles,
          permissions: Array.from(permissionSet),
          warehouses: user.locationAccess.map((la) => ({
            id: la.warehouseId,
            code: la.warehouse?.code,
            name: la.warehouse?.name,
            accessLevel: la.accessLevel,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    if (req.user) {
      await logAudit({
        actorId: req.user.id,
        action: 'LOGOUT',
        entity: 'User',
        entityId: req.user.id,
        reference: req.user.username,
      });
    }
    res.json({ success: true, message: 'Successfully logged out' });
  }

  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        include: {
          employee: { include: { department: true } },
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
          locationAccess: { include: { warehouse: true, site: true } },
        },
        orderBy: { username: 'asc' },
      });

      res.json({
        success: true,
        data: users.map((u) => {
          const roles = u.userRoles.map((r) => r.role.code);
          const permissionSet = new Set<string>();
          for (const ur of u.userRoles) {
            for (const rp of ur.role.permissions) {
              if (rp.permission?.code) permissionSet.add(rp.permission.code);
            }
          }
          if (roles.includes('ADMIN')) permissionSet.add('*');

          return {
            id: u.id,
            username: u.username,
            email: u.email,
            name: u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : u.username,
            designation: u.employee?.designation || 'Staff',
            department: u.employee?.department?.name || 'General Operations',
            roles,
            permissions: Array.from(permissionSet),
            warehouses: u.locationAccess.map((la) => ({
              id: la.warehouseId,
              code: la.warehouse?.code,
              name: la.warehouse?.name,
              accessLevel: la.accessLevel,
            })),
            isActive: u.isActive,
            createdAt: u.createdAt,
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  }

  static async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: {
            include: { permission: true },
          },
          _count: { select: { userRoles: true } },
        },
        orderBy: { code: 'asc' },
      });

      res.json({
        success: true,
        data: roles.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          description: r.description,
          userCount: r._count.userRoles,
          permissions: r.permissions.map((p) => ({
            id: p.permission.id,
            code: p.permission.code,
            name: p.permission.name,
            module: p.permission.module,
          })),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  static async listPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
      });
      res.json({ success: true, data: permissions });
    } catch (err) {
      next(err);
    }
  }

  static async assignRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { roleId } = assignRoleSchema.parse(req.body);

      // Verify user and role exist
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        res.status(404).json({ success: false, message: 'Role not found' });
        return;
      }

      // Check if user already has this role
      const existing = await prisma.userRole.findUnique({
        where: { userId_roleId: { userId: id, roleId } },
      });

      if (existing) {
        res.status(400).json({ success: false, message: 'User already has this role' });
        return;
      }

      await prisma.userRole.create({
        data: { userId: id, roleId },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'ASSIGN_ROLE',
        entity: 'UserRole',
        entityId: id,
        reference: `${user.username} -> ${role.code}`,
      });

      res.json({ success: true, message: `Role ${role.code} successfully assigned to ${user.username}` });
    } catch (err) {
      next(err);
    }
  }

  static async removeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, roleId } = req.params;

      await prisma.userRole.deleteMany({
        where: { userId: id, roleId },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'REVOKE_ROLE',
        entity: 'UserRole',
        entityId: id,
        reference: `Revoked role ${roleId} from ${id}`,
      });

      res.json({ success: true, message: 'Role revoked successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE_STATUS',
        entity: 'User',
        entityId: id,
        reference: user.username,
        beforeValue: { isActive: user.isActive },
        afterValue: { isActive: updated.isActive },
      });

      res.json({ success: true, message: `User account ${updated.isActive ? 'activated' : 'deactivated'}`, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
