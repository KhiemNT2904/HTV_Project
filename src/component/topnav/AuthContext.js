import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Khởi tạo state từ sessionStorage thay vì localStorage
  useEffect(() => {
    const savedUser = sessionStorage.getItem("user");
    const savedToken = sessionStorage.getItem("token");

    if (savedUser && savedToken) {
      const userObj = JSON.parse(savedUser);
      setUser(userObj);
      setToken(savedToken);
      setIsAdmin(userObj.role === "admin");
    }

    setIsAuthLoading(false);
  }, []);

  // Xóa bỏ hàm refreshToken và useEffect cho refresh token
  // vì chúng ta không muốn token tự động refresh

  const login = (userData, token) => {
    console.log("Setting user data in context:", userData);
    console.log("Setting isAdmin to:", userData.role === "admin");

    setUser(userData);
    setToken(token);
    setIsAdmin(userData.role === "admin");

    // Lưu vào sessionStorage thay vì localStorage
    // sessionStorage sẽ tự động xóa khi đóng trình duyệt
    sessionStorage.setItem("user", JSON.stringify(userData));
    sessionStorage.setItem("token", token);

    console.log("After setting, isAdmin =", userData.role === "admin");
  };

  const logout = () => {
    console.log("User đang logout");
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAdmin, isAuthLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
