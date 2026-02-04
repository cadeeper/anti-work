import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

// 登录 Schema
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

// 修改密码 Schema
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(8, '新密码至少8位'),
});

// 初始化管理员 Schema
const setupSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名最多50位'),
  password: z.string().min(8, '密码至少8位').max(100, '密码最多100位'),
});

export async function authRoutes(fastify: FastifyInstance) {
  // 检查系统是否已初始化（是否存在管理员账号）
  fastify.get('/status', async () => {
    const adminExists = await prisma.user.findFirst({
      where: { isAdmin: true },
    });
    
    return {
      initialized: !!adminExists,
    };
  });

  // 初始化管理员账号（仅在系统未初始化时可用）
  fastify.post('/setup', async (request: FastifyRequest, reply) => {
    try {
      // 检查是否已有管理员
      const adminExists = await prisma.user.findFirst({
        where: { isAdmin: true },
      });
      
      if (adminExists) {
        return reply.status(400).send({ error: '系统已初始化，无法重复设置' });
      }
      
      const body = setupSchema.parse(request.body);
      
      // 检查用户名是否已存在
      const userExists = await prisma.user.findUnique({
        where: { username: body.username },
      });
      
      if (userExists) {
        return reply.status(400).send({ error: '用户名已存在' });
      }
      
      // 创建管理员账号
      const hashedPassword = await bcrypt.hash(body.password, 10);
      const admin = await prisma.user.create({
        data: {
          username: body.username,
          password: hashedPassword,
          isAdmin: true,
          config: {
            create: {}, // 创建默认配置
          },
        },
      });
      
      // 生成 JWT
      const token = fastify.jwt.sign({
        userId: admin.id,
        username: admin.username,
        isAdmin: admin.isAdmin,
      });
      
      return {
        success: true,
        message: '管理员账号创建成功',
        token,
        user: {
          id: admin.id,
          uuid: admin.uuid,
          username: admin.username,
          isAdmin: admin.isAdmin,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  });

  // 登录
  fastify.post('/login', async (request: FastifyRequest, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      
      const user = await prisma.user.findUnique({
        where: { username: body.username },
      });
      
      if (!user) {
        return reply.status(401).send({ error: '用户名或密码错误' });
      }
      
      if (user.isDisabled) {
        return reply.status(403).send({ error: '用户已被禁用' });
      }
      
      const validPassword = await bcrypt.compare(body.password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ error: '用户名或密码错误' });
      }
      
      // 生成 JWT
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  });

  // 获取当前用户信息
  fastify.get('/me', { preHandler: [authRequired] }, async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { config: true },
    });
    
    if (!user) {
      return { error: '用户不存在' };
    }
    
    return {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      config: user.config ? {
        pollInterval: user.config.pollInterval,
        excludePatterns: JSON.parse(user.config.excludePatterns),
        domainWhitelist: JSON.parse(user.config.domainWhitelist),
        domainBlacklist: JSON.parse(user.config.domainBlacklist),
        sanitizePatterns: JSON.parse(user.config.sanitizePatterns),
        workTimeStart: user.config.workTimeStart,
        workTimeEnd: user.config.workTimeEnd,
        lunchStart: user.config.lunchStart,
        lunchEnd: user.config.lunchEnd,
      } : null,
    };
  });

  // 修改密码
  fastify.put('/password', { preHandler: [authRequired] }, async (request: FastifyRequest, reply) => {
    try {
      const body = changePasswordSchema.parse(request.body);
      
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
      });
      
      if (!user) {
        return reply.status(404).send({ error: '用户不存在' });
      }
      
      const validPassword = await bcrypt.compare(body.oldPassword, user.password);
      if (!validPassword) {
        return reply.status(400).send({ error: '旧密码错误' });
      }
      
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      
      return { success: true, message: '密码修改成功' };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      throw error;
    }
  });
}
