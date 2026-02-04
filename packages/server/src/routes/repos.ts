import { FastifyInstance, FastifyRequest } from 'fastify';
import dayjs from 'dayjs';
import { prisma } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

/**
 * 获取用户 ID 过滤条件
 */
function getUserIdFilter(request: FastifyRequest<{ Querystring: { userId?: string } }>): number | undefined {
  const { userId: queryUserId } = request.query;
  const user = request.user!;

  if (user.isAdmin) {
    return queryUserId ? parseInt(queryUserId) : undefined;
  } else {
    return user.userId;
  }
}

export async function reposRoutes(fastify: FastifyInstance) {
  // 所有接口需要登录
  fastify.addHook('preHandler', authRequired);

  // 获取所有仓库列表
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { userId?: string } }>) => {
    const userIdFilter = getUserIdFilter(request);
    const whereUser = userIdFilter ? { userId: userIdFilter } : {};

    const repos = await prisma.codeChange.groupBy({
      by: ['repoName', 'repoPath'],
      where: whereUser,
      _sum: {
        linesAdded: true,
        linesDeleted: true,
        filesChanged: true,
      },
      _count: true,
    });

    return repos.map((repo) => ({
      name: repo.repoName,
      path: repo.repoPath,
      totalLinesAdded: repo._sum.linesAdded || 0,
      totalLinesDeleted: repo._sum.linesDeleted || 0,
      totalFilesChanged: repo._sum.filesChanged || 0,
      changeCount: repo._count,
    }));
  });

  // 获取单个仓库统计
  fastify.get('/:name', async (request: FastifyRequest<{ Params: { name: string }; Querystring: { days?: string; userId?: string } }>) => {
    const { name } = request.params;
    const days = parseInt(request.query.days || '30');
    const startDate = dayjs().subtract(days, 'day').startOf('day').toDate();

    const userIdFilter = getUserIdFilter(request);
    const whereUser = userIdFilter ? { userId: userIdFilter } : {};

    const changes = await prisma.codeChange.findMany({
      where: {
        repoName: name,
        recordedAt: { gte: startDate },
        ...whereUser,
      },
      orderBy: { recordedAt: 'desc' },
    });

    // 按日期聚合
    const dailyStats = changes.reduce((acc, change) => {
      const date = dayjs(change.recordedAt).format('YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = { linesAdded: 0, linesDeleted: 0, filesChanged: 0, count: 0 };
      }
      acc[date].linesAdded += change.linesAdded;
      acc[date].linesDeleted += change.linesDeleted;
      acc[date].filesChanged += change.filesChanged;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { linesAdded: number; linesDeleted: number; filesChanged: number; count: number }>);

    // 按分支聚合
    const branchStats = changes.reduce((acc, change) => {
      if (!acc[change.branch]) {
        acc[change.branch] = { linesAdded: 0, linesDeleted: 0, count: 0 };
      }
      acc[change.branch].linesAdded += change.linesAdded;
      acc[change.branch].linesDeleted += change.linesDeleted;
      acc[change.branch].count += 1;
      return acc;
    }, {} as Record<string, { linesAdded: number; linesDeleted: number; count: number }>);

    return {
      name,
      period: { start: startDate, end: new Date() },
      totalChanges: changes.length,
      totalLinesAdded: changes.reduce((sum, c) => sum + c.linesAdded, 0),
      totalLinesDeleted: changes.reduce((sum, c) => sum + c.linesDeleted, 0),
      dailyStats,
      branchStats,
    };
  });
}
