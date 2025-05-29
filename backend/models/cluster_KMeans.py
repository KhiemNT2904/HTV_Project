import pandas as pd
import sqlite3
from sklearn.cluster import KMeans
import numpy as np
import pickle

# 1. Đọc dữ liệu từ database
conn = sqlite3.connect('../music_recommendation.sqlite')
df = pd.read_sql_query("SELECT * FROM songs", conn)

# 2. Chọn các cột số để clustering
number_cols = [
    'valence', 'year', 'acousticness', 'danceability', 'duration_ms', 'energy', 'explicit',
    'instrumentalness', 'key', 'liveness', 'loudness', 'mode', 'popularity', 'speechiness', 'tempo'
]
X = df[number_cols].fillna(0).values

# 3. Chạy KMeans
n_clusters = 10
kmeans = KMeans(n_clusters=n_clusters, random_state=42)
cluster_labels = kmeans.fit_predict(X)

# 4. Lưu mô hình KMeans
with open('kmeans_model.pkl', 'wb') as f:
    pickle.dump(kmeans, f)

# 5. Cập nhật cluster_label vào database như cũ
for song_id, label in zip(df['id'], cluster_labels):
    conn.execute("UPDATE songs SET cluster_label = ? WHERE id = ?", (int(label), song_id))
conn.commit()
conn.close()

print("Đã phân cụm và lưu mô hình KMeans.")