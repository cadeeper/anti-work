import dayjs from 'dayjs';
import { prisma } from '../db/index.js';

/**
 * 判断给定时间是否为加班时间
 */
export async function isOvertimeHour(userId: number, date: Date, hour: number): Promise<boolean> {
  // 获取用户配置
  const userConfig = await prisma.userConfig.findUnique({
    where: { userId },
  });

  // 默认配置
  const workTimeStart = userConfig?.workTimeStart || '09:00';
  const workTimeEnd = userConfig?.workTimeEnd || '18:00';
  const lunchStart = userConfig?.lunchStart || '12:00';
  const lunchEnd = userConfig?.lunchEnd || '14:00';

  const dayOfWeek = dayjs(date).day();

  // 周末默认算加班
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // 解析工作时间
  const [startHour] = workTimeStart.split(':').map(Number);
  const [endHour] = workTimeEnd.split(':').map(Number);
  const [lunchStartHour] = lunchStart.split(':').map(Number);
  const [lunchEndHour] = lunchEnd.split(':').map(Number);

  // 午休时间不算加班，但也不算正常工作时间
  if (hour >= lunchStartHour && hour < lunchEndHour) {
    return false;
  }

  // 工作时间外算加班
  if (hour < startHour || hour >= endHour) {
    return true;
  }

  return false;
}

/**
 * 更新工作时段记录
 */
export async function updateWorkHour(userId: number, recordedAt: Date, type: 'code' | 'web', count: number = 1): Promise<void> {
  const date = dayjs(recordedAt).format('YYYY-MM-DD');
  const hour = dayjs(recordedAt).hour();
  const isOvertime = await isOvertimeHour(userId, recordedAt, hour);

  const existing = await prisma.workHour.findUnique({
    where: { userId_date_hour: { userId, date, hour } },
  });

  if (existing) {
    await prisma.workHour.update({
      where: { id: existing.id },
      data: {
        hasActivity: true,
        codeChanges: type === 'code' ? existing.codeChanges + count : existing.codeChanges,
        webActivities: type === 'web' ? existing.webActivities + count : existing.webActivities,
      },
    });
  } else {
    await prisma.workHour.create({
      data: {
        userId,
        date,
        hour,
        hasActivity: true,
        codeChanges: type === 'code' ? count : 0,
        webActivities: type === 'web' ? count : 0,
        isOvertime,
      },
    });
  }
}
