import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DomainStats {
  count: number;
  duration: number;
}

interface DomainChartProps {
  data: Record<string, DomainStats>;
}

const COLORS = ['#e94560', '#ff6b6b', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6'];

export function DomainChart({ data }: DomainChartProps) {
  const chartData = Object.entries(data)
    .map(([domain, stats]) => ({
      name: domain.length > 20 ? domain.slice(0, 20) + '...' : domain,
      fullName: domain,
      value: stats.count,
      duration: stats.duration,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-dark-500">
        暂无数据
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={60}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#343541',
              border: '1px solid #40414f',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#e8e8e8' }}
            formatter={(value: number) => [`${value}次`, '访问']}
            labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 图例 */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs">
        {chartData.map((item, index) => (
          <div key={item.fullName} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-dark-400">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
