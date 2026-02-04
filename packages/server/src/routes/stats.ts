import { FastifyInstance, FastifyRequest } from 'fastify';
import dayjs from 'dayjs';
import { prisma } from '../db/index.js';
import { calculateWorkTime, calculateOvertimeStats } from '../services/workTime.js';
import { authRequired } from '../middleware/auth.js';

/**
 * 获取用户 ID 过滤条件
 * 管理员可以通过 ?userId= 查看指定用户，或查看所有用户
 * 普通用户只能查看自己
 */
function getUserIdFilter(request: FastifyRequest<{ Querystring: { userId?: string } }>): number | undefined {
  const { userId: queryUserId } = request.query;
  const user = request.user!;

  if (user.isAdmin) {
    // 管理员可以指定用户或查看所有
    return queryUserId ? parseInt(queryUserId) : undefined;
  } else {
    // 普通用户只能查看自己
    return user.userId;
  }
}

export async function statsRoutes(fastify: FastifyInstance) {
  // 所有统计接口都需要登录
  fastify.addHook('preHandler', authRequired);

  // 今日概览
  fastify.get('/today', async (request: FastifyRequest<{ Querystring: { userId?: string } }>) => {
    const userIdFilter = getUserIdFilter(request);
    const today = dayjs().format('YYYY-MM-DD');
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();

    const whereUser = userIdFilter ? { userId: userIdFilter } : {};

    // 获取今日工作时段
    const workHours = await prisma.workHour.findMany({
      where: { date: today, ...whereUser },
      orderBy: { hour: 'asc' },
    });

    // 获取今日代码变更
    const codeChanges = await prisma.codeChange.findMany({
      where: {
        recordedAt: { gte: startOfDay, lte: endOfDay },
        ...whereUser,
      },
    });

    // 获取今日网站活动
    const webActivities = await prisma.webActivity.findMany({
      where: {
        recordedAt: { gte: startOfDay, lte: endOfDay },
        ...whereUser,
      },
    });

    // 计算工作时长
    const { totalHours, normalHours, overtimeHours } = calculateWorkTime(workHours);

    // 代码统计
    const totalLinesAdded = codeChanges.reduce((sum, c) => sum + c.linesAdded, 0);
    const totalLinesDeleted = codeChanges.reduce((sum, c) => sum + c.linesDeleted, 0);
    const totalFilesChanged = codeChanges.reduce((sum, c) => sum + c.filesChanged, 0);

    // 仓库分布
    const repoStats = codeChanges.reduce((acc, c) => {
      if (!acc[c.repoName]) {
        acc[c.repoName] = { linesAdded: 0, linesDeleted: 0, filesChanged: 0 };
      }
      acc[c.repoName].linesAdded += c.linesAdded;
      acc[c.repoName].linesDeleted += c.linesDeleted;
      acc[c.repoName].filesChanged += c.filesChanged;
      return acc;
    }, {} as Record<string, { linesAdded: number; linesDeleted: number; filesChanged: number }>);

    // 域名分布
    const domainStats = webActivities.reduce((acc, a) => {
      if (!acc[a.domain]) {
        acc[a.domain] = { count: 0, duration: 0 };
      }
      acc[a.domain].count += 1;
      acc[a.domain].duration += a.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; duration: number }>);

    // 小时分布热力图 (按小时聚合)
    const hourlyMap = new Map<number, { hasActivity: boolean; codeChanges: number; webActivities: number; isOvertime: boolean }>();
    for (const wh of workHours) {
      const existing = hourlyMap.get(wh.hour);
      if (existing) {
        existing.hasActivity = existing.hasActivity || wh.hasActivity;
        existing.codeChanges += wh.codeChanges;
        existing.webActivities += wh.webActivities;
        existing.isOvertime = existing.isOvertime || wh.isOvertime;
      } else {
        hourlyMap.set(wh.hour, {
          hasActivity: wh.hasActivity,
          codeChanges: wh.codeChanges,
          webActivities: wh.webActivities,
          isOvertime: wh.isOvertime,
        });
      }
    }

    const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyMap.get(hour);
      return {
        hour,
        hasActivity: hourData?.hasActivity || false,
        codeChanges: hourData?.codeChanges || 0,
        webActivities: hourData?.webActivities || 0,
        isOvertime: hourData?.isOvertime || false,
      };
    });

    return {
      date: today,
      workTime: {
        totalHours,
        normalHours,
        overtimeHours,
      },
      code: {
        totalLinesAdded,
        totalLinesDeleted,
        totalFilesChanged,
        changeCount: codeChanges.length,
        repoStats,
      },
      web: {
        activityCount: webActivities.length,
        domainStats,
      },
      hourlyHeatmap,
    };
  });

  // 日报统计
  fastify.get('/daily', async (request: FastifyRequest<{ Querystring: { date?: string; userId?: string } }>) => {
    const userIdFilter = getUserIdFilter(request);
    const dateStr = request.query.date || dayjs().format('YYYY-MM-DD');
    const date = dayjs(dateStr);
    const startOfDay = date.startOf('day').toDate();
    const endOfDay = date.endOf('day').toDate();

    const whereUser = userIdFilter ? { userId: userIdFilter } : {};

    const workHours = await prisma.workHour.findMany({
      where: { date: dateStr, ...whereUser },
      orderBy: { hour: 'asc' },
    });

    const codeChanges = await prisma.codeChange.findMany({
      where: {
        recordedAt: { gte: startOfDay, lte: endOfDay },
        ...whereUser,
      },
    });

    const webActivities = await prisma.webActivity.findMany({
      where: {
        recordedAt: { gte: startOfDay, lte: endOfDay },
        ...whereUser,
      },
    });

    const { totalHours, normalHours, overtimeHours } = calculateWorkTime(workHours);

    return {
      date: dateStr,
      workTime: { totalHours, normalHours, overtimeHours },
      codeChanges: codeChanges.length,
      linesAdded: codeChanges.reduce((sum, c) => sum + c.linesAdded, 0),
      linesDeleted: codeChanges.reduce((sum, c) => sum + c.linesDeleted, 0),
      webActivities: webActivities.length,
      workHours,
    };
  });

  // 周报统计
  fastify.get('/weekly', async (request: FastifyRequest<{ Querystring: { week?: string; userId?: string } }>) => {
    const userIdFilter = getUserIdFilter(request);
    const weekStr = request.query.week;
    const startOfWeek = weekStr
      ? dayjs(weekStr).startOf('week')
      : dayjs().startOf('week');
    const endOfWeek = startOfWeek.endOf('week');

    const whereUser = userIdFilter ? { userId: userIdFilter } : {};

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.add(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      const startOfDay = date.startOf('day').toDate();
      const endOfDay = date.endOf('day').toDate();

      const workHours = await prisma.workHour.findMany({
        where: { date: dateStr, ...whereUser },
      });

      const codeChanges = await prisma.codeChange.findMany({
        where: {
          recordedAt: { gte: startOfDay, lte: endOfDay },
          ...whereUser,
        },
      });

      const { totalHours, normalHours, overtimeHours } = calculateWorkTime(workHours);

      days.push({
        date: dateStr,
        dayOfWeek: date.day(),
        workTime: { totalHours, normalHours, overtimeHours },
        linesAdded: codeChanges.reduce((sum, c) => sum + c.linesAdded, 0),
        linesDeleted: codeChanges.reduce((sum, c) => sum + c.linesDeleted, 0),
      });
    }

    const totalWorkHours = days.reduce((sum, d) => sum + d.workTime.totalHours, 0);
    const totalNormalHours = days.reduce((sum, d) => sum + d.workTime.normalHours, 0);
    const totalOvertimeHours = days.reduce((sum, d) => sum + d.workTime.overtimeHours, 0);
    const totalLinesAdded = days.reduce((sum, d) => sum + d.linesAdded, 0);
    const totalLinesDeleted = days.reduce((sum, d) => sum + d.linesDeleted, 0);

    return {
      startDate: startOfWeek.format('YYYY-MM-DD'),
      endDate: endOfWeek.format('YYYY-MM-DD'),
      days,
      summary: {
        totalWorkHours,
        totalNormalHours,
        totalOvertimeHours,
        totalLinesAdded,
        totalLinesDeleted,
      },
    };
  });

  // 月报统计
  fastify.get('/monthly', async (request: FastifyRequest<{ Querystring: { month?: string; userId?: string } }>) => {
    const userIdFilter = getUserIdFilter(request);
    const monthStr = request.query.month;
    const startOfMonth = monthStr
      ? dayjs(monthStr).startOf('month')
      : dayjs().startOf('month');
    const endOfMonth = startOfMonth.endOf('month');
    const daysInMonth = endOfMonth.date();

    const whereUser = userIdFilter ? { userId: userIdFilter } : {};

    const days = [];
    for (let i = 0; i < daysInMonth; i++) {
      const date = startOfMonth.add(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');

      const workHours = await prisma.workHour.findMany({
        where: { date: dateStr, ...whereUser },
      });

      const { totalHours, normalHours, overtimeHours } = calculateWorkTime(workHours);

      days.push({
        date: dateStr,
        dayOfWeek: date.day(),
        workTime: { totalHours, normalHours, overtimeHours },
      });
    }

    const totalWorkHours = days.reduce((sum, d) => sum + d.workTime.totalHours, 0);
    const totalNormalHours = days.reduce((sum, d) => sum + d.workTime.normalHours, 0);
    const totalOvertimeHours = days.reduce((sum, d) => sum + d.workTime.overtimeHours, 0);

    return {
      month: startOfMonth.format('YYYY-MM'),
      days,
      summary: {
        totalWorkHours,
        totalNormalHours,
        totalOvertimeHours,
        workDays: days.filter((d) => d.workTime.totalHours > 0).length,
      },
    };
  });

  // 网站活动详情（支持日期范围和域名筛选）
  fastify.get('/web-activities', async (request: FastifyRequest<{ Querystring: { start?: string; end?: string; domain?: string; userId?: string; limit?: string } }>) => {
    const userIdFilter = getUserIdFilter(request);
    const limit = parseInt(request.query.limit || '200');
    const domainFilter = request.query.domain;

    // 日期范围
    const startDate = request.query.start
      ? dayjs(request.query.start).startOf('day')
      : dayjs().startOf('day');
    const endDate = request.query.end
      ? dayjs(request.query.end).endOf('day')
      : dayjs().endOf('day');

    const whereUser = userIdFilter ? { userId: userIdFilter } : {};
    const whereDomain = domainFilter ? { domain: domainFilter } : {};

    const activities = await prisma.webActivity.findMany({
      where: {
        recordedAt: { gte: startDate.toDate(), lte: endDate.toDate() },
        ...whereUser,
        ...whereDomain,
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    // 按事件类型统计
    const eventTypeStats = activities.reduce((acc, a) => {
      acc[a.eventType] = (acc[a.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按域名统计
    const domainStats = activities.reduce((acc, a) => {
      if (!acc[a.domain]) {
        acc[a.domain] = { count: 0, duration: 0 };
      }
      acc[a.domain].count += 1;
      acc[a.domain].duration += a.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; duration: number }>);

    // 按 URL 统计
    const urlStats = activities.reduce((acc, a) => {
      if (!acc[a.url]) {
        acc[a.url] = { count: 0, duration: 0, title: a.title, domain: a.domain };
      }
      acc[a.url].count += 1;
      acc[a.url].duration += a.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; duration: number; title: string; domain: string }>);

    // 获取所有域名列表（用于筛选）
    const allDomains = await prisma.webActivity.findMany({
      where: {
        recordedAt: { gte: startDate.toDate(), lte: endDate.toDate() },
        ...whereUser,
      },
      select: { domain: true },
      distinct: ['domain'],
    });

    return {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      total: activities.length,
      eventTypeStats,
      domainStats,
      urlStats,
      domains: allDomains.map(d => d.domain).sort(),
      activities: activities.map(a => ({
        id: a.id,
        url: a.url,
        domain: a.domain,
        title: a.title,
        eventType: a.eventType,
        duration: a.duration,
        recordedAt: a.recordedAt,
      })),
    };
  });

  // 加班统计
  fastify.get('/overtime', async (request: FastifyRequest<{ Querystring: { start?: string; end?: string; userId?: string } }>) => {
    const userIdFilter = getUserIdFilter(request);
    const startDate = request.query.start
      ? dayjs(request.query.start)
      : dayjs().startOf('month');
    const endDate = request.query.end
      ? dayjs(request.query.end)
      : dayjs().endOf('month');

    const whereUser = userIdFilter ? { userId: userIdFilter } : {};

    const workHours = await prisma.workHour.findMany({
      where: {
        date: {
          gte: startDate.format('YYYY-MM-DD'),
          lte: endDate.format('YYYY-MM-DD'),
        },
        isOvertime: true,
        ...whereUser,
      },
      orderBy: [{ date: 'asc' }, { hour: 'asc' }],
    });

    const stats = calculateOvertimeStats(workHours, startDate, endDate);

    return stats;
  });
}
