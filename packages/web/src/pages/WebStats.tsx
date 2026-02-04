import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const COLORS = ['#e94560', '#ff6b6b', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#fbbf24'];

interface WebActivityDetail {
  id: number;
  url: string;
  domain: string;
  title: string;
  eventType: string;
  duration: number | null;
  recordedAt: string;
}

interface WebActivitiesResponse {
  startDate: string;
  endDate: string;
  total: number;
  eventTypeStats: Record<string, number>;
  domainStats: Record<string, { count: number; duration: number }>;
  urlStats: Record<string, { count: number; duration: number; title: string; domain: string }>;
  domains: string[];
  activities: WebActivityDetail[];
}

// 快捷日期选项
const DATE_PRESETS = [
  { label: '今天', value: 'today', days: 0 },
  { label: '近7天', value: '7days', days: 7 },
  { label: '近半月', value: '15days', days: 15 },
  { label: '近1月', value: '30days', days: 30 },
];

async function fetchWebActivities(
  token: string,
  start: string,
  end: string,
  domain?: string
): Promise<WebActivitiesResponse> {
  const params = new URLSearchParams({ start, end });
  if (domain) params.set('domain', domain);
  const response = await fetch(`/api/stats/web-activities?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

export default function WebStats() {
  const { token } = useAuth();
  const today = dayjs().format('YYYY-MM-DD');

  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  // 根据快捷选项计算日期
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const option = DATE_PRESETS.find((p) => p.value === preset);
    if (option) {
      if (option.days === 0) {
        setStartDate(today);
        setEndDate(today);
      } else {
        setStartDate(dayjs().subtract(option.days - 1, 'day').format('YYYY-MM-DD'));
        setEndDate(today);
      }
    }
  };

  // 手动日期变更时清除快捷选项
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setDatePreset('custom');
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['webActivities', startDate, endDate, selectedDomain],
    queryFn: () => fetchWebActivities(token!, startDate, endDate, selectedDomain || undefined),
    enabled: !!token,
  });

  // 处理域名数据
  const domainData = useMemo(() => {
    if (!data?.domainStats) return [];
    return Object.entries(data.domainStats)
      .map(([domain, stats]) => ({
        name: domain,
        value: stats.count,
        duration: stats.duration,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const topDomains = domainData.slice(0, 10);
  const durationData = useMemo(() => {
    return [...domainData].sort((a, b) => b.duration - a.duration).slice(0, 10);
  }, [domainData]);

  // 按日期聚合数据（用于趋势图）
  const dailyTrend = useMemo(() => {
    if (!data?.activities) return [];
    const grouped: Record<string, { count: number; duration: number }> = {};
    data.activities.forEach((a) => {
      const date = dayjs(a.recordedAt).format('MM-DD');
      if (!grouped[date]) grouped[date] = { count: 0, duration: 0 };
      grouped[date].count += 1;
      grouped[date].duration += a.duration || 0;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));
  }, [data]);

  // 格式化时长
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分`;
    return `${(seconds / 3600).toFixed(1)}时`;
  };

  // 格式化事件类型
  const formatEventType = (type: string) => {
    const map: Record<string, string> = {
      pageview: '页面访问',
      click: '点击',
      scroll: '滚动',
      input: '输入',
      focus: '聚焦',
    };
    return map[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">网站统计</h1>
          <p className="text-dark-500 mt-1">浏览活动追踪与分析</p>
        </div>

        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 快捷日期 */}
          <div className="flex gap-1">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetChange(preset.value)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  datePreset === preset.value
                    ? 'bg-accent text-white'
                    : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 自定义日期 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="input w-36 text-sm"
            />
            <span className="text-dark-500">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="input w-36 text-sm"
            />
          </div>

          {/* 域名筛选 */}
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="input w-48 text-sm"
          >
            <option value="">全部域名</option>
            {data?.domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center py-4">
          <div className="text-3xl mb-1">🌐</div>
          <div className="stat-number text-2xl">{data?.total || 0}</div>
          <div className="text-dark-500 text-sm">活动记录</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl mb-1">📊</div>
          <div className="stat-number text-2xl">{Object.keys(data?.domainStats || {}).length}</div>
          <div className="text-dark-500 text-sm">访问域名</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl mb-1">👁️</div>
          <div className="stat-number text-2xl">{data?.eventTypeStats?.pageview || 0}</div>
          <div className="text-dark-500 text-sm">页面访问</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl mb-1">⏱️</div>
          <div className="stat-number text-2xl">
            {formatDuration(
              Object.values(data?.domainStats || {}).reduce((sum, s) => sum + s.duration, 0)
            )}
          </div>
          <div className="text-dark-500 text-sm">总停留时长</div>
        </div>
      </div>

      {/* 事件类型分布 */}
      {data && Object.keys(data.eventTypeStats).length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">事件类型分布</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.eventTypeStats).map(([type, count]) => (
              <div key={type} className="bg-dark-800 rounded-lg px-4 py-2">
                <span className="text-dark-400">{formatEventType(type)}</span>
                <span className="ml-2 text-accent font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 趋势图（多天时显示） */}
      {dailyTrend.length > 1 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">活动趋势</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <XAxis dataKey="date" stroke="#565869" fontSize={12} />
                <YAxis stroke="#565869" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#343541',
                    border: '1px solid #40414f',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#e94560" strokeWidth={2} dot={false} name="活动数" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 访问分布饼图 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">域名访问分布</h2>
          {topDomains.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topDomains}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name.length > 12 ? name.slice(0, 12) + '...' : name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {topDomains.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#343541', border: '1px solid #40414f', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value}次`, '访问']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-dark-500">暂无数据</div>
          )}
        </div>

        {/* 停留时长排行 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">停留时长排行</h2>
          {durationData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData} layout="vertical">
                  <XAxis type="number" stroke="#565869" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#565869"
                    fontSize={12}
                    width={100}
                    tickFormatter={(value) => (value.length > 12 ? value.slice(0, 12) + '...' : value)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#343541', border: '1px solid #40414f', borderRadius: '8px' }}
                    formatter={(value: number) => [formatDuration(value), '停留']}
                  />
                  <Bar dataKey="duration" fill="#e94560" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-dark-500">暂无数据</div>
          )}
        </div>
      </div>

      {/* 页面访问明细 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">页面访问明细</h2>
        {data && Object.keys(data.urlStats).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">页面</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">访问</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">停留</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.urlStats)
                  .sort((a, b) => b[1].count - a[1].count)
                  .slice(0, 50)
                  .map(([url, stats], index) => (
                    <tr key={url} className="border-b border-dark-800 hover:bg-dark-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <span className="text-dark-500 shrink-0">{index + 1}.</span>
                          <div className="min-w-0">
                            <div className="text-sm truncate max-w-lg" title={url}>
                              {url}
                            </div>
                            {stats.title && (
                              <div className="text-xs text-dark-500 truncate max-w-lg" title={stats.title}>
                                {stats.title}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-accent">{stats.count}</td>
                      <td className="text-right py-3 px-4 text-dark-400">{formatDuration(stats.duration)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-dark-500">暂无数据</div>
        )}
      </div>

      {/* 最近活动记录 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">最近活动记录</h2>
        {data && data.activities.length > 0 ? (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-800">
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">时间</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">类型</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">域名</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">页面</th>
                </tr>
              </thead>
              <tbody>
                {data.activities.slice(0, 100).map((activity) => (
                  <tr key={activity.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                    <td className="py-2 px-4 text-dark-400 text-sm whitespace-nowrap">
                      {dayjs(activity.recordedAt).format('MM-DD HH:mm')}
                    </td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-1 bg-dark-700 rounded text-xs">
                        {formatEventType(activity.eventType)}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-sm">{activity.domain}</td>
                    <td className="py-2 px-4 text-sm text-dark-400 truncate max-w-xs" title={activity.url}>
                      {activity.url.replace(/^https?:\/\/[^/]+/, '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-dark-500">
            暂无活动记录
            <p className="text-sm mt-2">请确认 Chrome 扩展已正确配置并启用</p>
          </div>
        )}
      </div>
    </div>
  );
}
