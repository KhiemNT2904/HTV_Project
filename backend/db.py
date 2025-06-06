import sqlite3
from datetime import datetime
from flask import g
import time

class Database:
    def __init__(self, db_path='music_recommendation.sqlite'):
        self.db_path = db_path
        self._conn = None
        self.cached_artists = []
        self.last_cached_time = 0
        self.cache_duration = 3600

    def get_db(self):
        """Kết nối với cơ sở dữ liệu."""
        try:
            if "db" not in g:
                g.db = sqlite3.connect(self.db_path)
                g.db.execute("PRAGMA foreign_keys = ON")  # ✅ Bật foreign key support
            return g.db
        except RuntimeError:
            if not hasattr(self, '_conn') or self._conn is None:
                self._conn = sqlite3.connect(self.db_path)
                self._conn.execute("PRAGMA foreign_keys = ON")  # ✅ Bật foreign key support
            return self._conn

    def update_user(self, user_id, username=None, password=None):
        """Cập nhật thông tin người dùng."""
        db = self.get_db()
        cursor = db.cursor()
    
        # Kiểm tra người dùng có tồn tại không
        cursor.execute('SELECT role FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        if not user:
            return False
    
        # Chuẩn bị các trường cần cập nhật
        updates = []
        values = []
    
        if username:
            updates.append("username = ?")
            values.append(username)
    
        if password:
            # Mã hóa mật khẩu mới
            import bcrypt
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            updates.append("password = ?")
            values.append(hashed_password)
        
        if not updates:
            return True  # Không có gì để cập nhật
    
        # Cập nhật thông tin người dùng
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        values.append(user_id)
    
        cursor.execute(query, values)
        db.commit()
    
        return cursor.rowcount > 0
        # Thêm các hàm sau vào class Database nếu chưa có
    def get_user_count(self):
        """Lấy tổng số người dùng"""
        try:
            db = self.get_db()
            cursor = db.cursor()
            cursor.execute('SELECT COUNT(*) FROM users')
            result = cursor.fetchone()
            return result[0] if result else 0
        except Exception as e:
            print(f"Lỗi khi đếm người dùng: {e}")
            return 0

    def get_song_count(self):
        """Lấy tổng số bài hát"""
        try:
            db = self.get_db()
            cursor = db.cursor()
            cursor.execute('SELECT COUNT(*) FROM songs')
            result = cursor.fetchone()
            return result[0] if result else 0
        except Exception as e:
            print(f"Lỗi khi đếm bài hát: {e}")
        return 0
    def get_most_played_songs(self, page=1, per_page=10):
        """Lấy danh sách bài hát được nghe nhiều nhất với phân trang"""
        db = self.get_db()
        cursor = db.cursor()
    
        # Đếm tổng số bài hát unique đã được nghe để tính số trang
        cursor.execute('''
            SELECT COUNT(DISTINCT s.id) FROM songs s 
            INNER JOIN user_history uh ON s.id = uh.song_id
        ''')
        total_songs = cursor.fetchone()[0]
        total_pages = max(1, (total_songs + per_page - 1) // per_page)  # Làm tròn lên, tối thiểu 1 trang
    
        # Tính offset dựa trên trang hiện tại
        offset = (page - 1) * per_page
    
        # Truy vấn lấy bài hát và số lượt nghe, sắp xếp theo số lượt nghe giảm dần
        cursor.execute('''
            SELECT s.id, s.name, 
                (SELECT GROUP_CONCAT(a.name, ', ') 
                FROM artists a 
                JOIN song_artists sa ON a.id = sa.artist_id 
                WHERE sa.song_id = s.id) as artist,
               COUNT(uh.user_id) as play_count
            FROM songs s
            INNER JOIN user_history uh ON s.id = uh.song_id
            GROUP BY s.id, s.name
            ORDER BY play_count DESC
            LIMIT ? OFFSET ?
        ''', (per_page, offset))
    
        rows = cursor.fetchall()
        songs = [{'id': row[0], 'name': row[1], 'artist': row[2] or 'Unknown', 'play_count': row[3]} for row in rows]
    
        return {
        'most_played_songs': songs,
        'total_songs': total_songs,
        'total_pages': total_pages,
        'current_page': page
    }
    def get_artist_count(self):
        """Lấy tổng số nghệ sĩ"""
        try:
            db = self.get_db()
            cursor = db.cursor()
            cursor.execute('SELECT COUNT(*) FROM artists')
            result = cursor.fetchone()
            return result[0] if result else 0
        except Exception as e:
            print(f"Lỗi khi đếm lượt nghe: {e}")
        return 0
    def get_all_artists_with_song_count(self, page=1, per_page=20):
        """Lấy danh sách tất cả nghệ sĩ kèm số lượng bài hát có phân trang"""
        db = self.get_db()
        cursor = db.cursor()
    
        # Đếm tổng số nghệ sĩ để tính số trang
        cursor.execute('SELECT COUNT(*) FROM artists')
        total_artists = cursor.fetchone()[0]
        total_pages = (total_artists + per_page - 1) // per_page  # Làm tròn lên
    
        # Tính offset dựa trên trang hiện tại
        offset = (page - 1) * per_page
    
        # Query chính lấy nghệ sĩ và số bài hát có phân trang
        cursor.execute("""
            SELECT a.id, a.name, COUNT(DISTINCT sa.song_id) as song_count 
            FROM artists a
            LEFT JOIN song_artists sa ON a.id = sa.artist_id
            GROUP BY a.id, a.name
            ORDER BY a.name
            LIMIT ? OFFSET ?
        """, (per_page, offset))
    
        rows = cursor.fetchall()
        artists = [{'id': row[0], 'name': row[1], 'song_count': row[2]} for row in rows]
    
        return {
        'artists': artists,
        'total_artists': total_artists,
        'total_pages': total_pages,
        'current_page': page
    }

    def add_artist(self, name):
        """Thêm nghệ sĩ mới"""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('INSERT INTO artists (name) VALUES (?)', (name,))
        db.commit()
        return cursor.lastrowid

    def update_artist(self, artist_id, name):
        """Cập nhật thông tin nghệ sĩ"""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('UPDATE artists SET name = ? WHERE id = ?', (name, artist_id))
        db.commit()
        return cursor.rowcount > 0

    def delete_artist(self, artist_id):
        """Xóa nghệ sĩ theo ID"""
        db = self.get_db()
        cursor = db.cursor()
    
        # Xóa quan hệ trong bảng song_artists trước
        cursor.execute('DELETE FROM song_artists WHERE artist_id = ?', (artist_id,))
    
        # Sau đó xóa nghệ sĩ
        cursor.execute('DELETE FROM artists WHERE id = ?', (artist_id,))
        db.commit()
        return cursor.rowcount > 0

    def get_artist_by_id(self, artist_id):
        """Lấy thông tin nghệ sĩ theo ID"""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute("""
        SELECT a.id, a.name, COUNT(DISTINCT sa.song_id) as song_count 
        FROM artists a
        LEFT JOIN song_artists sa ON a.id = sa.artist_id
        WHERE a.id = ?
        GROUP BY a.id, a.name
        """, (artist_id,))
        row = cursor.fetchone()
        return {'id': row[0], 'name': row[1], 'song_count': row[2]} if row else None
    def get_play_count(self):
        """Lấy tổng lượt nghe"""
        db = self.get_db()  
        cursor = db.cursor()
        cursor.execute('SELECT COUNT(*) FROM user_history')
        return cursor.fetchone()[0]
    def close_db(self):
        """Đóng kết nối cơ sở dữ liệu."""
        try:
            db = g.pop('db', None)
            if db is not None:
                db.close()
        except RuntimeError:
            if hasattr(self, '_conn') and self._conn:
                self._conn.close()
                self._conn = None

# ----------- User -----------

    # Cập nhật phương thức add_user để hỗ trợ role
    def add_user(self, username, password, role='user'):
        """Thêm người dùng vào cơ sở dữ liệu."""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
                  (username, password, role))
        db.commit()
        return cursor.lastrowid
    
    # Thêm phương thức lấy danh sách người dùng (cho admin)
    def get_all_users(self):
        """Lấy danh sách tất cả người dùng."""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('SELECT id, username, role, created_at, last_login FROM users')
        rows = cursor.fetchall()
        return [{'id': row[0], 'username': row[1], 'role': row[2], 
             'created_at': row[3], 'last_login': row[4]} for row in rows]
    
    # Thêm phương thức xóa người dùng
    def delete_user(self, user_id):
        """Xóa người dùng theo ID."""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('DELETE FROM users WHERE id = ? AND role != "admin"', (user_id,))
        db.commit()
        return cursor.rowcount > 0
    
        # Thêm phương thức cập nhật role người dùng
    def update_user_role(self, user_id, role):
        """Cập nhật role của người dùng."""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('UPDATE users SET role = ? WHERE id = ?', (role, user_id))
        db.commit()
        return cursor.rowcount > 0
    def is_new_user(self, user_id):
        """Kiểm tra người dùng là người mới hay người cũ"""
        db = self.get_db()
        cursor = db.cursor()

        cursor.execute('select 1 from user_preferences where user_id = ?', (user_id,))
        has_preferences = cursor.fetchone() is not None

        cursor.execute('SELECT 1 FROM user_history WHERE user_id = ? LIMIT 1', (user_id,))
        has_history = cursor.fetchone() is not None

        return not (has_preferences or has_history)

    def get_user(self, username):
        """Lấy thông tin người dùng theo tên người dùng."""
        db = self.get_db()
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

    def get_user_by_id(self, user_id):
        """Lấy thông tin người dùng theo ID."""
        db = self.get_db()
        db.row_factory = sqlite3.Row  # Sửa: conn → db
        cursor = db.cursor()  # Sửa: conn → db
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        if row:
         return dict(row)
        return None
        
    def get_artist(self):
        """Lấy danh sách 10 nghệ sĩ cho khách."""
        current_time = time.time()
        if not self.cached_artists or (current_time - self.last_cached_time) > self.cache_duration:
                db = self.get_db()
                cursor = db.cursor()
                cursor.execute('SELECT id, name FROM artists limit 10')
                rows = cursor.fetchall()
                return [{"id": row[0], "name": row[1]} for row in rows]
            
    def add_artists_preferences(self, user_id, artist_id):
        """Lưu nghệ sĩ yêu thích theo sở thích người dùng"""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('INSERT INTO user_preferences (user_id, artist_id) values (?, ?) ', (user_id, artist_id) )       
        db.commit()
        return cursor.lastrowid
        
    def get_artists_preferences(self, user_id):
        """Lấy nghệ sĩ yêu thích theo ID"""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute("""Select ar.id, ar.name from artists as ar join user_preferences as up on up.artist_id = ar.id join users as u on u.id = up.user_id 
                            where u.id = ?""", (user_id, ))
        rows = cursor.fetchall()
        return [{'id': row[0], 'name': row[1]} for row in rows]

    # History 
    def add_song_history(self, user_id, song_id):
        """Thêm bài hát vào lịch sử người dùng"""
        # Chỉ lưu nếu thời gian nghe >= 10 giây
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('INSERT INTO user_history (user_id, song_id) VALUES (?, ?)', (user_id, song_id))
        db.commit()
        print(f"Song {song_id} added to user history for user {user_id}.")
        # else:
        #     print(f"Song {song_id} not added to history because duration is less than 10 seconds.")

    
    def get_song_history(self, user_id):
        db = self.get_db()
        cursor = db.cursor()

        # print("🔍 User ID:", user_id)
        # print("📄 Bảng user_history:")
        # for row in cursor.execute("SELECT * FROM user_history WHERE user_id = ? ", (user_id,)):
        #     print(row)

        # print("🎶 Bảng songs:")
        # for row in cursor.execute("SELECT id, name FROM songs"):
        #     print(row)

        # JOIN để lấy tên bài hát
        cursor.execute("""
            SELECT uh.song_id, s.name
            FROM songs s JOIN user_history uh ON s.id = uh.song_id
            WHERE uh.user_id = ?
        """, (user_id,))
        rows = cursor.fetchall()

        #print("🎵 Kết quả JOIN:", rows)
        return [{'id': row[0], 'name': row[1]} for row in rows]

    
    def get_all_history(self):
        """Lấy toàn bộ lịch sử nghe nhạc của người dùng."""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('SELECT user_id, song_id FROM user_history')
        return cursor.fetchall()



    # Songs methods
    # Thêm các phương thức để quản lý bài hát
    def get_all_songs(self, page=1, per_page=50, search=None):
        """Lấy danh sách tất cả bài hát có phân trang và tìm kiếm."""
        try:
            db = self.get_db()
            cursor = db.cursor()
        
            # Kiểm tra xem bảng song_genres và genres có tồn tại không
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='song_genres'")
            has_song_genres = cursor.fetchone() is not None
        
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='genres'")
            has_genres = cursor.fetchone() is not None
        
            # Thêm điều kiện tìm kiếm nếu có
            search_condition = ""
            search_params = []
            if search:
                search_term = f"%{search}%"
                if has_genres:
                    search_condition = "WHERE s.name LIKE ? OR a.name LIKE ? OR g.name LIKE ?"
                    search_params = [search_term, search_term, search_term]
                else:
                    search_condition = "WHERE s.name LIKE ? OR a.name LIKE ?"
                    search_params = [search_term, search_term]
        
            # Đếm tổng số bài hát bằng cách đếm các s.id duy nhất
            if has_song_genres and has_genres:
                count_query = f'''
                SELECT COUNT(*) FROM (
                    SELECT DISTINCT s.id 
                    FROM songs s 
                    LEFT JOIN song_artists sa ON s.id = sa.song_id
                    LEFT JOIN artists a ON sa.artist_id = a.id
                    LEFT JOIN song_genres sg ON s.id = sg.song_id
                    LEFT JOIN genres g ON sg.genre_id = g.id
                    {search_condition}
                )
            '''
            else:
                count_query = f'''
                    SELECT COUNT(*) FROM (
                        SELECT DISTINCT s.id 
                        FROM songs s 
                        LEFT JOIN song_artists sa ON s.id = sa.song_id
                        LEFT JOIN artists a ON sa.artist_id = a.id
                        {search_condition}
                    )
                '''
        
            cursor.execute(count_query, search_params)
            result = cursor.fetchone()
            total_songs = result[0] if result else 0
            total_pages = max(1, (total_songs + per_page - 1) // per_page)  # Ít nhất 1 trang
        
            # Tính offset dựa trên trang hiện tại
            offset = (page - 1) * per_page
        
            # Truy vấn chính để lấy thông tin bài hát với GROUP_CONCAT đơn giản hơn
            if has_song_genres and has_genres:
                query = f'''
                    SELECT s.id, s.name, s.year,
                        GROUP_CONCAT(DISTINCT a.name) AS artist,
                        GROUP_CONCAT(DISTINCT g.name) AS genre
                    FROM songs s
                    LEFT JOIN song_artists sa ON s.id = sa.song_id
                    LEFT JOIN artists a ON sa.artist_id = a.id
                    LEFT JOIN song_genres sg ON s.id = sg.song_id
                    LEFT JOIN genres g ON sg.genre_id = g.id
                    {search_condition}
                    GROUP BY s.id
                    ORDER BY s.id
                    LIMIT ? OFFSET ?
                '''
            else:
                query = f'''
                    SELECT s.id, s.name, s.year,
                        GROUP_CONCAT(DISTINCT a.name) AS artist,
                        NULL AS genre
                    FROM songs s
                    LEFT JOIN song_artists sa ON s.id = sa.song_id
                    LEFT JOIN artists a ON sa.artist_id = a.id
                    {search_condition}
                    GROUP BY s.id
                    ORDER BY s.id
                    LIMIT ? OFFSET ?
                '''
        
            # Thêm các tham số phân trang
            params = search_params + [per_page, offset]
            cursor.execute(query, params)

            rows = cursor.fetchall()
        
            # Xử lý kết quả và thay thế dấu phẩy bằng ", " khi hiển thị
            songs = []
            for row in rows:
                artist_names = row[3].split(',') if row[3] else []
                formatted_artists = ", ".join(filter(None, artist_names))
            
                song_data = {
                    'id': row[0], 
                    'name': row[1], 
                    'year': row[2], 
                    'artist': formatted_artists if formatted_artists else 'Unknown'
                }
            
                if has_genres and len(row) > 4 and row[4]:
                    genre_names = row[4].split(',')
                    formatted_genres = ", ".join(filter(None, genre_names))
                    song_data['genre'] = formatted_genres
                else:
                    song_data['genre'] = 'Chưa phân loại'
                
                songs.append(song_data)
        
            # Trả về kết quả
            return {
                'songs': songs,
                'total_songs': total_songs,
                'total_pages': total_pages,
                'current_page': page
            }
        
        except Exception as e:
            print(f"Lỗi trong get_all_songs: {str(e)}")
            import traceback
            traceback.print_exc()
            # Trả về kết quả rỗng để tránh lỗi
            return {
                'songs': [],
                'total_songs': 0,
                'total_pages': 1,
                'current_page': 1,
                'error': str(e)
            }

    def get_or_create_artist(self, artist_name):
            """Lấy ID nghệ sĩ từ tên hoặc tạo mới nếu chưa có"""
            db = self.get_db()
            cursor = db.cursor()
    
            # Tìm nghệ sĩ theo tên
            cursor.execute('SELECT id FROM artists WHERE name = ?', (artist_name,))
            result = cursor.fetchone()
    
            if result:
                return result[0]  # Trả về ID nếu đã tồn tại
    
            # Tạo nghệ sĩ mới nếu chưa tồn tại
            cursor.execute('INSERT INTO artists (name) VALUES (?)', (artist_name,))
            db.commit()
            return cursor.lastrowid

    def add_song_artist_relation(self, song_id, artist_id):
        """Thêm quan hệ giữa bài hát và nghệ sĩ"""
        db = self.get_db()
        cursor = db.cursor()
    
        # Kiểm tra xem quan hệ đã tồn tại chưa
        cursor.execute('SELECT 1 FROM song_artists WHERE song_id = ? AND artist_id = ?', 
                 (song_id, artist_id))
        if cursor.fetchone():
            return  # Quan hệ đã tồn tại
    
        # Thêm quan hệ mới
        cursor.execute('INSERT INTO song_artists (song_id, artist_id) VALUES (?, ?)', 
                 (song_id, artist_id))
        db.commit()

    def get_all_genres(self):
        """Lấy danh sách tất cả thể loại"""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('SELECT id, name FROM genres ORDER BY name')
        rows = cursor.fetchall()
        return [{'id': row[0], 'name': row[1]} for row in rows]
    
    def get_song_genres(self, song_id):
        """Lấy danh sách thể loại của một bài hát"""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('''
            SELECT g.id, g.name 
            FROM genres g
            JOIN song_genres sg ON g.id = sg.genre_id
            WHERE sg.song_id = ?
        ''', (song_id,))
        rows = cursor.fetchall()
        return [{'id': row[0], 'name': row[1]} for row in rows]
    
    def get_or_create_genre(self, genre_name):
        """Lấy ID thể loại từ tên hoặc tạo mới nếu chưa có"""
        db = self.get_db()
        cursor = db.cursor()
    
        # Chuẩn hóa tên thể loại
        genre_name = genre_name.strip().title()
    
        # Tìm thể loại theo tên
        cursor.execute('SELECT id FROM genres WHERE name = ?', (genre_name,))
        result = cursor.fetchone()
    
        if result:
            return result[0]  # Trả về ID nếu đã tồn tại
    
        # Tạo thể loại mới nếu chưa tồn tại
        cursor.execute('INSERT INTO genres (name) VALUES (?)', (genre_name,))
        db.commit()
        return cursor.lastrowid

    def add_song_genre_relation(self, song_id, genre_id):
        """Thêm quan hệ giữa bài hát và thể loại"""
        db = self.get_db()
        cursor = db.cursor()
    
        # Kiểm tra xem quan hệ đã tồn tại chưa
        cursor.execute('SELECT 1 FROM song_genres WHERE song_id = ? AND genre_id = ?', 
                  (song_id, genre_id))
        if cursor.fetchone():
            return  # Quan hệ đã tồn tại
    
        # Thêm quan hệ mới
        cursor.execute('INSERT INTO song_genres (song_id, genre_id) VALUES (?, ?)', 
                  (song_id, genre_id))
        db.commit()

    def delete_song(self, song_id):
        """Xóa bài hát theo ID."""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('DELETE FROM songs WHERE id = ?', (song_id,))
        db.commit()
        return cursor.rowcount > 0

    def update_song(self, song_id, song_data):
        """Cập nhật thông tin bài hát."""
        db = self.get_db()
        cursor = db.cursor()

        # Xây dựng câu lệnh UPDATE động dựa trên dữ liệu được cung cấp
        fields = []
        values = []
    
        for key, value in song_data.items():
            if key != 'id':  # Không cập nhật id
                fields.append(f"{key} = ?")
                values.append(value)
    
        if not fields:
            return False
    
        values.append(song_id)  # Thêm id vào cuối để dùng trong WHERE
    
        query = f"UPDATE songs SET {', '.join(fields)} WHERE id = ?"
        cursor.execute(query, values)
        db.commit()
    
        return cursor.rowcount > 0
    def get_song_by_id(self, song_id):
            db = self.get_db()
            db.row_factory = sqlite3.Row
            cursor = db.cursor()
            cursor.execute('SELECT * FROM songs WHERE id = ?', (song_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_songs_by_cluster(self, cluster_label, exclude_id=None, limit=10):
        db = self.get_db()
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        if exclude_id:
            cursor.execute('SELECT id, name FROM songs WHERE cluster_label = ? AND id != ? LIMIT ?', (cluster_label, exclude_id, limit))
        else:
            cursor.execute('SELECT id, name FROM songs WHERE cluster_label = ? LIMIT ?', (cluster_label, limit))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def add_song(self, song_data):
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO songs (
                id, name, year, popularity, danceability, energy, valence, loudness,
                acousticness, instrumentalness, liveness, speechiness, duration_ms, explicit,
                key, mode, release_date, tempo, cluster_label
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            song_data['id'], song_data['name'], song_data['year'], song_data['popularity'],
            song_data['danceability'], song_data['energy'], song_data['valence'], song_data['loudness'],
            song_data['acousticness'], song_data['instrumentalness'], song_data['liveness'], song_data['speechiness'],
            song_data['duration_ms'], song_data['explicit'], song_data['key'], song_data['mode'],
            song_data['release_date'], song_data['tempo'], song_data['cluster_label']
        ))
        db.commit()
    # Playlist methods
    def create_playlist(self, user_id, name):
        """Tạo playlist cho người dùng."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO playlists (user_id, name) VALUES (?, ?)', (user_id, name))
            conn.commit()
            return cursor.lastrowid

    def get_playlists(self, user_id):
        """Lấy tất cả playlist của người dùng."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT p.id, p.name, p.created_at, GROUP_CONCAT(ps.song_id) as songs
                FROM playlists p
                LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
                WHERE p.user_id = ?
                GROUP BY p.id, p.name, p.created_at
            ''', (user_id,))
            playlists = cursor.fetchall()
            return [{'id': p[0], 'name': p[1], 'created_at': p[2], 'songs': p[3].split(',') if p[3] else []} for p in playlists]

    def song_in_playlist(self, playlist_id, song_id):
        """Kiểm tra xem bài hát đã có trong playlist chưa."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', (playlist_id, song_id))
            return cursor.fetchone() is not None

    def add_song_to_playlist(self, playlist_id, song_id):
        """Thêm bài hát vào playlist."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)', (playlist_id, song_id))
            conn.commit()

# Cách sử dụng lớp Database
if __name__ == "__main__":
    db = Database('music_recommendation.sqlite')

