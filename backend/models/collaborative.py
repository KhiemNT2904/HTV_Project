import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity

class CollaborativeRecommender:
    def __init__(self, db, n_components=30):
        self.db = db
        self.n_components = n_components
        self.svd = TruncatedSVD(n_components=n_components, random_state=42)

    def build_user_item_matrix(self):
        history = pd.DataFrame(self.db.get_all_history(), columns=['user_id', 'song_id'])
        if history.empty:
            return None, None
        user_item_matrix = pd.pivot_table(history,
                                         index='user_id',
                                         columns='song_id',
                                         aggfunc=lambda x: 1,
                                         fill_value=0)
        sparse_matrix = csr_matrix(user_item_matrix.values)
        return sparse_matrix, user_item_matrix

    def compute_user_similarity(self, sparse_matrix, user_item_matrix):
        if sparse_matrix is None:
            return pd.DataFrame()
        reduced_matrix = self.svd.fit_transform(sparse_matrix)
        user_similarity = cosine_similarity(reduced_matrix)
        return pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)

    def find_similar_users(self, user_id, user_similarity, top_k=5):
        if user_similarity.empty or user_id not in user_similarity.index:
            return []
        similar_users = user_similarity.loc[user_id].sort_values(ascending=False)[1:top_k+1]
        return similar_users.index.tolist()

    def recommend(self, user_id, user_item_matrix, df_songs, top_k=10):
        if user_item_matrix is None:
            return df_songs.sort_values('popularity', ascending=False).head(top_k)[['id', 'name', 'artist']].to_dict('records')

        similar_users = self.find_similar_users(user_id, user_similarity, top_k_users=5)
        if not similar_users:
            return df_songs.sort_values('popularity', ascending=False).head(top_k)[['id', 'name', 'artist']].to_dict('records')

        user_tracks = set(user_item_matrix.loc[user_id][user_item_matrix.loc[user_id] == 1].index)
        similar_user_tracks = set()
        for similar_user in similar_users:
            similar_user_tracks.update(user_item_matrix.loc[similar_user][user_item_matrix.loc[similar_user] == 1].index)

        candidate_tracks = similar_user_tracks - user_tracks
        if not candidate_tracks:
            return df_songs.sort_values('popularity', ascending=False).head(top_k)[['id', 'name', 'artist']].to_dict('records')

        recommendations = df_songs[df_songs['id'].isin(candidate_tracks)][['id', 'name', 'artist']]
        return recommendations.sort_values('popularity', ascending=False).head(top_k).to_dict('records')