interface HourData {
  hour: number;
  hasActivity: boolean;
  codeChanges: number;
  webActivities: number;
  isOvertime: boolean;
}

interface HourlyHeatmapProps {
  data: HourData[];
}

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const getHeatmapLevel = (item: HourData): number => {
    if (!item.hasActivity) return 0;
    const total = item.codeChanges + item.webActivities;
    if (total >= 20) return 5;
    if (total >= 10) return 4;
    if (total >= 5) return 3;
    if (total >= 2) return 2;
    return 1;
  };

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <div>
      <div className="grid grid-cols-12 gap-2">
        {data.map((item) => {
          const level = getHeatmapLevel(item);
          return (
            <div
              key={item.hour}
              className={`
                relative aspect-square rounded-lg flex flex-col items-center justify-center
                transition-all hover:scale-105 cursor-pointer
                ${item.isOvertime ? 'ring-1 ring-orange-500/50' : ''}
                heatmap-${level}
              `}
              title={`${formatHour(item.hour)}\n代码: ${item.codeChanges}\n网站: ${item.webActivities}${item.isOvertime ? '\n⚠️ 加班时段' : ''}`}
            >
              <span className="text-xs font-mono text-dark-400">{item.hour}</span>
              {item.hasActivity && (
                <span className="text-[10px] text-dark-300 mt-0.5">
                  {item.codeChanges + item.webActivities}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-dark-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded heatmap-0"></div>
          <span>无活动</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded heatmap-2"></div>
          <span>低</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded heatmap-4"></div>
          <span>中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded heatmap-5"></div>
          <span>高</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded ring-1 ring-orange-500"></div>
          <span>加班</span>
        </div>
      </div>
    </div>
  );
}
