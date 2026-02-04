export interface WebActivity {
  url: string;
  domain: string;
  title: string;
  eventType: 'pageview' | 'click' | 'scroll' | 'input' | 'focus';
  duration?: number;
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

export const DEFAULT_CONFIG: TrackerConfig = {
  enabled: true,
  serverUrl: 'http://localhost:3000',
  userUuid: '',
  domainWhitelist: [],
  domainBlacklist: [],
  sanitizePatterns: [],
};
