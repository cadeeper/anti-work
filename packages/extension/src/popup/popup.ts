import { DEFAULT_CONFIG, TrackerConfig, SensitiveConfig } from '../types.js';

const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
const serverStatus = document.getElementById('serverStatus') as HTMLSpanElement;
const serverUrl = document.getElementById('serverUrl') as HTMLInputElement;
const userUuid = document.getElementById('userUuid') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const dashboardLink = document.getElementById('dashboardLink') as HTMLAnchorElement;

// 直接从 storage 获取配置（不使用缓存）
// 普通配置从 local storage，敏感信息从 session storage
async function getLocalConfig(): Promise<TrackerConfig> {
  const [localResult, sessionResult] = await Promise.all([
    chrome.storage.local.get('config'),
    chrome.storage.session.get('sensitive'),
  ]);
  
  const config = { ...DEFAULT_CONFIG, ...localResult.config };
  const sensitive = sessionResult.sensitive as SensitiveConfig | undefined;
  
  // 合并敏感信息
  if (sensitive?.userUuid) {
    config.userUuid = sensitive.userUuid;
  }
  
  return config;
}

// 保存配置到 storage
// 敏感信息（userUuid）存储到 session storage，其他存储到 local storage
async function saveLocalConfig(config: Partial<TrackerConfig>): Promise<void> {
  const current = await getLocalConfig();
  
  // 分离敏感信息
  const { userUuid: uuid, ...nonSensitiveConfig } = config;
  
  // 保存非敏感配置到 local storage（不包含 userUuid）
  const newLocalConfig = { ...current, ...nonSensitiveConfig };
  delete (newLocalConfig as Partial<TrackerConfig>).userUuid;
  await chrome.storage.local.set({ config: newLocalConfig });
  
  // 保存敏感信息到 session storage
  if (uuid !== undefined) {
    await chrome.storage.session.set({ sensitive: { userUuid: uuid } });
  }
}

// 检查服务器连接和 UUID 有效性
async function checkConnection(url: string, uuid: string): Promise<{ server: boolean; user: boolean; error?: string }> {
  if (!url) {
    return { server: false, user: false, error: '请配置服务器地址' };
  }

  if (!uuid) {
    try {
      const response = await fetch(`${url}/api/config`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return { server: response.ok, user: false, error: '请配置 UUID' };
    } catch (e) {
      console.error('Connection check failed:', e);
      return { server: false, user: false, error: '无法连接服务器' };
    }
  }

  try {
    const response = await fetch(`${url}/api/users/${uuid}/config`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { server: true, user: true };
    } else if (response.status === 403) {
      return { server: true, user: false, error: '用户已禁用' };
    } else if (response.status === 404) {
      return { server: true, user: false, error: 'UUID 无效' };
    } else {
      return { server: true, user: false, error: `错误: ${response.status}` };
    }
  } catch (e) {
    console.error('Connection check failed:', e);
    return { server: false, user: false, error: '无法连接服务器' };
  }
}

// 更新服务器状态显示
async function updateServerStatus(): Promise<void> {
  serverStatus.textContent = '检测中...';
  serverStatus.className = 'status-value';

  const url = serverUrl.value.trim().replace(/\/$/, '');
  const uuid = userUuid.value.trim();

  const result = await checkConnection(url, uuid);

  if (!result.server) {
    serverStatus.textContent = result.error || '服务器未连接';
    serverStatus.className = 'status-value inactive';
  } else if (!result.user) {
    serverStatus.textContent = result.error || 'UUID 无效';
    serverStatus.className = 'status-value inactive';
  } else {
    serverStatus.textContent = '已连接';
    serverStatus.className = 'status-value active';
  }
}

// 加载配置
async function loadConfig(): Promise<void> {
  const config = await getLocalConfig();
  enableToggle.checked = config.enabled;
  serverUrl.value = config.serverUrl;
  userUuid.value = config.userUuid || '';
  await updateServerStatus();
}

// 保存配置
async function handleSave(): Promise<void> {
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';

  try {
    const newConfig = {
      enabled: enableToggle.checked,
      serverUrl: serverUrl.value.trim().replace(/\/$/, ''),
      userUuid: userUuid.value.trim(),
    };

    await saveLocalConfig(newConfig);

    // 通知 background script 配置已更新
    chrome.runtime.sendMessage({ type: 'CONFIG_UPDATED' });

    await updateServerStatus();
    saveBtn.textContent = '已保存 ✓';
    setTimeout(() => {
      saveBtn.textContent = '保存配置';
      saveBtn.disabled = false;
    }, 1500);
  } catch (error) {
    console.error('Save error:', error);
    saveBtn.textContent = '保存失败';
    setTimeout(() => {
      saveBtn.textContent = '保存配置';
      saveBtn.disabled = false;
    }, 1500);
  }
}

// 打开数据面板
async function openDashboard(): Promise<void> {
  const url = serverUrl.value.trim().replace(/\/$/, '') || 'http://localhost:3000';
  chrome.tabs.create({ url });
}

// 事件监听
enableToggle.addEventListener('change', handleSave);
saveBtn.addEventListener('click', handleSave);
dashboardLink.addEventListener('click', (e) => {
  e.preventDefault();
  openDashboard();
});

// 初始化
loadConfig();
