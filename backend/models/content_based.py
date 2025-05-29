import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import os

class ContentBasedRecommender:
    def __init__(self, db, metric='cosine', n_clusters=30, n_components=4):
        self.db = db
        self.features = ['danceability', 'energy', 'valence', 'tempo', 'loudness', 'acousticness', 'instrumentalness', 'liveness', 'speechiness']
        self.metric = metric
        self.n_clusters = n_clusters
        self.n_components = n_components
        self.df_songs = None
        self.feature_matrix = None
        self.knn_songs = None
        self.scaler = StandardScaler()
        self.kmeans = None
        self.pca = PCA(n_components=n_components)

    def _initialize(self):
        if self.df_songs is None:
            self.df_songs = pd.read_csv('data/processed_spotify_data_with_emotions.csv')
            self.df_songs['year'] = self.df_songs['year'].astype(int)

            self.feature_matrix = self.df_songs[self.features].values
            self.feature_matrix = self.pca.fit_transform(self.feature_matrix)
            self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42)
            self.df_songs['cluster'] = self.kmeans.fit_predict(self.feature_matrix)
            self.knn_songs = NearestNeighbors(n_neighbors=20, metric=self.metric)
            self.knn_songs.fit(self.feature_matrix)

    def get_candidate_set(self, history=None, preferences=None):
        self._initialize()
        if not history and not preferences:
            candidate_set = self.df_songs[
                (self.df_songs['year'] >= 2015) | (self.df_songs['popularity'] >= 80)
            ]
            return candidate_set.sample(min(1000, len(candidate_set)))

        if preferences:
            genres = preferences.get('genres', [])
            artists = preferences.get('artists', [])
            song_genres = pd.read_csv('data/song_genres.csv') if os.path.exists('data/song_genres.csv') else pd.DataFrame()
            if not song_genres.empty:
                genre_songs = song_genres[song_genres['genre'].isin(genres)]['song_id'].unique()
                candidate_set = self.df_songs[
                    (self.df_songs['artist'].isin(artists)) | (self.df_songs['id'].isin(genre_songs))
                ]
            else:
                candidate_set = self.df_songs[self.df_songs['artist'].isin(artists)]
        else:
            track_ids = [row[0] for row in history]
            artists = [row[2] for row in history]
            genres = []
            song_genres = pd.read_csv('data/song_genres.csv') if os.path.exists('data/song_genres.csv') else pd.DataFrame()
            if not song_genres.empty:
                for track_id in track_ids:
                    track_genres = song_genres[song_genres['song_id'] == track_id]['genre'].tolist()
                    genres.extend(track_genres)
                genre_songs = song_genres[song_genres['genre'].isin(genres)]['song_id'].unique()
                candidate_set = self.df_songs[
                    (self.df_songs['artist'].isin(artists)) | (self.df_songs['id'].isin(genre_songs))
                ]
            else:
                candidate_set = self.df_songs[self.df_songs['artist'].isin(artists)]

        if len(candidate_set) < 100:
            additional_songs = self.df_songs[self.df_songs['year'] >= 2010]
            candidate_set = pd.concat([candidate_set, additional_songs]).drop_duplicates(subset=['id'])

        return candidate_set.sample(min(1000, len(candidate_set)))

    def get_user_profile(self, history=None, preferences=None):
        self._initialize()
        if preferences:
            candidate_set = self.get_candidate_set(history=None, preferences=preferences)
            profile_features = candidate_set[self.features].mean().values.reshape(1, -1)
            return self.pca.transform(profile_features)

        if not history:
            return None

        track_ids = [row[0] for row in history]
        audio_features = [
            self.df_songs[self.df_songs['id'] == tid][self.features].to_dict('records')[0]
            for tid in track_ids if tid in self.df_songs['id'].values
        ]
        if not audio_features:
            return None

        df_features = pd.DataFrame(audio_features)
        user_profile_raw = df_features[self.features].mean().values.reshape(1, -1)
        user_profile = self.pca.transform(user_profile_raw)
        return user_profile

    def recommend(self, user_profile, candidate_set, top_k=10):
        self._initialize()
        if user_profile is None:
            return candidate_set.sort_values('popularity', ascending=False).head(top_k)[['id', 'name', 'artist']].to_dict('records')

        candidate_matrix = self.pca.transform(candidate_set[self.features].values)
        candidate_indices = candidate_set.index

        distances, indices = self.knn_songs.kneighbors(user_profile, n_neighbors=min(top_k, len(candidate_set)))
        top_candidates = candidate_set.iloc[indices[0]].copy()
        top_candidates['score'] = distances[0]
        top_candidates = top_candidates.sort_values(['score', 'popularity', 'year'], ascending=[True, False, False])
        return top_candidates[['id', 'name', 'artist']].head(top_k).to_dict('records')

    def get_similar_songs(self, song_id, top_k=10):
        self._initialize()
        if song_id not in self.df_songs['id'].values:
            return []
        song_features = self.df_songs[self.df_songs['id'] == song_id][self.features].values
        song_features = self.pca.transform(song_features)
        cluster = self.df_songs[self.df_songs['id'] == song_id]['cluster'].iloc[0]
        candidate_set = self.df_songs[self.df_songs['cluster'] == cluster]
        candidate_matrix = self.pca.transform(candidate_set[self.features].values)
        distances, indices = self.knn_songs.kneighbors(song_features, n_neighbors=min(top_k + 1, len(candidate_set)))
        top_candidates = candidate_set.iloc[indices[0]].copy()
        top_candidates = top_candidates[top_candidates['id'] != song_id]
        return top_candidates[['id', 'name', 'artist']].head(top_k).to_dict('records')