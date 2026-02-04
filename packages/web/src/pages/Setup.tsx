import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Setup() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setupAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码
    if (password.length < 8) {
      setError('密码至少需要8位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      await setupAdmin(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-accent">Anti-Work</h1>
          <p className="text-dark-500 mt-2">工作轨迹记录系统</p>
        </div>

        <div className="card">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🚀</div>
            <h2 className="text-xl font-semibold">系统初始化</h2>
            <p className="text-dark-500 text-sm mt-2">
              首次使用，请设置管理员账号
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">管理员用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="请输入管理员用户名"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="请输入密码（至少8位）"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="请再次输入密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full mt-6"
            >
              {isLoading ? '初始化中...' : '创建管理员账号'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-dark-800/50 rounded-lg">
            <p className="text-dark-500 text-xs">
              💡 提示：管理员账号创建后无法通过此页面修改，请牢记您的密码。
              如需重置，请直接操作数据库。
            </p>
          </div>
        </div>

        <p className="text-center text-dark-600 text-sm mt-6">
          © 2024 Anti-Work
        </p>
      </div>
    </div>
  );
}
