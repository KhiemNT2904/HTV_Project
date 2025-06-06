import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../component/topnav/AuthContext";
import { useHistory } from "react-router-dom";
import AdminTopnav from "./AdminTopnav";
import styles from "./Admin.module.css";

function Analytics() {
  const { token, logout } = useAuth();
  const history = useHistory();
  const [mostPlayedSongs, setMostPlayedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State quản lý phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Định nghĩa fetchMostPlayedSongs ở cấp độ component sử dụng useCallback
  const fetchMostPlayedSongs = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/admin/analytics/most_played?page=${page}&per_page=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          // Kiểm tra nếu token hết hạn
          if (response.status === 401) {
            alert("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
            logout();
            history.push("/login");
            return;
          }

          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();
        setMostPlayedSongs(data.most_played_songs || []);
        setTotalPages(data.total_pages || 1);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching most played songs:", err);
        setError(err.message);
        setLoading(false);
      }
    },
    [token, logout, history]
  );

  // Sử dụng useEffect để gọi fetchMostPlayedSongs khi component mount hoặc currentPage thay đổi
  useEffect(() => {
    fetchMostPlayedSongs(currentPage);
  }, [currentPage, fetchMostPlayedSongs]);

  // Hiển thị loading spinner
  if (loading) {
    return (
      <div className={styles.adminPage}>
        <AdminTopnav />
        <div className={styles.adminContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Đang tải dữ liệu phân tích...</p>
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
          <h1 className={styles.adminPageTitle}>Phân tích dữ liệu</h1>
          <div className={styles.errorContainer}>
            <h2>Đã xảy ra lỗi</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        </div>
      </div>
    );
  }

  // Phần return hiển thị dữ liệu
  return (
    <div className={styles.adminPage}>
      <AdminTopnav />
      <div className={styles.adminBackground}></div>
      <div className={styles.adminContent}>
        <h1 className={styles.adminPageTitle}>Phân tích dữ liệu</h1>

        <div className={styles.analyticsContainer}>
          <div className={styles.analyticsCard} style={{ width: "100%" }}>
            <h2>Bài hát được nghe nhiều nhất</h2>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Tên bài hát</th>
                  <th>Nghệ sĩ</th>
                  <th>Lượt nghe</th>
                </tr>
              </thead>
              <tbody>
                {mostPlayedSongs.length === 0 ? (
                  <tr>
                    <td colSpan="3" className={styles.noResults}>
                      Không có dữ liệu nghe nhạc.
                    </td>
                  </tr>
                ) : (
                  mostPlayedSongs.map((song) => (
                    <tr key={song.id}>
                      <td>{song.name}</td>
                      <td>{song.artist}</td>
                      <td>{song.play_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Phân trang */}
            <div className={styles.pagination}>
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                  }
                }}
                disabled={currentPage === 1}
                className={styles.pageButton}
              >
                Trước
              </button>
              <span className={styles.pageInfo}>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1);
                  }
                }}
                disabled={currentPage === totalPages}
                className={styles.pageButton}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
