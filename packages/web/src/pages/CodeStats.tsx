import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { fetchRepos, fetchRepoStats } from '../api';

export default function CodeStats() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos,
  });

  const { data: repoStats } = useQuery({
    queryKey: ['repoStats', selectedRepo, days],
    queryFn: () => fetchRepoStats(selectedRepo!, days),
    enabled: !!selectedRepo,
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
    </div>
  );
}
