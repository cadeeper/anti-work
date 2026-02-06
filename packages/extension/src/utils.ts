import { TrackerConfig, SensitiveConfig, DEFAULT_CONFIG } from './types.js';

/**
 * 获取配置（直接从 storage 读取）
 * 普通配置从 local storage 读取，敏感信息从 session storage 读取
 */
export async function getConfig(): Promise<TrackerConfig> {
  const [localResult, sessionResult] = await Promise.all([
    chrome.storage.local.get('config'),
    chrome.storage.session.get('sensitive'),
  ]);
  
  const localConfig = { ...DEFAULT_CONFIG, ...localResult.config };
  const sensitiveConfig = sessionResult.sensitive as SensitiveConfig | undefined;
  
  // 合并敏感信息
  if (sensitiveConfig?.userUuid) {
    localConfig.userUuid = sensitiveConfig.userUuid;
  }
  
  return localConfig;
}

/**
 * 保存配置
 * 敏感信息（userUuid）存储到 session storage，其他存储到 local storage
 */
export async function saveConfig(config: Partial<TrackerConfig>): Promise<void> {
  const current = await getConfig();
  
  // 分离敏感信息
  const { userUuid, ...nonSensitiveConfig } = config;
  
  // 保存非敏感配置到 local storage
  const newLocalConfig = { ...current, ...nonSensitiveConfig };
  delete (newLocalConfig as Partial<TrackerConfig>).userUuid; // 不在 local 中存储 uuid
  await chrome.storage.local.set({ config: newLocalConfig });
  
  // 保存敏感信息到 session storage
  if (userUuid !== undefined) {
    await chrome.storage.session.set({ sensitive: { userUuid } });
  }
}

/**
 * 获取敏感配置（仅从 session storage）
 */
export async function getSensitiveConfig(): Promise<SensitiveConfig | null> {
  const result = await chrome.storage.session.get('sensitive');
  return result.sensitive || null;
}

/**
 * 保存敏感配置到 session storage
 */
export async function saveSensitiveConfig(config: SensitiveConfig): Promise<void> {
  await chrome.storage.session.set({ sensitive: config });
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
