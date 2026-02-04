import { TrackerConfig, DEFAULT_CONFIG } from './types.js';

/**
 * 获取配置（直接从 storage 读取）
 */
export async function getConfig(): Promise<TrackerConfig> {
  const result = await chrome.storage.local.get('config');
  return { ...DEFAULT_CONFIG, ...result.config };
}

/**
 * 保存配置
 */
export async function saveConfig(config: Partial<TrackerConfig>): Promise<void> {
  const current = await getConfig();
  await chrome.storage.local.set({ config: { ...current, ...config } });
}

/**
 * 从 URL 提取域名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * 清理 URL，只保留域名和路径（移除查询参数和 hash）
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * 检查域名是否匹配通配符模式
 */
export function matchDomain(domain: string, pattern: string): boolean {
  const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(domain);
}

/**
 * 检查域名是否应该被跟踪
 */
export function shouldTrackDomain(
  domain: string,
  whitelist: string[],
  blacklist: string[]
): boolean {
  // 如果在黑名单中，不跟踪
  for (const pattern of blacklist) {
    if (matchDomain(domain, pattern)) {
      return false;
    }
  }

  // 如果白名单为空，跟踪所有非黑名单域名
  if (whitelist.length === 0) {
    return true;
  }

  // 如果在白名单中，跟踪
  for (const pattern of whitelist) {
    if (matchDomain(domain, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * 应用脱敏规则
 */
export function sanitizeUrl(url: string, patterns: string[]): string {
  let result = url;
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'gi');
      result = result.replace(regex, '[REDACTED]');
    } catch {
      // 忽略无效的正则表达式
    }
  }
  return result;
}

/**
 * 应用脱敏规则到标题
 */
export function sanitizeTitle(title: string, patterns: string[]): string {
  let result = title;
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'gi');
      result = result.replace(regex, '[REDACTED]');
    } catch {
      // 忽略无效的正则表达式
    }
  }
  return result;
}
