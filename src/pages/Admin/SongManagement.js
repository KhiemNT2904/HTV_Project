import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../component/topnav/AuthContext";
import { useHistory } from "react-router-dom";
import styles from "./Admin.module.css";
import AdminTopnav from "./AdminTopnav";

function SongManagement() {
  const { token, logout } = useAuth();
  const history = useHistory();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Thêm state cho danh sách thể loại
  const [genres, setGenres] = useState([]);
  // State cho tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSongs, setFilteredSongs] = useState([]);

  // State cho form thêm/sửa
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState({
    id: "",
    name: "",
    artist: "",
    year: "",
    popularity: "",
  });

  // Sửa trong hàm fetchSongs

  const fetchSongs = useCallback(
    async (page = 1, searchQuery = "") => {
      try {
        setLoading(true);

        // Thêm tham số search vào URL nếu có
        let url = `http://localhost:5000/admin/songs?page=${page}&per_page=10`;
        if (searchQuery && searchQuery.trim() !== "") {
          url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }

        console.log(`Fetching songs from: ${url}`);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            alert("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
            logout();
            history.push("/login");
            return;
          }

          // Lấy thông tin lỗi chi tiết từ response
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch songs: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();
        console.log("Songs data received:", data);

        if (data.songs && Array.isArray(data.songs)) {
          setSongs(data.songs);
          setFilteredSongs(data.songs);

          if (data.total_pages) {
            setTotalPages(data.total_pages);
            console.log(
              `Total pages: ${data.total_pages}, Current page: ${data.current_page}`
            );
          }
        } else {
          console.error("Invalid data format received:", data);
          // Set empty arrays to avoid errors
          setSongs([]);
          setFilteredSongs([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching songs:", err);
        setError(err.message);
        setLoading(false);
        // Set empty arrays to avoid errors
        setSongs([]);
        setFilteredSongs([]);
      }
    },
    [token, logout, history]
  );

  // Cập nhật searchTerm effect để thêm searchTerm vào dependency array của useCallback
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset về trang đầu tiên khi tìm kiếm
      console.log("Searching for:", searchTerm);
      fetchSongs(1, searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchSongs]);

  const handleSearch = (e) => {
    e.preventDefault(); // Ngăn form submit làm tải lại trang
    fetchSongs(1, searchTerm);
  };
  // Thêm useEffect riêng cho thay đổi trang
  useEffect(() => {
    let isMounted = true;

    const getSongs = async () => {
      if (isMounted) {
        await fetchSongs(currentPage, searchTerm);
      }
    };

    getSongs();

    return () => {
      isMounted = false;
    };
  }, [currentPage, fetchSongs]);

  // Thêm useEffect để lấy danh sách thể loại khi component mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch("http://localhost:5000/admin/genres", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setGenres(data);
        }
      } catch (err) {
        console.error("Error fetching genres:", err);
      }
    };

    fetchGenres();
  }, [token]);
  // Xử lý xóa bài hát
  const handleDeleteSong = async (songId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài hát này?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/admin/songs/${songId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          alert("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
          logout();
          history.push("/login");
          return;
        }
        throw new Error(`Failed to delete song: ${response.status}`);
      }

      // Reload songs after delete
      fetchSongs(currentPage);
      alert("Xóa bài hát thành công!");
    } catch (err) {
      console.error("Error deleting song:", err);
      setError(err.message);
      alert("Lỗi khi xóa bài hát: " + err.message);
    }
  };

  // Xử lý sửa bài hát
  const handleEditSong = (song) => {
    setCurrentSong(song);
    setIsEditModalOpen(true);
  };

  // Xử lý cập nhật bài hát
  const handleUpdateSong = async (e) => {
    e.preventDefault();
    try {
      console.log("Đang cập nhật bài hát:", currentSong);

      const response = await fetch(
        `http://localhost:5000/admin/songs/${currentSong.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(currentSong),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update song: ${response.status} - ${errorText}`
        );
      }

      // Reload songs after update
      fetchSongs(currentPage, searchTerm);
      setIsEditModalOpen(false);
      alert("Cập nhật bài hát thành công!");
    } catch (err) {
      console.error("Error updating song:", err);
      alert("Lỗi khi cập nhật bài hát: " + err.message);
    }
  };

  // Xử lý thêm bài hát
  const handleAddSong = async (e) => {
    e.preventDefault();
    try {
      // Tạo ID ngẫu nhiên và độ phổ biến mặc định
      const randomId = `song_${Date.now()}_${Math.floor(
        Math.random() * 10000
      )}`;
      const defaultPopularity = 50;

      // Thêm các trường bắt buộc
      const songData = {
        ...currentSong,
        id: randomId, // ID ngẫu nhiên
        popularity: defaultPopularity, // Độ phổ biến mặc định
        danceability: 0.5,
        energy: 0.5,
        valence: 0.5,
        loudness: -10,
        acousticness: 0.5,
        instrumentalness: 0.5,
        liveness: 0.5,
        speechiness: 0.5,
        duration_ms: 200000,
        explicit: 0,
        key: 5,
        mode: 1,
        release_date: `${currentSong.year || new Date().getFullYear()}-01-01`,
        tempo: 120,
        cluster_label: 0,
      };

      console.log("Đang thêm bài hát:", songData);

      const response = await fetch("http://localhost:5000/admin/songs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(songData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to add song: ${response.status} - ${errorText}`
        );
      }

      // Reload songs after add
      fetchSongs(currentPage);
      setIsAddModalOpen(false);
      setCurrentSong({
        name: "",
        artist: "",
        year: "",
      });
      alert("Thêm bài hát thành công!");
    } catch (err) {
      console.error("Error adding song:", err);
      alert("Lỗi khi thêm bài hát: " + err.message);
    }
  };

  // Hiển thị loading
  if (loading && songs.length === 0) {
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

  // Hiển thị lỗi
  if (error) {
    return (
      <div className={styles.adminPage}>
        <AdminTopnav />
        <div className={styles.adminContent}>
          <h1 className={styles.adminPageTitle}>Quản lý bài hát</h1>
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
          <h1 className={styles.adminPageTitle}>Quản lý bài hát</h1>
          <button
            className={styles.addButton}
            onClick={() => {
              setCurrentSong({
                id: "",
                name: "",
                artist: "",
                year: "",
                popularity: "",
              });
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
            Thêm bài hát
          </button>
        </div>

        <div className={styles.searchContainer}>
          <form
            onSubmit={handleSearch}
            style={{ display: "flex", width: "100%" }}
          >
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm bài hát hoặc nghệ sĩ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className={styles.searchButton}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 21L16.65 16.65"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên bài hát</th>
                <th>Nghệ sĩ</th>
                <th>Năm phát hành</th>
                <th>Thể loại</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className={styles.tableLoading}>
                    <div className={styles.spinnerSmall}></div>
                    Đang tải...
                  </td>
                </tr>
              ) : filteredSongs.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.noResults}>
                    Không tìm thấy bài hát nào.
                  </td>
                </tr>
              ) : (
                filteredSongs.map((song) => (
                  <tr key={song.id}>
                    <td>{song.id}</td>
                    <td>{song.name}</td>
                    <td>{song.artist || "Chưa có thông tin"}</td>
                    <td>{song.year || "N/A"}</td>
                    <td>{song.genre || "Chưa phân loại"}</td>
                    <td className={styles.actionButtons}>
                      <button
                        onClick={() => handleEditSong(song)}
                        className={styles.editButton}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.id)}
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

          {/* Phân trang */}
          <div className={styles.pagination}>
            <button
              onClick={() => {
                if (currentPage > 1) {
                  const newPage = currentPage - 1;
                  setCurrentPage(newPage);
                  fetchSongs(newPage, searchTerm); // Truyền searchTerm hiện tại
                }
              }}
              disabled={currentPage === 1}
              className={styles.pageButton}
            >
              Trước
            </button>

            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  const newPage = currentPage + 1;
                  setCurrentPage(newPage);
                  fetchSongs(newPage, searchTerm); // Truyền searchTerm hiện tại
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
      {/* Modal thêm bài hát */}

      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Thêm bài hát mới</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsAddModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddSong}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Tên bài hát</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={currentSong.name}
                  onChange={(e) =>
                    setCurrentSong({ ...currentSong, name: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="artist">Nghệ sĩ</label>
                <input
                  type="text"
                  id="artist"
                  value={currentSong.artist || ""}
                  onChange={(e) =>
                    setCurrentSong({ ...currentSong, artist: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="year">Năm phát hành</label>
                <input
                  type="number"
                  id="year"
                  value={currentSong.year || ""}
                  onChange={(e) =>
                    setCurrentSong({ ...currentSong, year: e.target.value })
                  }
                  placeholder="Ví dụ: 2023"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="genre">Thể loại</label>
                <div className={styles.genreInputContainer}>
                  <input
                    type="text"
                    id="genre"
                    list="genre-list"
                    value={currentSong.genre || ""}
                    onChange={(e) =>
                      setCurrentSong({ ...currentSong, genre: e.target.value })
                    }
                    placeholder="Nhập hoặc chọn thể loại (phân cách nhiều thể loại bằng dấu phẩy)"
                  />
                  <datalist id="genre-list">
                    {genres.map((genre) => (
                      <option key={genre.id} value={genre.name} />
                    ))}
                  </datalist>
                </div>
                <div className={styles.fieldHint}>
                  Ví dụ: Rock, Pop, Jazz (phân cách bằng dấu phẩy)
                </div>
              </div>
              <div className={styles.formNote}>
                <small>* ID sẽ được tạo tự động</small>
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
                  Thêm bài hát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal sửa bài hát */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Sửa thông tin bài hát</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsEditModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateSong}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-id">ID</label>
                <input
                  type="text"
                  id="edit-id"
                  value={currentSong.id}
                  disabled
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-name">Tên bài hát</label>
                <input
                  type="text"
                  id="edit-name"
                  required
                  value={currentSong.name}
                  onChange={(e) =>
                    setCurrentSong({ ...currentSong, name: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-artist">Nghệ sĩ</label>
                <input
                  type="text"
                  id="edit-artist"
                  value={currentSong.artist || ""}
                  onChange={(e) =>
                    setCurrentSong({ ...currentSong, artist: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-year">Năm phát hành</label>
                <input
                  type="number"
                  id="edit-year"
                  value={currentSong.year || ""}
                  onChange={(e) =>
                    setCurrentSong({ ...currentSong, year: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-genre">Thể loại</label>
                <div className={styles.genreInputContainer}>
                  <input
                    type="text"
                    id="edit-genre"
                    list="edit-genre-list"
                    value={currentSong.genre || ""}
                    onChange={(e) =>
                      setCurrentSong({ ...currentSong, genre: e.target.value })
                    }
                    placeholder="Nhập hoặc chọn thể loại (phân cách nhiều thể loại bằng dấu phẩy)"
                  />
                  <datalist id="edit-genre-list">
                    {genres.map((genre) => (
                      <option key={genre.id} value={genre.name} />
                    ))}
                  </datalist>
                </div>
                <div className={styles.fieldHint}>
                  Ví dụ: Rock, Pop, Jazz (phân cách bằng dấu phẩy)
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

export default SongManagement;
