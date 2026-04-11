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
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserContextType | null>(null);

  useEffect(() => {
    // Restore session on mount
    const storedUser = localStorage.getItem("campusex_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
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

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
