import React from "react";
import { useHistory } from "react-router-dom";
import { useAuth } from "../../component/topnav/AuthContext";
import styles from "./Admin.module.css";

function AdminTopnav() {
  const { user, logout } = useAuth();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push("/");
  };

  const goToDashboard = () => {
    history.push("/admin");
  };

  return (
    <div className={styles.adminNavContainer}>
      <div className={styles.adminNavLeft}>
        <div className={styles.logo} onClick={goToDashboard}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
              fill="#1DB954"
            />
            <path
              d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12zM9 17h2V7H9v10zm-2-5C7 13.77 8.02 15.29 9.5 16.02V7.97C8.02 8.71 7 10.23 7 12z"
              fill="#191414"
            />
          </svg>
          <span className={styles.adminBranding}>Music Admin</span>
        </div>
      </div>

      <div className={styles.adminNavRight}>
        <div className={styles.adminUser}>
          <span className={styles.welcomeText}>Xin chào,</span>
          <span className={styles.username}>{user?.username || "Admin"}</span>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 17L21 12L16 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 12H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

export default AdminTopnav;
