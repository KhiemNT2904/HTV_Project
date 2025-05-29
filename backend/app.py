from flask import Flask, request, jsonify
from models.content_based import ContentBasedRecommender
from models.collaborative import CollaborativeRecommender
from models.hybrid import HybridRecommender
from db import Database
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
import bcrypt
from datetime import timedelta

from spotify import get_artist_image, get_track_image  # Import bcrypt
from utils import predict_cluster_label


app = Flask(__name__)
CORS(app)
# Configure JWT
app.config['JWT_SECRET_KEY'] = 'super-secret-key'  # Thay bằng key bảo mật của bạn
jwt = JWTManager(app)
timedelta(days=30) 

# Initialize recommenders
db = Database('music_recommendation.sqlite')
content_based = ContentBasedRecommender(db)
collaborative = CollaborativeRecommender(db)
hybrid = HybridRecommender(content_based, collaborative)

@app.route('/') 
def hello():
    return ("hello world")

# ----------- API: gợi ý bài hát phổ biến cho khách -----------
@app.route('/recommend_songs/guest', methods=['GET'])
def recommend_songs():
    top_k = int(request.args.get('top_k', 10))
    recommendations = content_based.get_candidate_set().sort_values(['popularity', 'year'], ascending=[False, False]).head(top_k)[['id', 'name', 'artist']].to_dict('records')
    
    results = []
    for song in recommendations:
        track_name = song['name']
        artist_name = song['artist']
        image_url = get_track_image(track_name, artist_name)
        results.append({
            'id': song['id'],
            'name': track_name,
            'artist': artist_name,
            'image_url': image_url
        })

    return jsonify(results), 200


# ----------- API: gợi ý nghệ sĩ yêu thích cho khách -----------
@app.route('/recommend_artists/guest', methods=['GET'])
def recommend_artists():
    try:
        artists = db.get_artist()

        enriched_artists = []
        for artist in artists:
            image_url = get_artist_image(artist['name'])
            artist['image_url'] = image_url or ''  # Thêm ảnh vào object
            enriched_artists.append(artist)

        return jsonify(enriched_artists), 200
    except Exception as e:
        print("Lỗi khi lấy nghệ sĩ:", e)
        return jsonify({"error": "Không thể lấy danh sách nghệ sĩ"}), 500


# ----------- API: Đăng kí -----------
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    # Kiểm tra nếu người dùng đã tồn tại
    if db.get_user(username):
        return jsonify({'error': 'Username already exists'}), 400

    # Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    # Lưu người dùng mới vào cơ sở dữ liệu
    user_id = db.add_user(username, hashed_password)

    # Tạo token JWT cho người dùng mới
    access_token = create_access_token(identity=str(user_id))

    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user_id,
            'username': username,
            'isNewUser': True  # Vì đây là người dùng mới
        }
    }), 201

# ----------- API: Đăng nhập -----------
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = db.get_user(username)
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):  # Kiểm tra mật khẩu đã mã hóa
        access_token = create_access_token(identity=str(user['id']))
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user['id'],
                'username': username,
                'isNewUser': False  # Có thể cập nhật theo logic của bạn
            }
        }), 200
    return jsonify({'error': 'Invalid credentials'}), 401


# ----------- API: Thêm nghệ sĩ yêu thích  -----------
@app.route('/add_artists_preferences', methods=['POST'])
@jwt_required()
def add_artists_preferences():
    user_id = get_jwt_identity()  # Lấy từ token
    data = request.get_json()
    artist_ids = data.get("artist_ids", [])

    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id"}), 400

    for aid in artist_ids:
        db.add_artists_preferences(user_id, artist_id=aid)

    return jsonify({"success": True, "message": "Preferences saved successfully"}), 200

# ----------- API: Lấy nghệ sĩ yêu thích  -----------
@app.route('/get_artist_preferences', methods=['GET'])
@jwt_required()
def get_artist_preferences():
    
    try:
        user_id = get_jwt_identity()
        data = db.get_artists_preferences(user_id)

        enriched_artists = []
        for artist in data:
            image_url = get_artist_image(artist['name'])
            artist['image_url'] = image_url or ''  # Thêm ảnh vào object
            enriched_artists.append(artist)

        return jsonify(enriched_artists), 200
    except Exception as e:
        print("Lỗi khi lấy nghệ sĩ:", e)
        return jsonify({"error": "Không thể lấy danh sách nghệ sĩ"}), 500
    

# ----------- API: Lấy nghệ sĩ hiển thị cho người dùng chọn  -----------
@app.route('/artists', methods=['GET'])
def get_artist():
    try:
        artists = db.get_artist()
        return jsonify(artists), 200
    except Exception as e:
        print("Lỗi khi lấy genres:", e)
        return jsonify({"error": "Không thể lấy danh sách nghệ sĩ"}), 500


# ----------- API: Lưu bài hát vào csdl -----------
@app.route('/add_song_history', methods=['POST'])
@jwt_required()
def add_song_history():
    user_id = get_jwt_identity()
    data = request.get_json()
    song_id = data.get("song_id")
    #duration = data.get("duration")

    if not user_id:
        return jsonify({"success": False, "message": "Missing song_id"}), 400
    
    try:
        db.add_song_history(user_id, song_id)
        return jsonify({"success": True, "message": "Song history added"}), 201
    except Exception as e:
        print(f"Lỗi khi thêm lịch sử nghe nhạc: {e}")
         # In thêm thông tin debug
        print(f"user_id: {user_id}, song_id: {song_id}")
        return jsonify({"success": False, "message": "Failed to add song history"}), 500


# ----------- API: Lấy bài hát từ csdl -----------
@app.route('/get_song_history', methods=['GET'])
@jwt_required()
def get_song_history():
    try:
        user_id = get_jwt_identity()
        data = db.get_song_history(user_id)

        enriched_artists = []
        for song in data:
            image_url = get_track_image(song['name'])
            song['image_url'] = image_url or ''  # Thêm ảnh vào object
            enriched_artists.append(song)

        #print("🎵 Data từ DB:", data)
        return jsonify(enriched_artists), 200
    except Exception as e:
        print("Lỗi khi lấy bài hát:", e)
        return jsonify({"error": "Không thể lấy danh sách bài hát"}), 500


# ----------- API: Thêm bài hát -----------
@app.route('/add_song', methods=['POST'])
def add_song():
    data = request.get_json()
    # Lấy các trường số
    try:
        song_features = {col: float(data[col]) for col in [
            'valence', 'year', 'acousticness', 'danceability', 'duration_ms', 'energy', 'explicit',
            'instrumentalness', 'key', 'liveness', 'loudness', 'mode', 'popularity', 'speechiness', 'tempo'
        ]}
    except Exception as e:
        return jsonify({'error': f'Missing or invalid song features: {e}'}), 400

    # Dự đoán cluster_label
    cluster_label = predict_cluster_label(song_features)
    data['cluster_label'] = cluster_label

    # Lưu bài hát vào DB (bạn cần có hàm add_song trong db.py)
    db.add_song(data)  # Bạn cần tự định nghĩa hàm này để insert vào bảng songs

    return jsonify({'success': True, 'cluster_label': cluster_label}), 201


# ----------- API: Trả về bài hát cùng cụm -----------
@app.route('/songs/cluster/<song_id>', methods=['GET'])
def get_songs_in_cluster(song_id):
    # Lấy cluster_label của bài hát này
    song = db.get_song_by_id(song_id)
    if not song:
        return jsonify({'error': 'Song not found'}), 404

    cluster_label = song.get('cluster_label')
    if cluster_label is None:
        return jsonify({'error': 'Song does not have cluster label'}), 400

    
    # Lấy các bài hát cùng cluster
    songs_in_cluster = db.get_songs_by_cluster(cluster_label, exclude_id=song_id)

    enriched_artists = []
    for song in songs_in_cluster:
        image_url = get_track_image(song['name'])
        song['image_url'] = image_url or ''  # Thêm ảnh vào object
        enriched_artists.append(song)
        
    return jsonify(enriched_artists), 200
























# #--------------------------------------------------------------------------------------
# @app.route('/recommend/new_user', methods=['POST'])
# @jwt_required()
# def recommend_new_user():
#     user_id = get_jwt_identity()
#     user = db.get_user_by_id(user_id)
#     if not user:
#         return jsonify({'error': 'User not found'}), 404

#     data = request.get_json()
#     preferences = db.get_user_preferences(user_id)
#     if 'preferences' in data:
#         preferences.update(data['preferences'])
#     top_k = data.get('top_k', 10)

#     user_profile = content_based.get_user_profile(preferences=preferences)
#     candidate_set = content_based.get_candidate_set(preferences=preferences)
#     recommendations = content_based.recommend(user_profile, candidate_set, top_k)
#     return jsonify(recommendations), 200

# @app.route('/recommend/user/<user_id>', methods=['GET'])
# @jwt_required()
# def recommend_user(user_id):
#     current_user_id = get_jwt_identity()
#     if int(user_id) != current_user_id:
#         return jsonify({'error': 'Unauthorized access'}), 403

#     top_k = int(request.args.get('top_k', 10))
#     history = db.get_user_history(user_id)
#     user = db.get_user_by_id(user_id)
#     preferences = db.get_user_preferences(user_id)
#     recommendations = hybrid.recommend(user_id, history, preferences, top_k)
#     return jsonify(recommendations), 200

# @app.route('/song/select', methods=['POST'])
# @jwt_required()
# def select_song():
#     user_id = get_jwt_identity()
#     data = request.get_json()
#     song_id = data.get('song_id')
#     duration = data.get('duration', 0)

#     db.add_user_history(user_id, song_id, duration)
#     similar_songs = content_based.get_similar_songs(song_id, top_k=5)
#     history = db.get_user_history(user_id)
#     recommendations = hybrid.recommend(user_id, history, top_k=5)
#     return jsonify({'similar_songs': similar_songs, 'recommendations': recommendations}), 200

# @app.route('/search/context', methods=['POST'])
# def search_by_context():
#     data = request.get_json()
#     context = data.get('context')
#     top_k = data.get('top_k', 10)

#     context_to_emotion = {
#         'sad': 'sad',
#         'happy': 'happy',
#         'relax': 'relaxed',
#         'workout': 'energetic',
#         'party': 'energetic',
#         'study': 'relaxed',
#         'angry': 'angry',
#         'romantic': 'romantic'
#     }

#     emotion = context_to_emotion.get(context.lower())
#     if not emotion:
#         return jsonify({'error': 'Invalid context'}), 400

#     df_songs = content_based.get_candidate_set()
#     results = df_songs[df_songs['emotion'] == emotion].sort_values('popularity', ascending=False).head(top_k)[['id', 'name', 'artist']].to_dict('records')
#     return jsonify(results), 200

# @app.route('/playlist/create', methods=['POST'])
# @jwt_required()
# def create_playlist():
#     user_id = get_jwt_identity()
#     data = request.get_json()
#     name = data.get('name')

#     if not name:
#         return jsonify({'error': 'Playlist name is required'}), 400

#     playlist_id = db.create_playlist(user_id, name)
#     return jsonify({'message': 'Playlist created', 'playlist_id': playlist_id}), 201

# @app.route('/playlist/add_song', methods=['POST'])
# @jwt_required()
# def add_song_to_playlist():
#     user_id = get_jwt_identity()
#     data = request.get_json()
#     playlist_id = data.get('playlist_id')
#     song_id = data.get('song_id')

#     if not db.get_playlist(playlist_id, user_id) or not song_id:
#         return jsonify({'error': 'Invalid playlist or song ID'}), 400

#     if db.song_in_playlist(playlist_id, song_id):
#         return jsonify({'error': 'Song already in playlist'}), 400

#     db.add_song_to_playlist(playlist_id, song_id)
#     return jsonify({'message': 'Song added to playlist'}), 200

# @app.route('/playlist/get/<user_id>', methods=['GET'])
# @jwt_required()
# def get_playlists(user_id):
#     current_user_id = get_jwt_identity()
#     if int(user_id) != current_user_id:
#         return jsonify({'error': 'Unauthorized access'}), 403

#     playlists = db.get_playlists(user_id)
#     df_songs = content_based.get_candidate_set()
#     result = []
#     for playlist in playlists:
#         songs = df_songs[df_songs['id'].isin(playlist['songs'])][['id', 'name', 'artist']].to_dict('records')
#         result.append({'name': playlist['name'], 'songs': songs})
#     return jsonify(result), 200

if __name__ == "__main__":
    app.run(debug=True)