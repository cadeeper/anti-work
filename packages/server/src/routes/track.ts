import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { updateWorkHour } from '../services/workHour.js';
import { uuidRequired } from '../middleware/auth.js';

// 代码变更上报 Schema
const codeChangeSchema = z.object({
  repoPath: z.string(),
  repoName: z.string(),
  branch: z.string(),
  linesAdded: z.number().int().min(0),
  linesDeleted: z.number().int().min(0),
  filesChanged: z.number().int().min(0),
  isCommitted: z.boolean(),
  commitHash: z.string().optional(),
  recordedAt: z.string().datetime().optional(),
});

// 网站活动上报 Schema
const webActivitySchema = z.object({
  url: z.string(),
  domain: z.string(),
  title: z.string(),
  eventType: z.enum(['pageview', 'click', 'scroll', 'input', 'focus']),
  duration: z.number().int().min(0).optional(),
  recordedAt: z.string().datetime().optional(),
});

// 批量上报 Schema
const batchWebActivitySchema = z.object({
  activities: z.array(webActivitySchema),
});

export async function trackRoutes(fastify: FastifyInstance) {
  // 上报代码变更 (需要 UUID)
  fastify.post('/code', { preHandler: [uuidRequired] }, async (request: FastifyRequest, reply) => {
    try {
      const body = codeChangeSchema.parse(request.body);
      const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();
      const userId = request.userId!;

      const codeChange = await prisma.codeChange.create({
        data: {
          userId,
          repoPath: body.repoPath,
          repoName: body.repoName,
          branch: body.branch,
          linesAdded: body.linesAdded,
          linesDeleted: body.linesDeleted,
          filesChanged: body.filesChanged,
          isCommitted: body.isCommitted,
          commitHash: body.commitHash,
          recordedAt,
        },
      });

      // 更新工作时段
      await updateWorkHour(userId, recordedAt, 'code');

      return { success: true, id: codeChange.id };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body', details: error.errors });
      }
      throw error;
    }
  });

  // 上报网站活动 (需要 UUID)
  fastify.post('/web', { preHandler: [uuidRequired] }, async (request: FastifyRequest, reply) => {
    try {
      const body = webActivitySchema.parse(request.body);
      const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();
      const userId = request.userId!;

      const webActivity = await prisma.webActivity.create({
        data: {
          userId,
          url: body.url,
          domain: body.domain,
          title: body.title,
          eventType: body.eventType,
          duration: body.duration,
          recordedAt,
        },
      });

      // 更新工作时段
      await updateWorkHour(userId, recordedAt, 'web');

      return { success: true, id: webActivity.id };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body', details: error.errors });
      }
      throw error;
    }
  });

  // 批量上报网站活动 (需要 UUID)
  fastify.post('/web/batch', { preHandler: [uuidRequired] }, async (request: FastifyRequest, reply) => {
    try {
      const body = batchWebActivitySchema.parse(request.body);
      const userId = request.userId!;
      
      const results = await Promise.all(
        body.activities.map(async (activity) => {
          const recordedAt = activity.recordedAt ? new Date(activity.recordedAt) : new Date();
          
          const webActivity = await prisma.webActivity.create({
            data: {
              userId,
              url: activity.url,
              domain: activity.domain,
              title: activity.title,
              eventType: activity.eventType,
              duration: activity.duration,
              recordedAt,
            },
          });

          await updateWorkHour(userId, recordedAt, 'web');
          return webActivity.id;
        })
      );

      return { success: true, ids: results };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body', details: error.errors });
      }
      throw error;
    }
  });
}
