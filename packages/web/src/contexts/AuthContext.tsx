import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  uuid: string;
  username: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean | null; // null = 检查中, true = 已初始化, false = 未初始化
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setupAdmin: (username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // 检查系统是否已初始化
  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        setIsInitialized(data.initialized);
        return data.initialized;
      }
    } catch {
      // 如果请求失败，假设已初始化（避免阻塞正常使用）
      setIsInitialized(true);
    }
    return true;
  };

  // 初始化时检查本地存储的 token
  useEffect(() => {
    const init = async () => {
      // 先检查系统是否初始化
      const initialized = await checkSystemStatus();
      
      if (!initialized) {
        setIsLoading(false);
        return;
      }

      // 系统已初始化，检查 token
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        await fetchUser(storedToken);
      } else {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token 无效，清除
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '登录失败');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const setupAdmin = async (username: string, password: string) => {
    const response = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '初始化失败');
    }

    // 初始化成功后自动登录
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsInitialized(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isInitialized, login, logout, setupAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
