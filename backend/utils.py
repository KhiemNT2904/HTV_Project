import pickle
import numpy as np

number_cols = [
    'valence', 'year', 'acousticness', 'danceability', 'duration_ms', 'energy', 'explicit',
    'instrumentalness', 'key', 'liveness', 'loudness', 'mode', 'popularity', 'speechiness', 'tempo'
]

def predict_cluster_label(song_features_dict):
    # song_features_dict: dict chứa các trường số của bài hát mới
    with open('models/kmeans_model.pkl', 'rb') as f:
        kmeans = pickle.load(f)
    # Đảm bảo đúng thứ tự cột
    vector = np.array([song_features_dict[col] for col in number_cols]).reshape(1, -1)
    label = int(kmeans.predict(vector)[0])
    return label