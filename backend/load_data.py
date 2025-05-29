import sqlite3
import csv
import ast

def insert_artists(cursor, artists):
    for artist in artists:
        cursor.execute('''
            INSERT OR IGNORE INTO artists (name)
            VALUES (?)
        ''', (artist,))

def insert_genres(cursor, genres):
    for genre in genres:
        cursor.execute('''
            INSERT OR IGNORE INTO genres (name)
            VALUES (?)
        ''', (genre,))

def insert_song(cursor, song_data):
    cursor.execute('''
        INSERT OR IGNORE INTO songs
        (id, name, year, popularity, danceability, energy, valence, loudness,
         acousticness, instrumentalness, liveness, speechiness, duration_ms, explicit,
         key, mode, release_date, tempo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', song_data)

def insert_song_artists(cursor, song_id, artists):
    for artist in artists:
        cursor.execute('''
            INSERT OR IGNORE INTO song_artists (song_id, artist_id)
            SELECT ?, id FROM artists WHERE name = ?
        ''', (song_id, artist))

def insert_song_genres(cursor, song_id, genres):
    for genre in genres:
        cursor.execute('''
            INSERT OR IGNORE INTO song_genres (song_id, genre_id)
            SELECT ?, id FROM genres WHERE name = ?
        ''', (song_id, genre))

def parse_artists(artist_str):
    try:
        artists = ast.literal_eval(artist_str)
        if not isinstance(artists, list):
            artists = [artists]
    except (ValueError, SyntaxError):
        artists = [artist_str]
    return artists
def import_data_csv(data_csv_path, conn):
    cursor = conn.cursor()
    with open(data_csv_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                song_id = row['id']
                song_name = row['name']
                year = int(row['year'])
                popularity = int(row['popularity'])
                danceability = float(row['danceability'])
                energy = float(row['energy'])
                valence = float(row['valence'])
                loudness = float(row['loudness'])
                acousticness = float(row['acousticness'])
                instrumentalness = float(row['instrumentalness'])
                liveness = float(row['liveness'])
                speechiness = float(row['speechiness'])
                duration_ms = int(float(row['duration_ms']))
                explicit = int(row['explicit'])
                key_ = int(row['key'])
                mode = int(row['mode'])
                release_date = row['release_date']
                tempo = float(row['tempo'])

                song_data = (
                    song_id, song_name, year, popularity,
                    danceability, energy, valence, loudness,
                    acousticness, instrumentalness, liveness, speechiness,
                    duration_ms, explicit, key_, mode, release_date, tempo
                )

                insert_song(cursor, song_data)

                artists = parse_artists(row['artists'])
                insert_artists(cursor, artists)
                insert_song_artists(cursor, song_id, artists)

            except Exception as e:
                print(f"[DATA ERROR] Row skipped: {e}")
    print(f"✔ Finished importing songs & artists from {data_csv_path}")

def import_song_genres_csv(song_genres_csv_path, conn):
    cursor = conn.cursor()
    with open(song_genres_csv_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                song_id = row['song_id']
                genre = row['genre'].strip()

                insert_genres(cursor, [genre])
                insert_song_genres(cursor, song_id, [genre])
            except Exception as e:
                print(f"[GENRE ERROR] Row skipped: {e}")
    print(f"✔ Finished importing song genres from {song_genres_csv_path}")

def import_all(data_csv_path, song_genres_csv_path, db_path='music_recommendation.sqlite'):
    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA foreign_keys = ON')
    import_data_csv(data_csv_path, conn)
    import_song_genres_csv(song_genres_csv_path, conn)
    conn.commit()
    conn.close()
    print("✅ All data imported successfully.")

if __name__ == "__main__":
    data_csv = './data/data.csv'
    song_genres_csv = './data/song_genres.csv'
    db_path = 'music_recommendation.sqlite'
    import_all(data_csv, song_genres_csv, db_path)
