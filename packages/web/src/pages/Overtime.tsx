import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';
import { fetchOvertimeStats } from '../api';

export default function Overtime() {
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('month').format('YYYY-MM-DD'),
    end: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['overtimeStats', dateRange.start, dateRange.end],
    queryFn: () => fetchOvertimeStats(dateRange.start, dateRange.end),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">加载中...</div>
      </div>
    );
  }

  if (!data) return null;

  // 每日加班数据
  const dailyData = Object.entries(data.dailyOvertime)
    .map(([date, hours]) => ({
      date: date.slice(5), // MM-DD
      fullDate: date,
      hours,
    }))
    .filter((d) => d.hours > 0)
    .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

  // 每小时分布数据
  const hourlyData = Object.entries(data.overtimeByHour)
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      count,
    }))
    .filter((d) => d.count > 0);

  // 工作日/周末分布
  const weekdayWeekendData = [
    { name: '工作日加班', value: data.weekdayOvertimeHours },
    { name: '周末加班', value: data.weekendOvertimeHours },
  ].filter((d) => d.value > 0);

  const COLORS = ['#e94560', '#4ade80'];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">加班统计</h1>
          <p className="text-dark-500 mt-1">加班时长追踪与分析</p>
        </div>
        <div className="flex gap-4 items-center">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="input w-40"
          />
          <span className="text-dark-500">至</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="input w-40"
          />
        </div>
      </div>

      {/* 汇总统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-5xl mb-3">🔥</div>
          <div className="stat-number">{data.totalOvertimeHours}h</div>
          <div className="text-dark-500 mt-2">总加班时长</div>
        </div>
        <div className="card text-center">
          <div className="text-5xl mb-3">💼</div>
          <div className="text-3xl font-bold text-accent">{data.weekdayOvertimeHours}h</div>
          <div className="text-dark-500 mt-2">工作日加班</div>
        </div>
        <div className="card text-center">
          <div className="text-5xl mb-3">🏖️</div>
          <div className="text-3xl font-bold text-green-400">{data.weekendOvertimeHours}h</div>
          <div className="text-dark-500 mt-2">周末加班</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 每日加班趋势 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">每日加班趋势</h2>
          {dailyData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="date" stroke="#565869" fontSize={12} />
                  <YAxis stroke="#565869" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#343541',
                      border: '1px solid #40414f',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#e8e8e8' }}
                    formatter={(value: number) => [`${value}h`, '加班']}
                  />
                  <Bar dataKey="hours" fill="#e94560" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-dark-500">
              该时间段无加班记录 🎉
            </div>
          )}
        </div>

        {/* 工作日/周末分布 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">加班类型分布</h2>
          {weekdayWeekendData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={weekdayWeekendData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {weekdayWeekendData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#343541',
                      border: '1px solid #40414f',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}h`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-dark-500">
              该时间段无加班记录 🎉
            </div>
          )}
        </div>
      </div>

      {/* 加班时段分布 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">加班时段分布</h2>
        {hourlyData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" stroke="#565869" fontSize={12} />
                <YAxis stroke="#565869" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#343541',
                    border: '1px solid #40414f',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e8e8e8' }}
                  formatter={(value: number) => [`${value}次`, '加班']}
                />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-dark-500">
            该时间段无加班记录 🎉
          </div>
        )}
      </div>

      {/* 加班日历视图提示 */}
      <div className="card bg-gradient-to-r from-accent/10 to-transparent border-accent/30">
        <div className="flex items-center gap-4">
          <div className="text-4xl">💡</div>
          <div>
            <h3 className="font-semibold">加班分析</h3>
            <p className="text-dark-400 text-sm mt-1">
              {data.totalOvertimeHours === 0
                ? '太棒了！该时间段没有加班记录，继续保持工作生活平衡！'
                : data.weekendOvertimeHours > data.weekdayOvertimeHours
                ? '周末加班较多，建议合理安排休息时间。'
                : '工作日加班较多，建议提高工作效率，减少不必要的加班。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
