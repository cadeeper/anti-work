import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import dayjs from 'dayjs';
import { fetchRepos, fetchRepoStats, fetchCodeActivities } from '../api';

export default function CodeStats() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [activityDateRange, setActivityDateRange] = useState({
    start: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });
  const [activityRepoFilter, setActivityRepoFilter] = useState<string>('');

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos,
  });

  const { data: repoStats } = useQuery({
    queryKey: ['repoStats', selectedRepo, days],
    queryFn: () => fetchRepoStats(selectedRepo!, days),
    enabled: !!selectedRepo,
  });

  const { data: codeActivities } = useQuery({
    queryKey: ['codeActivities', activityDateRange.start, activityDateRange.end, activityRepoFilter],
    queryFn: () => fetchCodeActivities(activityDateRange.start, activityDateRange.end, activityRepoFilter || undefined),
  });

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">加载中...</div>
      </div>
    );
  }

  // 处理仓库数据
  const repoChartData = repos?.map((repo) => ({
    name: repo.name,
    added: repo.totalLinesAdded,
    deleted: repo.totalLinesDeleted,
    files: repo.totalFilesChanged,
  })) || [];

  // 处理每日统计数据
  const dailyChartData = repoStats
    ? Object.entries(repoStats.dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date: date.slice(5), // MM-DD
          added: stats.linesAdded,
          deleted: stats.linesDeleted,
        }))
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">代码统计</h1>
        <p className="text-dark-500 mt-1">代码变更追踪与分析</p>
      </div>

      {/* 仓库概览 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">仓库概览</h2>
        {repos && repos.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repoChartData} layout="vertical">
                <XAxis type="number" stroke="#565869" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#565869"
                  fontSize={12}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#343541',
                    border: '1px solid #40414f',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e8e8e8' }}
                />
                <Bar dataKey="added" fill="#4ade80" name="新增" />
                <Bar dataKey="deleted" fill="#f87171" name="删除" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-dark-500">
            暂无仓库数据
          </div>
        )}
      </div>

      {/* 仓库详情 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">仓库详情</h2>
          <div className="flex gap-4">
            <select
              value={selectedRepo || ''}
              onChange={(e) => setSelectedRepo(e.target.value || null)}
              className="input w-48"
            >
              <option value="">选择仓库</option>
              {repos?.map((repo) => (
                <option key={repo.name} value={repo.name}>
                  {repo.name}
                </option>
              ))}
            </select>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="input w-32"
            >
              <option value={7}>近7天</option>
              <option value={30}>近30天</option>
              <option value={90}>近90天</option>
            </select>
          </div>
        </div>

        {selectedRepo && repoStats ? (
          <div className="space-y-6">
            {/* 统计摘要 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-dark-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-accent">
                  {repoStats.totalChanges}
                </div>
                <div className="text-dark-500 text-sm">变更次数</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  +{repoStats.totalLinesAdded}
                </div>
                <div className="text-dark-500 text-sm">新增行数</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  -{repoStats.totalLinesDeleted}
                </div>
                <div className="text-dark-500 text-sm">删除行数</div>
              </div>
            </div>

            {/* 每日趋势 */}
            <div>
              <h3 className="text-sm font-medium text-dark-400 mb-3">每日趋势</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <XAxis dataKey="date" stroke="#565869" fontSize={12} />
                    <YAxis stroke="#565869" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#343541',
                        border: '1px solid #40414f',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e8e8e8' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="added"
                      stroke="#4ade80"
                      strokeWidth={2}
                      dot={false}
                      name="新增"
                    />
                    <Line
                      type="monotone"
                      dataKey="deleted"
                      stroke="#f87171"
                      strokeWidth={2}
                      dot={false}
                      name="删除"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 分支统计 */}
            {Object.keys(repoStats.branchStats).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-dark-400 mb-3">分支统计</h3>
                <div className="space-y-2">
                  {Object.entries(repoStats.branchStats).map(([branch, stats]) => (
                    <div
                      key={branch}
                      className="flex items-center justify-between bg-dark-800 rounded-lg p-3"
                    >
                      <span className="font-mono text-sm">{branch}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-400">+{stats.linesAdded}</span>
                        <span className="text-red-400">-{stats.linesDeleted}</span>
                        <span className="text-dark-500">{stats.count}次</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-dark-500">
            请选择一个仓库查看详情
          </div>
        )}
      </div>

      {/* 代码活动记录 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">代码活动记录</h2>
          <div className="flex gap-4">
            <input
              type="date"
              value={activityDateRange.start}
              onChange={(e) => setActivityDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="input w-36"
            />
            <span className="text-dark-500 self-center">至</span>
            <input
              type="date"
              value={activityDateRange.end}
              onChange={(e) => setActivityDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="input w-36"
            />
            <select
              value={activityRepoFilter}
              onChange={(e) => setActivityRepoFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">全部仓库</option>
              {codeActivities?.repos.map((repo) => (
                <option key={repo} value={repo}>{repo}</option>
              ))}
            </select>
          </div>
        </div>

        {codeActivities && codeActivities.activities.length > 0 ? (
          <>
            {/* 统计摘要 */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-dark-800 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-accent">{codeActivities.total}</div>
                <div className="text-dark-500 text-xs">变更次数</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-400">+{codeActivities.summary.totalLinesAdded}</div>
                <div className="text-dark-500 text-xs">新增行数</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-400">-{codeActivities.summary.totalLinesDeleted}</div>
                <div className="text-dark-500 text-xs">删除行数</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-400">{codeActivities.summary.totalFilesChanged}</div>
                <div className="text-dark-500 text-xs">文件变更</div>
              </div>
            </div>

            {/* 活动列表 */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-dark-800">
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">时间</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">仓库</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">分支</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">新增</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">删除</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">文件</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {codeActivities.activities.map((activity) => (
                    <tr key={activity.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                      <td className="py-2 px-4 text-dark-400 text-sm whitespace-nowrap">
                        {dayjs(activity.recordedAt).format('MM-DD HH:mm:ss')}
                      </td>
                      <td className="py-2 px-4 text-sm font-mono">{activity.repoName}</td>
                      <td className="py-2 px-4 text-sm text-dark-400 font-mono">{activity.branch}</td>
                      <td className="py-2 px-4 text-sm text-green-400 text-right">+{activity.linesAdded}</td>
                      <td className="py-2 px-4 text-sm text-red-400 text-right">-{activity.linesDeleted}</td>
                      <td className="py-2 px-4 text-sm text-dark-400 text-right">{activity.filesChanged}</td>
                      <td className="py-2 px-4 text-center">
                        {activity.isCommitted ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs" title={activity.commitHash}>
                            已提交
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                            未提交
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-dark-500">暂无代码活动数据</div>
        )}
      </div>
    </div>
  );
}
