import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

// 更新配置 Schema
const updateConfigSchema = z.object({
  watchPaths: z.array(z.string()).optional(),
  pollInterval: z.number().int().min(60).optional(),
  excludePatterns: z.array(z.string()).optional(),
  domainWhitelist: z.array(z.string()).optional(),
  domainBlacklist: z.array(z.string()).optional(),
  sanitizePatterns: z.array(z.string()).optional(),
  workTimeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workTimeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lunchStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lunchEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function configRoutes(fastify: FastifyInstance) {
  // 获取自己的配置 (需要登录)
  fastify.get('/me', { preHandler: [authRequired] }, async (request: FastifyRequest) => {
    const userId = request.user!.userId;

    let config = await prisma.userConfig.findUnique({
      where: { userId },
    });

    // 如果没有配置，创建默认配置
    if (!config) {
      config = await prisma.userConfig.create({
        data: { userId },
      });
    }

    return {
      watchPaths: JSON.parse(config.watchPaths),
      pollInterval: config.pollInterval,
      excludePatterns: JSON.parse(config.excludePatterns),
      domainWhitelist: JSON.parse(config.domainWhitelist),
      domainBlacklist: JSON.parse(config.domainBlacklist),
      sanitizePatterns: JSON.parse(config.sanitizePatterns),
      workTime: {
        start: config.workTimeStart,
        end: config.workTimeEnd,
        lunchBreak: {
          start: config.lunchStart,
          end: config.lunchEnd,
        },
      },
    };
  });

  // 更新自己的配置 (需要登录)
  fastify.put('/me', { preHandler: [authRequired] }, async (request: FastifyRequest, reply) => {
    try {
      const userId = request.user!.userId;
      const body = updateConfigSchema.parse(request.body);

      const updateData: Record<string, unknown> = {};

      if (body.watchPaths !== undefined) {
        updateData.watchPaths = JSON.stringify(body.watchPaths);
      }
      if (body.pollInterval !== undefined) {
        updateData.pollInterval = body.pollInterval;
      }
      if (body.excludePatterns !== undefined) {
        updateData.excludePatterns = JSON.stringify(body.excludePatterns);
      }
      if (body.domainWhitelist !== undefined) {
        updateData.domainWhitelist = JSON.stringify(body.domainWhitelist);
      }
      if (body.domainBlacklist !== undefined) {
        updateData.domainBlacklist = JSON.stringify(body.domainBlacklist);
      }
      if (body.sanitizePatterns !== undefined) {
        updateData.sanitizePatterns = JSON.stringify(body.sanitizePatterns);
      }
      if (body.workTimeStart !== undefined) {
        updateData.workTimeStart = body.workTimeStart;
      }
      if (body.workTimeEnd !== undefined) {
        updateData.workTimeEnd = body.workTimeEnd;
      }
      if (body.lunchStart !== undefined) {
        updateData.lunchStart = body.lunchStart;
      }
      if (body.lunchEnd !== undefined) {
        updateData.lunchEnd = body.lunchEnd;
      }

      await prisma.userConfig.upsert({
        where: { userId },
        update: updateData,
        create: { userId, ...updateData },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body', details: error.errors });
      }
      throw error;
    }
  });

  // 获取全局配置 (公开，用于 Agent/插件获取基础信息)
  fastify.get('/', async () => {
    return {
      version: '1.0.0',
      features: {
        codeTracker: true,
        webTracker: true,
      },
    };
  });
}
