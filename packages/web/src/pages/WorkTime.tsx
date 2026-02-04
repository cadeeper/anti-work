import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import dayjs from 'dayjs';
import { fetchWeeklyStats, fetchMonthlyStats } from '../api';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function WorkTime() {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['weeklyStats', selectedDate],
    queryFn: () => fetchWeeklyStats(selectedDate),
    enabled: viewMode === 'weekly',
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthlyStats', selectedDate],
    queryFn: () => fetchMonthlyStats(selectedDate),
    enabled: viewMode === 'monthly',
  });

  const isLoading = viewMode === 'weekly' ? weeklyLoading : monthlyLoading;

  // 处理周数据
  const weeklyChartData = weeklyData?.days.map((day) => ({
    name: `周${WEEKDAYS[day.dayOfWeek]}`,
    date: day.date,
    normal: day.workTime.normalHours,
    overtime: day.workTime.overtimeHours,
  })) || [];

  // 处理月数据
  const monthlyChartData = monthlyData?.days.map((day) => ({
    name: day.date.slice(8), // DD
    date: day.date,
    normal: day.workTime.normalHours,
    overtime: day.workTime.overtimeHours,
  })) || [];

  const chartData = viewMode === 'weekly' ? weeklyChartData : monthlyChartData;
  const summary = viewMode === 'weekly' ? weeklyData?.summary : monthlyData?.summary;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">工时统计</h1>
          <p className="text-dark-500 mt-1">工作时长追踪与分析</p>
        </div>
        <div className="flex gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input w-40"
          />
          <div className="flex bg-dark-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-md transition-all ${
                viewMode === 'weekly'
                  ? 'bg-accent text-white'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              周
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-md transition-all ${
                viewMode === 'monthly'
                  ? 'bg-accent text-white'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              月
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-dark-500">加载中...</div>
        </div>
      ) : (
        <>
          {/* 汇总统计 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="text-4xl mb-2">⏰</div>
              <div className="stat-number">{summary?.totalWorkHours || 0}h</div>
              <div className="text-dark-500 mt-2">总工作时长</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-2">📋</div>
              <div className="text-3xl font-bold text-green-400">
                {summary?.totalNormalHours || 0}h
              </div>
              <div className="text-dark-500 mt-2">正常工时</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-3xl font-bold text-orange-400">
                {summary?.totalOvertimeHours || 0}h
              </div>
              <div className="text-dark-500 mt-2">加班时长</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-2">📅</div>
              <div className="stat-number">
                {viewMode === 'monthly'
                  ? monthlyData?.summary.workDays || 0
                  : weeklyData?.days.filter((d) => d.workTime.totalHours > 0).length || 0}
              </div>
              <div className="text-dark-500 mt-2">工作天数</div>
            </div>
          </div>

          {/* 工时图表 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">
              {viewMode === 'weekly' ? '周工时分布' : '月工时分布'}
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#565869" fontSize={12} />
                  <YAxis stroke="#565869" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#343541',
                      border: '1px solid #40414f',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#e8e8e8' }}
                    formatter={(value: number) => [`${value}h`, '']}
                  />
                  <Legend />
                  <Bar
                    dataKey="normal"
                    name="正常工时"
                    fill="#4ade80"
                    stackId="stack"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="overtime"
                    name="加班时长"
                    fill="#f97316"
                    stackId="stack"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 详细列表 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">详细记录</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">日期</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">星期</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">总时长</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">正常</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">加班</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewMode === 'weekly' ? weeklyData?.days : monthlyData?.days)?.map((day) => (
                    <tr
                      key={day.date}
                      className="border-b border-dark-800 hover:bg-dark-800/50"
                    >
                      <td className="py-3 px-4">{day.date}</td>
                      <td className="text-center py-3 px-4 text-dark-400">
                        周{WEEKDAYS[day.dayOfWeek]}
                      </td>
                      <td className="text-right py-3 px-4 text-accent font-medium">
                        {day.workTime.totalHours}h
                      </td>
                      <td className="text-right py-3 px-4 text-green-400">
                        {day.workTime.normalHours}h
                      </td>
                      <td className="text-right py-3 px-4 text-orange-400">
                        {day.workTime.overtimeHours > 0 ? `${day.workTime.overtimeHours}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
