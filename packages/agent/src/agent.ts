import cron from 'node-cron';
import chalk from 'chalk';
import { getConfig, syncConfigFromServer } from './config.js';
import { scanRepositories } from './scanner.js';

let cronJob: cron.ScheduledTask | null = null;
let configSyncJob: cron.ScheduledTask | null = null;
let isRunning = false;

/**
 * 启动 Agent
 */
export async function startAgent(): Promise<void> {
  if (isRunning) {
    console.log(chalk.yellow('Agent 已在运行中'));
    return;
  }

  isRunning = true;

  // 首次启动时从服务端同步配置
  const syncResult = await syncConfigFromServer();

  if (!syncResult.success) {
    console.log(chalk.yellow('⚠️  配置同步失败，请检查 UUID 是否正确'));
  }

  const config = getConfig();

  // 检查 UUID
  if (!config.userUuid) {
    console.log(chalk.red('❌ 未配置用户 UUID'));
    console.log(chalk.gray('   请使用 --uuid 参数指定 UUID'));
    process.exit(1);
  }

  // 检查监控目录
  if (!config.watchPaths || config.watchPaths.length === 0) {
    console.log(chalk.yellow('⚠️  监控目录为空，请在服务端配置监控目录'));
    console.log(chalk.gray('   Agent 将等待服务端配置更新（每小时同步一次）\n'));
  }

  // 计算 cron 表达式
  const intervalMinutes = Math.max(1, Math.floor(config.pollInterval / 60));
  const cronExpression = `*/${intervalMinutes} * * * *`;

  console.log(chalk.green(`✓ Agent 已启动，每 ${intervalMinutes} 分钟扫描一次\n`));

  // 立即执行一次
  await runScan();

  // 设置扫描定时任务
  cronJob = cron.schedule(cronExpression, async () => {
    await runScan();
  });

  // 每小时同步一次服务端配置
  configSyncJob = cron.schedule('0 * * * *', async () => {
    console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] 同步服务端配置...`));
    const result = await syncConfigFromServer();
    if (result.hasChanges) {
      console.log(chalk.cyan('ℹ️  配置已更新，新配置将在下次扫描时生效'));
    }
  });

  // 保持进程运行
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n正在停止 Agent...'));
    stopAgent();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    stopAgent();
    process.exit(0);
  });
}

/**
 * 执行扫描
 */
async function runScan(): Promise<void> {
  const config = getConfig();
  const now = new Date();

  // 检查监控目录
  if (!config.watchPaths || config.watchPaths.length === 0) {
    console.log(chalk.gray(`[${now.toLocaleTimeString()}] 跳过扫描（监控目录为空）`));
    return;
  }

  console.log(chalk.gray(`[${now.toLocaleTimeString()}] 开始扫描...`));

  try {
    const results = await scanRepositories();

    if (results.length > 0) {
      console.log(chalk.green(`✓ 发现 ${results.length} 个变更，正在上报...`));

      let successCount = 0;
      let failCount = 0;

      for (const change of results) {
        try {
          const response = await fetch(`${config.serverUrl}/api/track/code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-UUID': config.userUuid,
            },
            body: JSON.stringify({
              ...change,
              recordedAt: new Date().toISOString(),
            }),
          });

          if (response.ok) {
            successCount++;
            console.log(
              chalk.gray(
                `  📦 ${change.repoName} [${change.branch}] +${change.linesAdded}/-${change.linesDeleted}`
              )
            );
          } else {
            failCount++;
            if (response.status === 401) {
              console.log(chalk.red('❌ UUID 无效或用户已被禁用'));
            }
          }
        } catch (error) {
          failCount++;
        }
      }

      if (failCount > 0) {
        console.log(chalk.yellow(`⚠️  ${failCount} 个变更上报失败`));
      }
    } else {
      console.log(chalk.gray(`  无变更`));
    }
  } catch (error) {
    console.error(chalk.red('扫描出错:'), error);
  }
}

/**
 * 停止 Agent
 */
export function stopAgent(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  if (configSyncJob) {
    configSyncJob.stop();
    configSyncJob = null;
  }
  isRunning = false;
}
