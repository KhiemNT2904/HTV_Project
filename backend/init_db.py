import sqlite3

def init_db(db_path='music_recommendation.sqlite'):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # tao bang
    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS songs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            year INTEGER,
            popularity INTEGER,
            danceability FLOAT, 
            energy FLOAT,
            valence FLOAT, 
            loudness FLOAT,
            acousticness FLOAT,
            instrumentalness FLOAT,
            liveness FLOAT,
            speechiness FLOAT,
            duration_ms INTEGER,
            explicit INTEGER,
            key INTEGER,
            mode INTEGER,
            release_date TEXT,
            tempo FLOAT,
            cluster_label INTEGER
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS genres (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS song_genres (
            song_id TEXT NOT NULL,
            genre_id INTEGER NOT NULL,
            PRIMARY KEY (song_id, genre_id),
            FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
            FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS song_artists (
            song_id TEXT NOT NULL,
            artist_id INTEGER NOT NULL,
            PRIMARY KEY (song_id, artist_id),
            FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
            FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE           
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP           
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
                   user_id INTEGER NOT NULL,
                   name TEXT NOT NULL,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                   last_login TIMESTAMP           
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS playlist_songs (
            playlist_id INTEGER NOT NULL,
            song_id TEXT NOT NULL,
            PRIMARY KEY (playlist_id, song_id),
            FOREIGN KEY (playlist_id) 
                   REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE           
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS user_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            song_id TEXT NOT NULL,
            duration FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            precision FLOAT,
            recall FLOAT,
            f1_score FLOAT,
            novelty FLOAT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE           
        )
    ''')

    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            genre_id INTEGER,
            artist_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE SET NULL,
            FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL
        )
    ''')

    conn.commit()
    conn.close()
    print(f"Database initialized at {db_path}")

if __name__ == "__main__":
    init_db()
