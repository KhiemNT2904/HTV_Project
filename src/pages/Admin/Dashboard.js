import React, { useState, useEffect, useCallback } from "react"; // Thêm useCallback
import { Link } from "react-router-dom";
import { useAuth } from "../../component/topnav/AuthContext";
import AdminTopnav from "./AdminTopnav";
import styles from "./Admin.module.css";
import { useHistory } from "react-router-dom";

function Dashboard() {
  const { token, logout } = useAuth();
  const history = useHistory();
  const [stats, setStats] = useState({
    userCount: 0,
    songCount: 0,
    artistCount: 0,
    playCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Đưa fetchStats ra ngoài useEffect và dùng useCallback
  const fetchStats = useCallback(async () => {
    try {
      console.log("Fetching stats with token:", token);
      const response = await fetch("http://localhost:5000/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);

        // Kiểm tra nếu token hết hạn
        if (response.status === 401) {
          alert("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
          logout();
          history.push("/login");
          return;
        }

        throw new Error(
          `Failed to load statistics: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Stats received:", data);

      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(
        "Could not load dashboard statistics. Please check your connection or try again later."
      );
      setLoading(false);
    }
  }, [token, logout, history]);

  // Sử dụng useEffect để gọi fetchStats
  useEffect(() => {
    let isMounted = true;

    const getStats = async () => {
      if (isMounted) {
        await fetchStats();
      }
    };

    getStats();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [fetchStats]);

  // Hiển thị loading spinner
  if (loading) {
    return (
      <div className={styles.adminPage}>
        <AdminTopnav />
        <div className={styles.adminContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị lỗi nếu có
  if (error) {
    return (
      <div className={styles.adminPage}>
        <AdminTopnav />
        <div className={styles.adminContent}>
          <div className={styles.errorContainer}>
            <h2>Đã xảy ra lỗi</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminPage}>
      <AdminTopnav /> {/* Thêm dòng này */}
      <div className={styles.adminBackground}></div>
      <div className={styles.adminContent}>
        <h1 className={styles.adminPageTitle}>Bảng điều khiển</h1>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "rgba(29, 185, 84, 0.1)" }}
            >
              {/* Icon người dùng */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 20C18 17.7909 15.3137 16 12 16C8.68629 16 6 17.7909 6 20"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <h2 className={styles.statValue}>{stats.userCount}</h2>
              <p className={styles.statLabel}>Người dùng</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "rgba(45, 85, 255, 0.1)" }}
            >
              {/* Icon bài hát */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18V5L21 3V16"
                  stroke="#2D55FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 21C7.65685 21 9 19.6569 9 18C9 16.3431 7.65685 15 6 15C4.34315 15 3 16.3431 3 18C3 19.6569 4.34315 21 6 21Z"
                  stroke="#2D55FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 19C19.6569 19 21 17.6569 21 16C21 14.3431 19.6569 13 18 13C16.3431 13 15 14.3431 15 16C15 17.6569 16.3431 19 18 19Z"
                  stroke="#2D55FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <h2 className={styles.statValue}>{stats.songCount}</h2>
              <p className={styles.statLabel}>Bài hát</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "rgba(255, 161, 22, 0.1)" }}
            >
              {/* Icon nghệ sĩ */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 15.5C15.3137 15.5 18 12.8137 18 9.5C18 6.18629 15.3137 3.5 12 3.5C8.68629 3.5 6 6.18629 6 9.5C6 12.8137 8.68629 15.5 12 15.5Z"
                  stroke="#FFA116"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 14L3 21"
                  stroke="#FFA116"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 14L21 21"
                  stroke="#FFA116"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <h2 className={styles.statValue}>{stats.artistCount}</h2>
              <p className={styles.statLabel}>Nghệ sĩ</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "rgba(231, 76, 60, 0.1)" }}
            >
              {/* Icon lượt nghe */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 18V12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12V18"
                  stroke="#E74C3C"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 19C21 20.1046 20.1046 21 19 21C17.8954 21 17 20.1046 17 19V15C17 13.8954 17.8954 13 19 13C20.1046 13 21 13.8954 21 15V19Z"
                  stroke="#E74C3C"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 19C3 20.1046 3.89543 21 5 21C6.10457 21 7 20.1046 7 19V15C7 13.8954 6.10457 13 5 13C3.89543 13 3 13.8954 3 15V19Z"
                  stroke="#E74C3C"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <h2 className={styles.statValue}>{stats.playCount}</h2>
              <p className={styles.statLabel}>Lượt nghe</p>
            </div>
          </div>
        </div>

        {/* Management Cards - Đã tồn tại */}
        <div className={styles.managementGrid}>
          <Link to="/admin/users" className={styles.managementCard}>
            <div className={styles.managementIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 20C18 17.7909 15.3137 16 12 16C8.68629 16 6 17.7909 6 20"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Quản lý người dùng</h3>
            <p>Xem, thêm, sửa, xóa và phân quyền người dùng</p>
          </Link>

          <Link to="/admin/songs" className={styles.managementCard}>
            <div className={styles.managementIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18V5L21 3V16"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 21C7.65685 21 9 19.6569 9 18C9 16.3431 7.65685 15 6 15C4.34315 15 3 16.3431 3 18C3 19.6569 4.34315 21 6 21Z"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 19C19.6569 19 21 17.6569 21 16C21 14.3431 19.6569 13 18 13C16.3431 13 15 14.3431 15 16C15 17.6569 16.3431 19 18 19Z"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Quản lý bài hát</h3>
            <p>Thêm, sửa, xóa và quản lý danh sách bài hát</p>
          </Link>

          <Link to="/admin/artists" className={styles.managementCard}>
            <div className={styles.managementIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 15.5C15.3137 15.5 18 12.8137 18 9.5C18 6.18629 15.3137 3.5 12 3.5C8.68629 3.5 6 6.18629 6 9.5C6 12.8137 8.68629 15.5 12 15.5Z"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 14L3 21"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 14L21 21"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Quản lý nghệ sĩ</h3>
            <p>Thêm, sửa, xóa và quản lý danh sách nghệ sĩ</p>
          </Link>

          <Link to="/admin/analytics" className={styles.managementCard}>
            <div className={styles.managementIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 20V10"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 20V4"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 20V14"
                  stroke="#1DB954"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Phân tích dữ liệu</h3>
            <p>Xem thống kê và báo cáo hoạt động</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
