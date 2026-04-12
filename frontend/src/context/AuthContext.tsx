"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type UserContextType = {
  id: number;
  email: string;
  name: string;
  stockSymbol: string;
  auraCoins: number;
};

type AuthContextType = {
  user: UserContextType | null;
  login: (userData: UserContextType) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserContextType | null>(null);

  useEffect(() => {
    // Restore session on mount
    const storedUser = localStorage.getItem("campusex_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      // Background refresh immediately
      fetch(`/api/user/profile/${parsed.id}`)
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                setUser(data.user);
                localStorage.setItem("campusex_user", JSON.stringify(data.user));
            }
        }).catch(err => console.error(err));
    }
  }, []);

  const login = (userData: UserContextType) => {
    setUser(userData);
    localStorage.setItem("campusex_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("campusex_user");
  };

  const refreshUser = async () => {
    if (user?.id) {
      try {
        const res = await fetch(`/api/user/profile/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem("campusex_user", JSON.stringify(data.user));
        }
      } catch (e) {
        console.error("Failed to refresh user", e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
