import dayjs, { Dayjs } from 'dayjs';
import config from 'config';

interface WorkHour {
  id: number;
  date: string;
  hour: number;
  hasActivity: boolean;
  codeChanges: number;
  webActivities: number;
  isOvertime: boolean;
}

interface WorkTimeConfig {
  start: string;
  end: string;
  lunchBreak: {
    start: string;
    end: string;
  };
  weekendIsOvertime: boolean;
}

/**
 * 计算工作时长
 */
export function calculateWorkTime(workHours: WorkHour[]): {
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
} {
  const activeHours = workHours.filter((h) => h.hasActivity);
  const totalHours = activeHours.length;
  const overtimeHours = activeHours.filter((h) => h.isOvertime).length;
  const normalHours = totalHours - overtimeHours;

  return {
    totalHours,
    normalHours,
    overtimeHours,
  };
}

/**
 * 计算加班统计
 */
export function calculateOvertimeStats(
  workHours: WorkHour[],
  startDate: Dayjs,
  endDate: Dayjs
): {
  totalOvertimeHours: number;
  weekdayOvertimeHours: number;
  weekendOvertimeHours: number;
  dailyOvertime: Record<string, number>;
  overtimeByHour: Record<number, number>;
} {
  const workTimeConfig = config.get<WorkTimeConfig>('workTime');
  
  const dailyOvertime: Record<string, number> = {};
  const overtimeByHour: Record<number, number> = {};
  let weekdayOvertimeHours = 0;
  let weekendOvertimeHours = 0;

  // 初始化每日加班
  let current = startDate;
  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    dailyOvertime[current.format('YYYY-MM-DD')] = 0;
    current = current.add(1, 'day');
  }

  // 初始化每小时加班
  for (let h = 0; h < 24; h++) {
    overtimeByHour[h] = 0;
  }

  // 统计加班
  for (const wh of workHours) {
    if (!wh.hasActivity || !wh.isOvertime) continue;

    const date = dayjs(wh.date);
    const dayOfWeek = date.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (dailyOvertime[wh.date] !== undefined) {
      dailyOvertime[wh.date] += 1;
    }

    overtimeByHour[wh.hour] = (overtimeByHour[wh.hour] || 0) + 1;

    if (isWeekend) {
      weekendOvertimeHours += 1;
    } else {
      weekdayOvertimeHours += 1;
    }
  }

  const totalOvertimeHours = weekdayOvertimeHours + weekendOvertimeHours;

  return {
    totalOvertimeHours,
    weekdayOvertimeHours,
    weekendOvertimeHours,
    dailyOvertime,
    overtimeByHour,
  };
}
