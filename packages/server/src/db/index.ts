import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export const prisma = new PrismaClient();

export async function initDatabase() {
  // 确保数据目录存在 (从环境变量获取数据库路径)
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:')) {
    const dbPath = dbUrl.replace('file:', '').replace('./', '');
    const dbDir = dirname(dbPath);
    if (dbDir && !existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
  }

  // 连接数据库
  await prisma.$connect();
  console.log('📦 Database connected');
}

export async function closeDatabase() {
  await prisma.$disconnect();
}
