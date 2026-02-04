import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

/**
 * 交互式输入
 */
function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * 隐藏输入密码
 */
async function questionPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // 关闭回显
    if (process.stdin.isTTY) {
      process.stdout.write(query);
      
      let password = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        const c = char.toString();
        
        switch (c) {
          case '\n':
          case '\r':
          case '\u0004':
            // Enter pressed
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            rl.close();
            console.log('');
            resolve(password);
            break;
          case '\u0003':
            // Ctrl+C
            process.exit();
            break;
          case '\u007F':
            // Backspace
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(query + '*'.repeat(password.length));
            break;
          default:
            password += c;
            process.stdout.write('*');
            break;
        }
      };

      process.stdin.on('data', onData);
    } else {
      // 非 TTY 环境，直接读取
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function main() {
  console.log('\n🔧 Anti-Work 数据库初始化\n');

  // 检查是否已存在管理员
  const adminExists = await prisma.user.findFirst({
    where: { isAdmin: true },
  });

  if (adminExists) {
    console.log('✓ 管理员账号已存在，跳过初始化');
    console.log(`  用户名: ${adminExists.username}`);
    console.log(`  UUID: ${adminExists.uuid}\n`);
    return;
  }

  const rl = createPrompt();

  try {
    // 获取用户名
    const username = (await question(rl, '请输入管理员用户名 (默认 admin): ')).trim() || 'admin';

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      console.log(`❌ 用户名 "${username}" 已存在`);
      rl.close();
      process.exit(1);
    }

    rl.close();

    // 获取密码
    let password = '';
    while (password.length < 8) {
      password = await questionPassword('请输入管理员密码 (至少8位): ');
      if (password.length < 8) {
        console.log('❌ 密码长度至少8位，请重新输入\n');
      }
    }

    // 确认密码
    const confirmPassword = await questionPassword('请再次输入密码确认: ');
    if (password !== confirmPassword) {
      console.log('\n❌ 两次密码不一致，请重新运行初始化');
      process.exit(1);
    }

    // 创建管理员
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        isAdmin: true,
        config: {
          create: {}, // 创建默认配置
        },
      },
    });

    console.log('\n✅ 管理员账号创建成功!');
    console.log(`   用户名: ${admin.username}`);
    console.log(`   UUID: ${admin.uuid}`);
    console.log('\n💡 UUID 用于 Agent/插件上报数据，请妥善保管\n');
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
