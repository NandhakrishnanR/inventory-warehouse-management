import { prisma } from './prisma';

export interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT' | 'APPROVAL';
  link?: string;
}

export async function createNotification(params: NotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        link: params.link || null,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyUsersByRole(roleCode: string, title: string, message: string, link?: string, type: 'INFO' | 'WARNING' | 'ALERT' | 'APPROVAL' = 'INFO') {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: { role: { code: roleCode } },
      select: { userId: true },
    });

    for (const ur of userRoles) {
      await createNotification({
        userId: ur.userId,
        title,
        message,
        link,
        type,
      });
    }
  } catch (error) {
    console.error('Failed to broadcast notification by role:', error);
  }
}
