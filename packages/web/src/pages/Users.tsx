import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  uuid: string;
  username: string;
  isAdmin: boolean;
  isDisabled: boolean;
  createdAt: string;
  codeChangesCount: number;
  webActivitiesCount: number;
}

async function fetchUsers(token: string): Promise<User[]> {
  const response = await fetch('/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

export default function Users() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [copiedUuid, setCopiedUuid] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(token!),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
    },
  });

  const toggleDisableMutation = useMutation({
    mutationFn: async ({ id, disabled }: { id: number; disabled: boolean }) => {
      const response = await fetch(`/api/users/${id}/disable`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ disabled }),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const copyUuid = (user: User) => {
    navigator.clipboard.writeText(user.uuid);
    setCopiedUuid(user.id);
    setTimeout(() => setCopiedUuid(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-dark-500 mt-1">管理系统用户</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + 创建用户
        </button>
      </div>

      {/* 用户列表 */}
      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left py-3 px-4 text-dark-400 font-medium">用户名</th>
              <th className="text-left py-3 px-4 text-dark-400 font-medium">UUID</th>
              <th className="text-center py-3 px-4 text-dark-400 font-medium">角色</th>
              <th className="text-center py-3 px-4 text-dark-400 font-medium">状态</th>
              <th className="text-center py-3 px-4 text-dark-400 font-medium">数据量</th>
              <th className="text-right py-3 px-4 text-dark-400 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                <td className="py-3 px-4 font-medium">{user.username}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => copyUuid(user)}
                    className="font-mono text-sm text-dark-400 hover:text-accent transition-colors"
                    title="点击复制"
                  >
                    {copiedUuid === user.id ? '✓ 已复制' : user.uuid.slice(0, 8) + '...'}
                  </button>
                </td>
                <td className="text-center py-3 px-4">
                  {user.isAdmin ? (
                    <span className="px-2 py-1 bg-accent/20 text-accent rounded text-sm">管理员</span>
                  ) : (
                    <span className="px-2 py-1 bg-dark-700 text-dark-400 rounded text-sm">普通用户</span>
                  )}
                </td>
                <td className="text-center py-3 px-4">
                  {user.isDisabled ? (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">已禁用</span>
                  ) : (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">正常</span>
                  )}
                </td>
                <td className="text-center py-3 px-4 text-dark-400 text-sm">
                  代码 {user.codeChangesCount} / 网站 {user.webActivitiesCount}
                </td>
                <td className="text-right py-3 px-4">
                  {!user.isAdmin && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => toggleDisableMutation.mutate({ id: user.id, disabled: !user.isDisabled })}
                        className="text-sm text-dark-400 hover:text-accent"
                      >
                        {user.isDisabled ? '启用' : '禁用'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要删除此用户吗？所有相关数据也会被删除。')) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 创建用户弹窗 */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}
    </div>
  );
}

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (data: { username: string; password: string }) => void;
  isLoading: boolean;
  error?: string;
}

function CreateUserModal({ onClose, onCreate, isLoading, error }: CreateUserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ username, password });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">创建用户</h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="至少3位"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-dark-400 text-sm mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="至少8位"
              required
              minLength={8}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary flex-1"
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
