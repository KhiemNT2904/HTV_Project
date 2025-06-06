import React, { useState, useEffect } from "react";
import { useAuth } from "../../component/topnav/AuthContext";
import styles from "./Admin.module.css";
import AdminTopnav from "./AdminTopnav";
import { useHistory } from "react-router-dom";

function UserManagement() {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const history = useHistory();

  // State cho modal cập nhật thông tin
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:5000/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // Xử lý cập nhật quyền người dùng
  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(
        `http://localhost:5000/admin/users/${userId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      // Reload users after update
      fetchUsers();
      alert("Cập nhật quyền thành công!");
    } catch (err) {
      setError(err.message);
      alert("Lỗi khi cập nhật quyền: " + err.message);
    }
  };

  // Xử lý xóa người dùng
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/admin/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      // Reload users after delete
      fetchUsers();
      alert("Xóa người dùng thành công!");
    } catch (err) {
      setError(err.message);
      alert("Lỗi khi xóa người dùng: " + err.message);
    }
  };

  // Xử lý mở form cập nhật thông tin
  const handleEditUser = (user) => {
    setCurrentUser({
      id: user.id,
      username: user.username,
      password: "",
      confirmPassword: "",
    });
    setIsEditModalOpen(true);
  };

  // Xử lý cập nhật thông tin người dùng
  const handleUpdateUser = async (e) => {
    e.preventDefault();

    // Kiểm tra mật khẩu nếu có nhập
    if (
      currentUser.password &&
      currentUser.password !== currentUser.confirmPassword
    ) {
      alert("Mật khẩu và xác nhận mật khẩu không khớp!");
      return;
    }

    try {
      const userData = {
        username: currentUser.username,
      };

      // Chỉ gửi mật khẩu nếu có nhập
      if (currentUser.password) {
        userData.password = currentUser.password;
      }

      const response = await fetch(
        `http://localhost:5000/admin/users/${currentUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      // Reload users after update
      fetchUsers();
      setIsEditModalOpen(false);
      alert("Cập nhật thông tin người dùng thành công!");
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Lỗi khi cập nhật thông tin: " + err.message);
    }
  };

  if (loading) {
    return <div className={styles.loadingContainer}>Đang tải...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>Lỗi: {error}</div>;
  }

  return (
    <div className={styles.adminPage}>
      <AdminTopnav />
      <div className={styles.adminBackground}></div>
      <div className={styles.adminContent}>
        <h1 className={styles.adminPageTitle}>Quản lý người dùng</h1>

        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên người dùng</th>
                <th>Quyền</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value)
                      }
                      className={styles.roleSelect}
                      disabled={user.role === "admin"} // Vô hiệu hóa việc đổi quyền cho admin
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className={styles.actionButtons}>
                    <button
                      onClick={() => handleEditUser(user)}
                      className={styles.editButton}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className={styles.deleteButton}
                      disabled={user.role === "admin"} // Vô hiệu hóa nút xóa cho admin
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal sửa thông tin người dùng */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Cập nhật thông tin người dùng</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsEditModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-id">ID</label>
                <input
                  type="text"
                  id="edit-id"
                  value={currentUser.id}
                  disabled
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-username">Tên người dùng</label>
                <input
                  type="text"
                  id="edit-username"
                  required
                  value={currentUser.username}
                  onChange={(e) =>
                    setCurrentUser({ ...currentUser, username: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-password">
                  Mật khẩu mới (để trống nếu không muốn thay đổi)
                </label>
                <input
                  type="password"
                  id="edit-password"
                  value={currentUser.password}
                  onChange={(e) =>
                    setCurrentUser({ ...currentUser, password: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-confirm-password">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  id="edit-confirm-password"
                  value={currentUser.confirmPassword}
                  onChange={(e) =>
                    setCurrentUser({
                      ...currentUser,
                      confirmPassword: e.target.value,
                    })
                  }
                />
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

export default UserManagement;
