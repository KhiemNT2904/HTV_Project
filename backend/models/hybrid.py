import pandas as pd
from datetime import datetime

class HybridRecommender:
    def __init__(self, content_based, collaborative):
        self.content_based = content_based
        self.collaborative = collaborative

    def recommend_hybrid(self, user_id, user_item_matrix, user_similarity, db, top_k=10, history=None, preferences=None):
        if not history:
            history = db.get_history(user_id)

        candidate_set = self.content_based.get_candidate_set(history, preferences)
        user_profile = self.content_based.get_user_profile(history, preferences)

        history_size = len(history) if history else 0
        content_weight = 0.8 if history_size < 5 else 0.5
        collab_weight = 1 - content_weight
        content_k = int(top_k * content_weight)
        collab_k = top_k - content_k

        content_recommendations = self.content_based.recommend(user_profile, candidate_set, top_k=content_k)
        collab_recommendations = self.collaborative.recommend(user_id, user_item_matrix, self.content_based.df_songs, top_k=collab_k)

        combined_recommendations = content_recommendations + collab_recommendations
        combined_df = pd.DataFrame(combined_recommendations).drop_duplicates(subset=['id'])

        if len(combined_df) < top_k:
            additional = self.content_based.df_songs[~self.content_based.df_songs['id'].isin(combined_df['id'])].sample(top_k - len(combined_df))
            combined_df = pd.concat([combined_df, additional])

        return combined_df[['id', 'name', 'artist']].to_dict('records')

    def select_song(self, user_id, song_id, db, duration=10):
        conn = db.get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT name, artist FROM songs WHERE id = ?', (song_id,))
        song_info = cursor.fetchone()
        if not song_info:
            conn.close()
            return {'error': f'Song with ID {song_id} not found.'}

        if duration >= 10:
            cursor.execute('INSERT OR IGNORE INTO user_history (user_id, song_id, timestamp) VALUES (?, ?, ?)',
                           (user_id, song_id, datetime.now()))
            conn.commit()

        history = db.get_history(user_id)
        user_item_matrix, user_item_df = self.collaborative.build_user_item_matrix()
        user_similarity = self.collaborative.compute_user_similarity(user_item_matrix, user_item_df)
        recommendations = self.recommend_hybrid(user_id, user_item_df, user_similarity, db, top_k=10)
        similar_songs = self.content_based.get_similar_songs(song_id, top_k=10)

        conn.close()
        return {
            'recommendations': recommendations,
            'similar_songs': similar_songs,
            'history': [{'song_id': row[0], 'name': row[1], 'artist': row[2], 'timestamp': row[3]} for row in history]
        }