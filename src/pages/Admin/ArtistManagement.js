import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../component/topnav/AuthContext";
import { useHistory } from "react-router-dom";
import styles from "./Admin.module.css";
import AdminTopnav from "./AdminTopnav";

function ArtistManagement() {
  const { token, logout } = useAuth();
  const history = useHistory();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Thêm state quản lý phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // State cho modal thêm/sửa
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentArtist, setCurrentArtist] = useState({
    id: "",
    name: "",
    song_count: 0,
  });

  // Fetch artists from API
  const fetchArtists = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/admin/artists?page=${page}&per_page=20`,
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
          throw new Error(`Failed to fetch artists: ${response.status}`);
        }

        const data = await response.json();
        setArtists(data.artists || []);
        setTotalPages(data.total_pages || 1);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching artists:", err);
        setError(err.message);
        setLoading(false);
      }
    },
    [token, logout, history]
  );

  // Cập nhật useEffect để truyền trang hiện tại
  useEffect(() => {
    fetchArtists(currentPage);
  }, [currentPage, fetchArtists]);

  useEffect(() => {
    let isMounted = true;

    const getArtists = async () => {
      try {
        await fetchArtists();
      } catch (err) {
        if (isMounted) {
          console.error("Error in fetchArtists:", err);
        }
      }
    };

    getArtists();

    // Cleanup function để ngăn chặn cập nhật state sau khi unmount
    return () => {
      isMounted = false;
    };
  }, [fetchArtists]);

  // Xử lý thêm nghệ sĩ mới
  const handleAddArtist = async (e) => {
    e.preventDefault();

    if (!currentArtist.name.trim()) {
      alert("Tên nghệ sĩ không được để trống!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/admin/artists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: currentArtist.name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to add artist: ${response.status} - ${errorText}`
        );
      }

      // Reload artists after add
      fetchArtists();
      setIsAddModalOpen(false);
      setCurrentArtist({ id: "", name: "", song_count: 0 });
      alert("Thêm nghệ sĩ thành công!");
    } catch (err) {
      console.error("Error adding artist:", err);
      alert("Lỗi khi thêm nghệ sĩ: " + err.message);
    }
  };

  // Xử lý cập nhật thông tin nghệ sĩ
  const handleUpdateArtist = async (e) => {
    e.preventDefault();

    if (!currentArtist.name.trim()) {
      alert("Tên nghệ sĩ không được để trống!");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/admin/artists/${currentArtist.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: currentArtist.name,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update artist: ${response.status} - ${errorText}`
        );
      }

      // Reload artists after update
      fetchArtists();
      setIsEditModalOpen(false);
      alert("Cập nhật nghệ sĩ thành công!");
    } catch (err) {
      console.error("Error updating artist:", err);
      alert("Lỗi khi cập nhật nghệ sĩ: " + err.message);
    }
  };

  // Xử lý xóa nghệ sĩ
  const handleDeleteArtist = async (artistId) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa nghệ sĩ này? Tất cả liên kết với bài hát cũng sẽ bị xóa."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/admin/artists/${artistId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete artist: ${response.status}`);
      }

      // Reload artists after delete
      fetchArtists();
      alert("Xóa nghệ sĩ thành công!");
    } catch (err) {
      console.error("Error deleting artist:", err);
      setError(err.message);
      alert("Lỗi khi xóa nghệ sĩ: " + err.message);
    }
  };

  // Xử lý mở form sửa nghệ sĩ
  const handleEditArtist = (artist) => {
    setCurrentArtist(artist);
    setIsEditModalOpen(true);
  };

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

  if (error) {
    return (
      <div className={styles.adminPage}>
        <AdminTopnav />
        <div className={styles.adminContent}>
          <h1 className={styles.adminPageTitle}>Quản lý nghệ sĩ</h1>
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
      <AdminTopnav />
      <div className={styles.adminBackground}></div>
      <div className={styles.adminContent}>
        <div className={styles.pageHeader}>
          <h1 className={styles.adminPageTitle}>Quản lý nghệ sĩ</h1>
          <button
            className={styles.addButton}
            onClick={() => {
              setCurrentArtist({ id: "", name: "", song_count: 0 });
              setIsAddModalOpen(true);
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5V19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Thêm nghệ sĩ
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên nghệ sĩ</th>
                <th>Số lượng bài hát</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {artists.length === 0 ? (
                <tr>
                  <td colSpan="4" className={styles.noResults}>
                    Không có nghệ sĩ nào.
                  </td>
                </tr>
              ) : (
                artists.map((artist) => (
                  <tr key={artist.id}>
                    <td>{artist.id}</td>
                    <td>{artist.name}</td>
                    <td>{artist.song_count}</td>
                    <td className={styles.actionButtons}>
                      <button
                        onClick={() => handleEditArtist(artist)}
                        className={styles.editButton}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteArtist(artist.id)}
                        className={styles.deleteButton}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className={styles.tableContainer}>
            <table className={styles.adminTable}>
              {/* Nội dung bảng hiện tại */}
            </table>

            {/* Thêm phân trang tại đây */}
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

      {/* Modal thêm nghệ sĩ */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Thêm nghệ sĩ mới</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsAddModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddArtist}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Tên nghệ sĩ</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={currentArtist.name}
                  onChange={(e) =>
                    setCurrentArtist({ ...currentArtist, name: e.target.value })
                  }
                  placeholder="Nhập tên nghệ sĩ"
                />
              </div>
              <div className={styles.formNote}>
                <small>* Số lượng bài hát sẽ bắt đầu từ 0</small>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={styles.cancelButton}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.submitButton}>
                  Thêm nghệ sĩ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal sửa nghệ sĩ */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Sửa thông tin nghệ sĩ</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsEditModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateArtist}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-id">ID</label>
                <input
                  type="text"
                  id="edit-id"
                  value={currentArtist.id}
                  disabled
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-name">Tên nghệ sĩ</label>
                <input
                  type="text"
                  id="edit-name"
                  required
                  value={currentArtist.name}
                  onChange={(e) =>
                    setCurrentArtist({ ...currentArtist, name: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-song-count">Số lượng bài hát</label>
                <input
                  type="number"
                  id="edit-song-count"
                  value={currentArtist.song_count}
                  disabled
                />
                <div className={styles.fieldHint}>
                  Số lượng bài hát sẽ tự động cập nhật theo hệ thống
                </div>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={styles.cancelButton}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.submitButton}>
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtistManagement;
