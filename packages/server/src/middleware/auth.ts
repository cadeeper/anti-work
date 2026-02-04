import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db/index.js';

// JWT payload 类型
export interface JwtPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

// 扩展 FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    userUuid?: string;
    userId?: number;
  }
}

/**
 * JWT 认证中间件 - 需要登录
 */
export async function authRequired(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    request.user = request.user as JwtPayload;
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized', message: '请先登录' });
  }
}

/**
 * 管理员权限中间件
 */
export async function adminRequired(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    request.user = request.user as JwtPayload;
    
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Forbidden', message: '需要管理员权限' });
    }
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized', message: '请先登录' });
  }
}

/**
 * UUID 验证中间件 - 用于 Agent/插件上报
 */
export async function uuidRequired(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.headers['x-user-uuid'] as string;
  
  if (!uuid) {
    return reply.status(401).send({ error: 'Unauthorized', message: '缺少用户 UUID' });
  }
  
  const user = await prisma.user.findUnique({
    where: { uuid },
  });
  
  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized', message: '无效的 UUID' });
  }
  
  if (user.isDisabled) {
    return reply.status(403).send({ error: 'Forbidden', message: '用户已被禁用' });
  }
  
  request.userUuid = uuid;
  request.userId = user.id;
}

/**
 * 可选的 JWT 认证 - 用于获取当前用户（如果已登录）
 */
export async function authOptional(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    request.user = request.user as JwtPayload;
  } catch {
    // 未登录也可以继续
  }
}
