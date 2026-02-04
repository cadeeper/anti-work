import { WebActivity, DEFAULT_CONFIG, TrackerConfig } from './types.js';
import { extractDomain, cleanUrl, shouldTrackDomain, sanitizeUrl, sanitizeTitle } from './utils.js';

// 活动队列，用于批量上报
let activityQueue: WebActivity[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// 页面停留时间追踪
const pageStartTimes: Map<number, { url: string; startTime: number }> = new Map();

// 缓存的配置（已合并服务端配置）
let cachedConfig: TrackerConfig | null = null;
let lastConfigSync = 0;
const CONFIG_SYNC_INTERVAL = 3600000; // 1小时同步一次

/**
 * 从服务端获取用户配置
 */
async function fetchServerConfig(serverUrl: string, userUuid: string): Promise<Partial<TrackerConfig> | null> {
  if (!userUuid || !serverUrl) return null;

  try {
    const response = await fetch(`${serverUrl}/api/users/${userUuid}/config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        domainWhitelist: data.domainWhitelist || [],
        domainBlacklist: data.domainBlacklist || [],
        sanitizePatterns: data.sanitizePatterns || [],
      };
    }
  } catch (e) {
    console.error('Failed to fetch server config:', e);
  }
  return null;
}

/**
 * 获取配置（带服务端同步）
 */
async function getConfig(): Promise<TrackerConfig> {
  const now = Date.now();
  
  // 如果缓存有效且未过期，直接返回
  if (cachedConfig && now - lastConfigSync < CONFIG_SYNC_INTERVAL) {
    return cachedConfig;
  }

  // 获取本地配置
  const result = await chrome.storage.local.get('config');
  const localConfig: TrackerConfig = { ...DEFAULT_CONFIG, ...result.config };

  // 尝试从服务端同步配置
  if (localConfig.userUuid && localConfig.serverUrl) {
    const serverConfig = await fetchServerConfig(localConfig.serverUrl, localConfig.userUuid);
    if (serverConfig) {
      cachedConfig = {
        ...localConfig,
        domainWhitelist: serverConfig.domainWhitelist || localConfig.domainWhitelist,
        domainBlacklist: serverConfig.domainBlacklist || localConfig.domainBlacklist,
        sanitizePatterns: serverConfig.sanitizePatterns || localConfig.sanitizePatterns,
      };
      lastConfigSync = now;
      console.log('Config synced from server:', {
        whitelist: cachedConfig.domainWhitelist,
        blacklist: cachedConfig.domainBlacklist,
      });
      return cachedConfig;
    }
  }

  cachedConfig = localConfig;
  lastConfigSync = now;
  return cachedConfig;
}

/**
 * 清除配置缓存（强制下次重新同步）
 */
function clearConfigCache(): void {
  cachedConfig = null;
  lastConfigSync = 0;
}

/**
 * 上报活动到服务器
 */
async function flushActivities(): Promise<void> {
  if (activityQueue.length === 0) return;

  const config = await getConfig();
  if (!config.enabled) {
    activityQueue = [];
    return;
  }

  if (!config.userUuid) {
    console.warn('User UUID not configured, skipping activity report');
    return;
  }

  const activities = [...activityQueue];
  activityQueue = [];

  try {
    const response = await fetch(`${config.serverUrl}/api/track/web/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-UUID': config.userUuid,
      },
      body: JSON.stringify({ activities }),
    });

    if (!response.ok) {
      console.error('Failed to report activities:', response.status, response.statusText);
      if (response.status === 401 || response.status === 403) {
        console.error('Invalid UUID or user disabled');
      } else {
        activityQueue = [...activities, ...activityQueue].slice(0, 100);
      }
    } else {
      console.log(`Reported ${activities.length} activities`);
    }
  } catch (error) {
    console.error('Error reporting activities:', error);
    activityQueue = [...activities, ...activityQueue].slice(0, 100);
  }
}

/**
 * 添加活动到队列
 */
async function queueActivity(activity: Omit<WebActivity, 'recordedAt'>): Promise<void> {
  const config = await getConfig();
  if (!config.enabled) return;
  if (!config.userUuid) return;

  const domain = extractDomain(activity.url);
  if (!domain) return;

  // 检查域名白名单/黑名单
  if (!shouldTrackDomain(domain, config.domainWhitelist, config.domainBlacklist)) {
    console.log(`Domain ${domain} not in whitelist, skipping`);
    return;
  }

  // 清理 URL（移除参数）并应用脱敏规则
  const sanitizedActivity: WebActivity = {
    ...activity,
    url: sanitizeUrl(cleanUrl(activity.url), config.sanitizePatterns),
    title: sanitizeTitle(activity.title, config.sanitizePatterns),
    domain,
    recordedAt: new Date().toISOString(),
  };

  activityQueue.push(sanitizedActivity);
  console.log(`Queued activity: ${domain}`);

  // 设置延迟刷新（5秒后批量上报）
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(flushActivities, 5000);

  // 队列超过 50 条时立即上报
  if (activityQueue.length >= 50) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flushActivities();
  }
}

/**
 * 记录页面停留时间
 */
function recordPageDuration(tabId: number): void {
  const pageInfo = pageStartTimes.get(tabId);
  if (pageInfo) {
    const duration = Math.floor((Date.now() - pageInfo.startTime) / 1000);
    if (duration > 0) {
      queueActivity({
        url: pageInfo.url,
        domain: extractDomain(pageInfo.url),
        title: '',
        eventType: 'pageview',
        duration,
      });
    }
    pageStartTimes.delete(tabId);
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    recordPageDuration(tabId);

    pageStartTimes.set(tabId, {
      url: tab.url,
      startTime: Date.now(),
    });

    queueActivity({
      url: tab.url,
      domain: extractDomain(tab.url),
      title: tab.title || '',
      eventType: 'pageview',
    });
  }
});

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  recordPageDuration(tabId);
});

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  for (const [tabId] of pageStartTimes) {
    if (tabId !== activeInfo.tabId) {
      recordPageDuration(tabId);
    }
  }

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !tab.url.startsWith('chrome://')) {
      pageStartTimes.set(activeInfo.tabId, {
        url: tab.url,
        startTime: Date.now(),
      });
    }
  } catch {
    // 标签页可能已关闭
  }
});

// 接收消息
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'TRACK_EVENT' && sender.tab?.url) {
    queueActivity({
      url: sender.tab.url,
      domain: extractDomain(sender.tab.url),
      title: sender.tab.title || '',
      eventType: message.eventType,
    });
  }

  if (message.type === 'CONFIG_UPDATED') {
    clearConfigCache();
    console.log('Config cache cleared, will re-sync from server');
  }
});

// 定期刷新队列
setInterval(flushActivities, 30000);

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('config');
  if (!result.config) {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG });
  }
  console.log('Anti-Work Tracker installed');
});

// 监听 storage 变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.config) {
    clearConfigCache();
    console.log('Config updated from storage, will re-sync from server');
  }
});
