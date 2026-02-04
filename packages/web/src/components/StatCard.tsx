interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, icon, description, variant = 'default' }: StatCardProps) {
  const valueColors = {
    default: 'text-accent',
    success: 'text-green-400',
    warning: 'text-orange-400',
    danger: 'text-red-400',
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dark-500 text-sm">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${valueColors[variant]}`}>{value}</p>
          {description && <p className="text-dark-600 text-xs mt-2">{description}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
