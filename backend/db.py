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

    def add_user(self, username, password):
        """Thêm người dùng vào cơ sở dữ liệu."""
        db = self.get_db()
        cursor = db.cursor()
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password))
        db.commit()
        return cursor.lastrowid

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
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
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

