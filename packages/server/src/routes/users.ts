import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/index.js';
import { adminRequired } from '../middleware/auth.js';

// 创建用户 Schema
const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3位').max(50, '用户名最多50位'),
  password: z.string().min(8, '密码至少8位'),
});

// 更新用户 Schema
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).optional(),
});

export async function usersRoutes(fastify: FastifyInstance) {
  // 获取所有用户
  fastify.get('/', { preHandler: [adminRequired] }, async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        uuid: true,
        username: true,
        isAdmin: true,
        isDisabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            codeChanges: true,
            webActivities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return users.map((user) => ({
      ...user,
      codeChangesCount: user._count.codeChanges,
      webActivitiesCount: user._count.webActivities,
      _count: undefined,
    }));
  });

  // 获取单个用户
  fastify.get('/:id', { preHandler: [adminRequired] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = parseInt(request.params.id);
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: { config: true },
    });
    
    if (!user) {
      return reply.status(404).send({ error: '用户不存在' });
    }
    
    return {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      isAdmin: user.isAdmin,
      isDisabled: user.isDisabled,
      createdAt: user.createdAt,
      config: user.config,
    };
  });

  // 创建用户
  fastify.post('/', { preHandler: [adminRequired] }, async (request: FastifyRequest, reply) => {
    try {
      const body = createUserSchema.parse(request.body);
      
      // 检查用户名是否已存在
      const existing = await prisma.user.findUnique({
        where: { username: body.username },
      });
      
      if (existing) {
        return reply.status(400).send({ error: '用户名已存在' });
      }
      
      const hashedPassword = await bcrypt.hash(body.password, 10);
      
      const user = await prisma.user.create({
        data: {
          username: body.username,
          password: hashedPassword,
          isAdmin: false,
          config: {
            create: {}, // 创建默认配置
          },
        },
        include: { config: true },
      });
      
      return {
        success: true,
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          isAdmin: user.isAdmin,
          isDisabled: user.isDisabled,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  });

  // 更新用户
  fastify.put('/:id', { preHandler: [adminRequired] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    try {
      const id = parseInt(request.params.id);
      const body = updateUserSchema.parse(request.body);
      
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: '用户不存在' });
      }
      
      // 不能修改管理员
      if (user.isAdmin) {
        return reply.status(403).send({ error: '不能修改管理员账号' });
      }
      
      const updateData: { username?: string; password?: string } = {};
      
      if (body.username && body.username !== user.username) {
        // 检查用户名是否已存在
        const existing = await prisma.user.findUnique({
          where: { username: body.username },
        });
        if (existing) {
          return reply.status(400).send({ error: '用户名已存在' });
        }
        updateData.username = body.username;
      }
      
      if (body.password) {
        updateData.password = await bcrypt.hash(body.password, 10);
      }
      
      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
      });
      
      return {
        success: true,
        user: {
          id: updated.id,
          uuid: updated.uuid,
          username: updated.username,
          isAdmin: updated.isAdmin,
          isDisabled: updated.isDisabled,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  });

  // 禁用/启用用户
  fastify.put('/:id/disable', { preHandler: [adminRequired] }, async (request: FastifyRequest<{ Params: { id: string }; Body: { disabled: boolean } }>, reply) => {
    const id = parseInt(request.params.id);
    const { disabled } = request.body as { disabled: boolean };
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: '用户不存在' });
    }
    
    // 不能禁用管理员
    if (user.isAdmin) {
      return reply.status(403).send({ error: '不能禁用管理员账号' });
    }
    
    const updated = await prisma.user.update({
      where: { id },
      data: { isDisabled: disabled },
    });
    
    return {
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        isDisabled: updated.isDisabled,
      },
    };
  });

  // 删除用户
  fastify.delete('/:id', { preHandler: [adminRequired] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = parseInt(request.params.id);
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: '用户不存在' });
    }
    
    // 不能删除管理员
    if (user.isAdmin) {
      return reply.status(403).send({ error: '不能删除管理员账号' });
    }
    
    await prisma.user.delete({ where: { id } });
    
    return { success: true, message: '用户已删除' };
  });

  // 根据 UUID 获取用户配置（Agent/插件用）
  fastify.get('/:uuid/config', async (request: FastifyRequest<{ Params: { uuid: string } }>, reply) => {
    const { uuid } = request.params;
    
    const user = await prisma.user.findUnique({
      where: { uuid },
      include: { config: true },
    });
    
    if (!user) {
      return reply.status(404).send({ error: '用户不存在' });
    }
    
    if (user.isDisabled) {
      return reply.status(403).send({ error: '用户已被禁用' });
    }
    
    // 如果没有用户配置，创建默认配置
    let config = user.config;
    if (!config) {
      config = await prisma.userConfig.create({
        data: { userId: user.id },
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
}
