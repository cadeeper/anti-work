import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyConfig, updateMyConfig } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['myConfig'],
    queryFn: fetchMyConfig,
  });

  const [formData, setFormData] = useState({
    watchPaths: '',
    pollInterval: 300,
    excludePatterns: '',
    workTimeStart: '09:00',
    workTimeEnd: '18:00',
    lunchStart: '12:00',
    lunchEnd: '14:00',
    domainWhitelist: '',
    domainBlacklist: '',
    sanitizePatterns: '',
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copiedUuid, setCopiedUuid] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        watchPaths: (config as any).watchPaths?.join('\n') || '',
        pollInterval: config.pollInterval,
        excludePatterns: config.excludePatterns.join('\n'),
        workTimeStart: config.workTime.start,
        workTimeEnd: config.workTime.end,
        lunchStart: config.workTime.lunchBreak.start,
        lunchEnd: config.workTime.lunchBreak.end,
        domainWhitelist: config.domainWhitelist.join('\n'),
        domainBlacklist: config.domainBlacklist.join('\n'),
        sanitizePatterns: config.sanitizePatterns.join('\n'),
      });
    }
  }, [config]);

  const mutation = useMutation({
    mutationFn: updateMyConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myConfig'] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  const handleSave = () => {
    setSaveStatus('saving');

    mutation.mutate({
      watchPaths: formData.watchPaths.split('\n').filter(Boolean),
      pollInterval: formData.pollInterval,
      excludePatterns: formData.excludePatterns.split('\n').filter(Boolean),
      workTimeStart: formData.workTimeStart,
      workTimeEnd: formData.workTimeEnd,
      lunchStart: formData.lunchStart,
      lunchEnd: formData.lunchEnd,
      domainWhitelist: formData.domainWhitelist.split('\n').filter(Boolean),
      domainBlacklist: formData.domainBlacklist.split('\n').filter(Boolean),
      sanitizePatterns: formData.sanitizePatterns.split('\n').filter(Boolean),
    } as any);
  };

  const copyUuid = () => {
    if (user?.uuid) {
      navigator.clipboard.writeText(user.uuid);
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-dark-500 mt-1">个人配置</p>
      </div>

      {/* 用户信息 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">👤 账号信息</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-dark-400">用户名</span>
            <span>{user?.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-dark-400">角色</span>
            <span>{user?.isAdmin ? '管理员' : '普通用户'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-dark-400">UUID (API Key)</span>
            <button
              onClick={copyUuid}
              className="font-mono text-sm text-accent hover:underline"
            >
              {copiedUuid ? '✓ 已复制' : user?.uuid}
            </button>
          </div>
        </div>
        <p className="text-dark-600 text-xs mt-4">
          💡 UUID 用于 Agent 和浏览器扩展上报数据，请妥善保管
        </p>
      </div>

      {/* 代码监控设置 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">💻 代码监控</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">监控目录 (每行一个)</label>
            <textarea
              value={formData.watchPaths}
              onChange={(e) => setFormData((prev) => ({ ...prev, watchPaths: e.target.value }))}
              className="input h-24 font-mono text-sm"
              placeholder="/Users/you/projects&#10;/home/you/code"
            />
            <p className="text-dark-600 text-xs mt-1">Agent 会扫描这些目录下的 Git 仓库</p>
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">轮询间隔 (秒)</label>
            <input
              type="number"
              min="60"
              value={formData.pollInterval}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pollInterval: Number(e.target.value) }))
              }
              className="input w-32"
            />
            <p className="text-dark-600 text-xs mt-1">Agent 扫描代码变更的间隔，默认 300 秒</p>
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">排除模式 (每行一个)</label>
            <textarea
              value={formData.excludePatterns}
              onChange={(e) => setFormData((prev) => ({ ...prev, excludePatterns: e.target.value }))}
              className="input h-24 font-mono text-sm"
              placeholder="node_modules&#10;.git&#10;dist"
            />
          </div>
        </div>
      </div>

      {/* 工作时间设置 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">⏰ 工作时间</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">上班时间</label>
              <input
                type="time"
                value={formData.workTimeStart}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, workTimeStart: e.target.value }))
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">下班时间</label>
              <input
                type="time"
                value={formData.workTimeEnd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, workTimeEnd: e.target.value }))
                }
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">午休开始</label>
              <input
                type="time"
                value={formData.lunchStart}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lunchStart: e.target.value }))
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">午休结束</label>
              <input
                type="time"
                value={formData.lunchEnd}
                onChange={(e) => setFormData((prev) => ({ ...prev, lunchEnd: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <p className="text-dark-600 text-xs">
            工作时间外的活动将被标记为加班，周末默认算加班
          </p>
        </div>
      </div>

      {/* 网站跟踪设置 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">🌐 网站跟踪</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">域名白名单 (每行一个，支持通配符)</label>
            <textarea
              value={formData.domainWhitelist}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, domainWhitelist: e.target.value }))
              }
              className="input h-24 font-mono text-sm"
              placeholder="*.example.com"
            />
            <p className="text-dark-600 text-xs mt-1">留空则跟踪所有域名</p>
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">域名黑名单 (每行一个，支持通配符)</label>
            <textarea
              value={formData.domainBlacklist}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, domainBlacklist: e.target.value }))
              }
              className="input h-24 font-mono text-sm"
              placeholder="*.google.com"
            />
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">脱敏正则 (每行一个)</label>
            <textarea
              value={formData.sanitizePatterns}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sanitizePatterns: e.target.value }))
              }
              className="input h-24 font-mono text-sm"
              placeholder="password=\w+"
            />
            <p className="text-dark-600 text-xs mt-1">匹配的内容将被替换为 [REDACTED]</p>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn btn-primary px-8"
        >
          {saveStatus === 'saving' ? '保存中...' : '保存设置'}
        </button>
        {saveStatus === 'saved' && (
          <span className="text-green-400 animate-fade-in">✓ 已保存</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-400 animate-fade-in">保存失败</span>
        )}
      </div>
    </div>
  );
}
