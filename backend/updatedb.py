import sqlite3
import bcrypt

def update_database():
    try:
        # Kết nối đến database
        conn = sqlite3.connect('../music_recommendation.sqlite')
        cursor = conn.cursor()
        
        # Kiểm tra xem cột role đã tồn tại chưa
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Thêm cột role nếu chưa tồn tại
        if 'role' not in columns:
            print("Thêm cột 'role' vào bảng users...")
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
            conn.commit()
            print("✅ Đã thêm cột role thành công!")
        else:
            print("Cột role đã tồn tại.")
        
        # Tạo tài khoản admin mặc định
        admin_username = 'admin'
        admin_password = 'admin123'
        
        # Kiểm tra xem admin đã tồn tại chưa
        cursor.execute('SELECT * FROM users WHERE username = ?', (admin_username,))
        admin_user = cursor.fetchone()
        
        if not admin_user:
            # Tạo tài khoản admin mới
            hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt())
            cursor.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
                     (admin_username, hashed_password, 'admin'))
            conn.commit()
            print("✅ Tài khoản admin đã được tạo thành công!")
            print("   Username: admin")
            print("   Password: admin123")
        else:
            # Cập nhật tài khoản admin hiện có với role admin
            user_id = admin_user[0]
            cursor.execute('UPDATE users SET role = ? WHERE id = ?', ('admin', user_id))
            
            # Cập nhật mật khẩu admin
            hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt())
            cursor.execute('UPDATE users SET password = ? WHERE id = ?', (hashed_password, user_id))
            conn.commit()
            print("✅ Tài khoản admin đã được cập nhật thành công!")
            print("   Username: admin")
            print("   Password: admin123")
        
        conn.close()
        print("✅ Cơ sở dữ liệu đã được cập nhật thành công!")
        
    except Exception as e:
        print(f"❌ Lỗi khi cập nhật cơ sở dữ liệu: {e}")

if __name__ == "__main__":
    update_database()