import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import CodeStats from './pages/CodeStats';
import WebStats from './pages/WebStats';
import WorkTime from './pages/WorkTime';
import Overtime from './pages/Overtime';
import Settings from './pages/Settings';
import Users from './pages/Users';

function App() {
  const { user, isLoading, isInitialized, logout } = useAuth();

  // 加载中
  if (isLoading || isInitialized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-dark-500">加载中...</div>
      </div>
    );
  }

  // 系统未初始化，显示初始化页面
  if (!isInitialized) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  // 未登录
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const navItems = [
    { path: '/', label: '概览', icon: '📊' },
    { path: '/code', label: '代码', icon: '💻' },
    { path: '/web', label: '网站', icon: '🌐' },
    { path: '/worktime', label: '工时', icon: '⏰' },
    { path: '/overtime', label: '加班', icon: '🔥' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ];

  // 管理员额外菜单
  if (user.isAdmin) {
    navItems.push({ path: '/users', label: '用户', icon: '👥' });
  }

  return (
    <div className="flex min-h-screen">
      {/* 侧边栏 */}
      <aside className="w-64 bg-dark-900 border-r border-dark-700 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-accent">Anti-Work</h1>
          <p className="text-dark-500 text-sm mt-1">工作轨迹记录</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="pt-6 border-t border-dark-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.username}</div>
              <div className="text-xs text-dark-500">
                {user.isAdmin ? '管理员' : '普通用户'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-dark-500 hover:text-accent text-sm transition-colors"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/code" element={<CodeStats />} />
          <Route path="/web" element={<WebStats />} />
          <Route path="/worktime" element={<WorkTime />} />
          <Route path="/overtime" element={<Overtime />} />
          <Route path="/settings" element={<Settings />} />
          {user.isAdmin && <Route path="/users" element={<Users />} />}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
