export interface WebActivity {
  url: string;
  domain: string;
  title: string;
  eventType: 'pageview' | 'click' | 'scroll' | 'input' | 'focus';
  duration?: number;
  count?: number;  // 聚合数量
  recordedAt: string;
}

export interface TrackerConfig {
  enabled: boolean;
  serverUrl: string;
  userUuid: string;
  domainWhitelist: string[];
  domainBlacklist: string[];
  sanitizePatterns: string[];
}

// 敏感信息（存储在 session storage）
export interface SensitiveConfig {
  userUuid: string;
}

// 默认脱敏规则 - 过滤常见敏感参数
export const DEFAULT_SANITIZE_PATTERNS: string[] = [
  // URL 参数中的敏感信息
  'token=[^&]+',
  'access_token=[^&]+',
  'refresh_token=[^&]+',
  'api_key=[^&]+',
  'apikey=[^&]+',
  'password=[^&]+',
  'pwd=[^&]+',
  'secret=[^&]+',
  'auth=[^&]+',
  'session=[^&]+',
  'sessionid=[^&]+',
  'sid=[^&]+',
  'key=[^&]+',
  'credential=[^&]+',
  // 路径中的敏感信息
  '/users/[^/]+/',
  '/account/[^/]+/',
  // 邮箱地址
  '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  // 手机号码（中国）
  '1[3-9]\\d{9}',
  // 身份证号
  '\\d{17}[\\dXx]',
];

export const DEFAULT_CONFIG: TrackerConfig = {
  enabled: true,
  serverUrl: 'http://localhost:3000',
  userUuid: '',
  domainWhitelist: [],
  domainBlacklist: [],
  sanitizePatterns: DEFAULT_SANITIZE_PATTERNS,
};
