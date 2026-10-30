import { prisma } from './prisma';

export interface AuditLogParams {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  reference?: string;
  beforeValue?: any;
  afterValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        reference: params.reference || null,
        beforeValue: params.beforeValue ? JSON.stringify(params.beforeValue) : null,
        afterValue: params.afterValue ? JSON.stringify(params.afterValue) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
