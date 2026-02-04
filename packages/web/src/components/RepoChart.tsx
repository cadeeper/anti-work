import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RepoStats {
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
}

interface RepoChartProps {
  data: Record<string, RepoStats>;
}

export function RepoChart({ data }: RepoChartProps) {
  const chartData = Object.entries(data)
    .map(([name, stats]) => ({
      name: name.length > 12 ? name.slice(0, 12) + '...' : name,
      fullName: name,
      added: stats.linesAdded,
      deleted: stats.linesDeleted,
    }))
    .sort((a, b) => (b.added + b.deleted) - (a.added + a.deleted))
    .slice(0, 5);

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
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" stroke="#565869" fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#565869"
            fontSize={12}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#343541',
              border: '1px solid #40414f',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#e8e8e8' }}
            formatter={(value: number, name: string) => [
              value,
              name === 'added' ? '新增' : '删除',
            ]}
            labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
          />
          <Bar dataKey="added" fill="#4ade80" name="added" />
          <Bar dataKey="deleted" fill="#f87171" name="deleted" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
