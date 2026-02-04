// 加载 .env 文件（.env 配置优先级高于 config/*.json）
import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import config from 'config';

import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { trackRoutes } from './routes/track.js';
import { statsRoutes } from './routes/stats.js';
import { configRoutes } from './routes/config.js';
import { reposRoutes } from './routes/repos.js';
import { initDatabase } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = Fastify({
  logger: true,
});

async function start() {
  try {
    // 初始化数据库
    await initDatabase();

    // 注册CORS
    await server.register(cors, {
      origin: true,
    });

    // 注册 JWT（环境变量优先）
    const jwtConfig = config.get<{ secret: string; expiresIn: string }>('jwt');
    const jwtSecret = process.env.JWT_SECRET || jwtConfig.secret;
    await server.register(fastifyJwt, {
      secret: jwtSecret,
      sign: {
        expiresIn: jwtConfig.expiresIn,
      },
    });

    // 静态文件服务 (前端构建产物)
    const webDistPath = join(__dirname, '../../web/dist');
    if (existsSync(webDistPath)) {
      await server.register(fastifyStatic, {
        root: webDistPath,
        prefix: '/',
      });
    }

    // 注册API路由
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(usersRoutes, { prefix: '/api/users' });
    await server.register(trackRoutes, { prefix: '/api/track' });
    await server.register(statsRoutes, { prefix: '/api/stats' });
    await server.register(configRoutes, { prefix: '/api/config' });
    await server.register(reposRoutes, { prefix: '/api/repos' });

    // 启动服务器（环境变量优先）
    const serverConfig = config.get<{ port: number; host: string }>('server');
    const port = parseInt(process.env.SERVER_PORT || String(serverConfig.port), 10);
    const host = process.env.SERVER_HOST || serverConfig.host;
    await server.listen({
      port,
      host,
    });

    console.log(`🚀 Anti-Work Server running at http://${host}:${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}`);
    console.log(`📡 API: http://localhost:${port}/api`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
