import Conf from 'conf';
import chalk from 'chalk';

export interface AgentConfig {
  serverUrl: string;
  userUuid: string;
  pollInterval: number;
  watchPaths: string[];
  excludePatterns: string[];
}

interface UserConfigResponse {
  watchPaths: string[];
  pollInterval: number;
  excludePatterns: string[];
  domainWhitelist: string[];
  domainBlacklist: string[];
  sanitizePatterns: string[];
  workTime: {
    start: string;
    end: string;
    lunchBreak: { start: string; end: string };
  };
}

const localConfig = new Conf<AgentConfig>({
  projectName: 'anti-work-agent',
  defaults: {
    serverUrl: 'http://localhost:3000',
    userUuid: '',
    pollInterval: 300,
    watchPaths: [],
    excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
  },
});

// 缓存的合并配置
let mergedConfig: AgentConfig | null = null;

/**
 * 从服务端获取用户配置
 */
export async function fetchUserConfig(
  serverUrl: string,
  userUuid: string
): Promise<UserConfigResponse | null> {
  if (!userUuid) {
    return null;
  }

  try {
    const response = await fetch(`${serverUrl}/api/users/${userUuid}/config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return (await response.json()) as UserConfigResponse;
    }

    if (response.status === 403) {
      console.log(chalk.red('❌ 用户已被禁用'));
    } else if (response.status === 404) {
      console.log(chalk.red('❌ 无效的 UUID'));
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 比较并打印配置变更
 */
function printConfigChanges(oldConfig: AgentConfig | null, newConfig: AgentConfig): void {
  if (!oldConfig) {
    return;
  }

  const changes: string[] = [];

  // 比较 pollInterval
  if (oldConfig.pollInterval !== newConfig.pollInterval) {
    changes.push(`  轮询间隔: ${oldConfig.pollInterval}s → ${newConfig.pollInterval}s`);
  }

  // 比较 watchPaths
  const oldPaths = JSON.stringify(oldConfig.watchPaths.sort());
  const newPaths = JSON.stringify(newConfig.watchPaths.sort());
  if (oldPaths !== newPaths) {
    changes.push(`  监控目录: ${oldConfig.watchPaths.length} 个 → ${newConfig.watchPaths.length} 个`);
    // 显示新增的路径
    const addedPaths = newConfig.watchPaths.filter((p) => !oldConfig.watchPaths.includes(p));
    const removedPaths = oldConfig.watchPaths.filter((p) => !newConfig.watchPaths.includes(p));
    addedPaths.forEach((p) => changes.push(chalk.green(`    + ${p}`)));
    removedPaths.forEach((p) => changes.push(chalk.red(`    - ${p}`)));
  }

  // 比较 excludePatterns
  const oldPatterns = JSON.stringify(oldConfig.excludePatterns.sort());
  const newPatterns = JSON.stringify(newConfig.excludePatterns.sort());
  if (oldPatterns !== newPatterns) {
    changes.push(`  排除模式: ${oldConfig.excludePatterns.join(', ')} → ${newConfig.excludePatterns.join(', ')}`);
  }

  if (changes.length > 0) {
    console.log(chalk.cyan('📝 配置变更:'));
    changes.forEach((c) => console.log(c));
  }
}

/**
 * 同步从服务端获取配置并合并
 */
export async function syncConfigFromServer(): Promise<{
  success: boolean;
  source: 'server' | 'local';
  hasChanges: boolean;
}> {
  const local = getLocalConfig();
  const previousConfig = mergedConfig ? { ...mergedConfig } : null;

  if (!local.userUuid) {
    console.log(chalk.yellow('⚠️ 未配置用户 UUID，使用本地配置'));
    mergedConfig = local;
    return { success: false, source: 'local', hasChanges: false };
  }

  const serverConfig = await fetchUserConfig(local.serverUrl, local.userUuid);

  if (serverConfig) {
    // 服务端配置完全覆盖本地配置
    // watchPaths: 使用服务端配置（空则不监控）
    const serverWatchPaths = serverConfig.watchPaths || [];

    // 调试：打印服务端返回的原始 watchPaths
    console.log(chalk.gray(`  服务端 watchPaths: ${JSON.stringify(serverWatchPaths)}`));

    const newConfig: AgentConfig = {
      serverUrl: local.serverUrl,
      userUuid: local.userUuid,
      pollInterval: serverConfig.pollInterval || local.pollInterval,
      watchPaths: serverWatchPaths,
      excludePatterns: serverConfig.excludePatterns?.length > 0 
        ? serverConfig.excludePatterns 
        : local.excludePatterns,
    };

    // 打印变更
    printConfigChanges(previousConfig, newConfig);

    mergedConfig = newConfig;
    console.log(chalk.green('✓ 已从服务端同步配置'));
    
    // 打印最终使用的监控目录
    if (newConfig.watchPaths.length > 0) {
      console.log(chalk.gray('  监控目录:'));
      newConfig.watchPaths.forEach((p) => console.log(chalk.gray(`    - ${p}`)));
    } else {
      console.log(chalk.yellow('  监控目录: (空)'));
    }
    
    const hasChanges = previousConfig ? JSON.stringify(previousConfig) !== JSON.stringify(newConfig) : true;
    return { success: true, source: 'server', hasChanges };
  }

  // 使用本地配置
  mergedConfig = local;
  console.log(chalk.yellow('⚠️ 无法连接服务端，使用本地配置'));
  return { success: false, source: 'local', hasChanges: false };
}

/**
 * 获取本地配置
 */
export function getLocalConfig(): AgentConfig {
  return {
    serverUrl: localConfig.get('serverUrl'),
    userUuid: localConfig.get('userUuid'),
    pollInterval: localConfig.get('pollInterval'),
    watchPaths: localConfig.get('watchPaths'),
    excludePatterns: localConfig.get('excludePatterns'),
  };
}

/**
 * 获取配置（优先使用合并后的配置）
 */
export function getConfig(): AgentConfig {
  return mergedConfig || getLocalConfig();
}

/**
 * 设置本地配置
 */
export function setConfig<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]): void {
  localConfig.set(key, value);
  // 清除缓存，下次获取时重新合并
  mergedConfig = null;
}

/**
 * 显示配置
 */
export function showConfig(): void {
  const cfg = getConfig();
  const source = mergedConfig ? '(已同步)' : '(本地)';
  console.log(chalk.bold(`\n📋 当前配置 ${source}:\n`));
  console.log(chalk.gray(`  服务器地址: ${chalk.white(cfg.serverUrl)}`));
  console.log(chalk.gray(`  用户 UUID: ${chalk.white(cfg.userUuid || '(未配置)')}`));
  console.log(chalk.gray(`  轮询间隔: ${chalk.white(cfg.pollInterval + '秒')}`));
  console.log(chalk.gray(`  监控目录:`));
  if (cfg.watchPaths.length === 0) {
    console.log(chalk.yellow('    (未配置)'));
  } else {
    cfg.watchPaths.forEach((p) => {
      console.log(chalk.white(`    - ${p}`));
    });
  }
  console.log(chalk.gray(`  排除模式: ${cfg.excludePatterns.join(', ')}`));
  console.log('');
}
