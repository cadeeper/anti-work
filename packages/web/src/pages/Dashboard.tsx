import { useQuery } from '@tanstack/react-query';
import { fetchTodayStats } from '../api';
import { HourlyHeatmap } from '../components/HourlyHeatmap';
import { StatCard } from '../components/StatCard';
import { RepoChart } from '../components/RepoChart';
import { DomainChart } from '../components/DomainChart';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['todayStats'],
    queryFn: fetchTodayStats,
    refetchInterval: 60000, // 每分钟刷新
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="text-accent text-4xl mb-4">⚠️</div>
        <div className="text-dark-400">无法加载数据</div>
        <div className="text-dark-600 text-sm mt-2">请确保后端服务正在运行</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">今日概览</h1>
          <p className="text-dark-500 mt-1">{data.date}</p>
        </div>
        <div className="text-right">
          <div className="text-dark-500 text-sm">当前时间</div>
          <div className="text-xl font-mono">
            {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* 工作时长统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="总工作时长"
          value={`${data.workTime.totalHours}h`}
          icon="⏱️"
          description="今日已记录工作时间"
        />
        <StatCard
          title="正常工时"
          value={`${data.workTime.normalHours}h`}
          icon="📋"
          description="法定工作时间内"
          variant="success"
        />
        <StatCard
          title="加班时长"
          value={`${data.workTime.overtimeHours}h`}
          icon="🔥"
          description="法定工作时间外"
          variant="warning"
        />
      </div>

      {/* 代码统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="代码变更"
          value={data.code.changeCount.toString()}
          icon="📝"
          description="次变更记录"
        />
        <StatCard
          title="新增行数"
          value={`+${data.code.totalLinesAdded}`}
          icon="➕"
          variant="success"
        />
        <StatCard
          title="删除行数"
          value={`-${data.code.totalLinesDeleted}`}
          icon="➖"
          variant="danger"
        />
        <StatCard
          title="变更文件"
          value={data.code.totalFilesChanged.toString()}
          icon="📁"
        />
      </div>

      {/* 小时热力图 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">工作时段分布</h2>
        <HourlyHeatmap data={data.hourlyHeatmap} />
      </div>

      {/* 仓库和域名统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">仓库活跃度</h2>
          <RepoChart data={data.code.repoStats} />
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">网站访问</h2>
          <DomainChart data={data.web.domainStats} />
        </div>
      </div>
    </div>
  );
}
