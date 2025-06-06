from flask import Flask, request, jsonify
from models.content_based import ContentBasedRecommender
from models.collaborative import CollaborativeRecommender
from models.hybrid import HybridRecommender
from db import Database
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
import bcrypt
from datetime import timedelta
from functools import wraps
from spotify import get_artist_image, get_track_image  # Import bcrypt
from utils import predict_cluster_label


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000", "supports_credentials": True}})
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Thay đổi cài đặt JWT
app.config['JWT_SECRET_KEY'] = 'super-secret-key'  # Thay bằng key bảo mật của bạn
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Token không bao giờ hết hạn
jwt = JWTManager(app)

# Initialize recommenders
db = Database('../music_recommendation.sqlite')
content_based = ContentBasedRecommender(db)
collaborative = CollaborativeRecommender(db)
hybrid = HybridRecommender(content_based, collaborative)
# ----------- API: admin -----------
# Thêm decorator kiểm tra admin
def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = db.get_user_by_id(user_id)
        if not user or user['role'] != 'admin':
            return jsonify({"error": "Admin privileges required"}), 403
        return fn(*args, **kwargs)
    return wrapper

@app.route('/refresh-token', methods=['POST'])
@jwt_required()
def refresh_token():
    """Làm mới token JWT trước khi hết hạn"""
    try:
        # Lấy identity của người dùng hiện tại
        current_user_id = get_jwt_identity()
        
        # Tạo token mới
        new_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'success': True,
            'access_token': new_token
        }), 200
    except Exception as e:
        print(f"Lỗi khi làm mới token: {str(e)}")
        return jsonify({'error': 'Không thể làm mới token'}), 500
    
    # Kiểm tra người dùng có phải admin không
@app.route('/check_admin', methods=['GET'])
@jwt_required()
def check_admin():
    user_id = get_jwt_identity()
    user = db.get_user_by_id(user_id)
    if user and user['role'] == 'admin':
        return jsonify({"is_admin": True}), 200
    return jsonify({"is_admin": False}), 200

# API quản lý người dùng (chỉ admin)
@app.route('/admin/users', methods=['GET'])
@admin_required
def get_users():
    users = db.get_all_users()
    return jsonify(users), 200


@app.route('/admin/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    if db.delete_user(user_id):
        return jsonify({"success": True, "message": "User deleted"}), 200
    return jsonify({"success": False, "message": "User not found or cannot delete admin"}), 404

@app.route('/admin/users/<user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    data = request.get_json()
    role = data.get('role')
    if not role or role not in ['user', 'admin']:
        return jsonify({"error": "Invalid role"}), 400
    
    if db.update_user_role(user_id, role):
        return jsonify({"success": True, "message": "User role updated"}), 200
    return jsonify({"success": False, "message": "User not found"}), 404

@app.route('/admin/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    try:
        # Kiểm tra xem username đã tồn tại chưa (nếu đang thay đổi username)
        if username:
            existing_user = db.get_user(username)
            if existing_user and str(existing_user['id']) != user_id:
                return jsonify({"error": "Username already exists"}), 400
        
        # Cập nhật thông tin người dùng
        result = db.update_user(user_id, username, password)
        
        if result:
            return jsonify({"success": True, "message": "User updated successfully"}), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        print("Error updating user:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500




@app.route('/admin/songs', methods=['GET'])
@admin_required
def get_all_songs():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', None)
        
        print(f"Fetching songs with page={page}, per_page={per_page}, search={search}")
        
        # Truyền thêm tham số search vào hàm get_all_songs
        result = db.get_all_songs(page, per_page, search)
        
        print(f"Found {len(result.get('songs', []))} songs")
        
        # Kết quả từ hàm get_all_songs đã bao gồm thông tin phân trang
        return jsonify(result), 200
    except Exception as e:
        print("Lỗi khi lấy danh sách bài hát:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/admin/songs/<song_id>', methods=['DELETE'])
@admin_required
def delete_song(song_id):
    if db.delete_song(song_id):
        return jsonify({"success": True, "message": "Song deleted"}), 200
    return jsonify({"success": False, "message": "Song not found"}), 404

# Cập nhật route update_song để xử lý thể loại
@app.route('/admin/songs/<song_id>', methods=['PUT'])
@admin_required
def update_song(song_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        # Tách nghệ sĩ và thể loại khỏi dữ liệu để xử lý riêng
        artist_name = None
        genre_name = None
        
        if 'artist' in data:
            artist_name = data.pop('artist')  # Lấy và xóa artist khỏi data
            
        if 'genre' in data:
            genre_name = data.pop('genre')  # Lấy và xóa genre khỏi data
        
        # Cập nhật thông tin bài hát
        update_success = db.update_song(song_id, data)
        if not update_success:
            return jsonify({"success": False, "message": "Song not found"}), 404
        
        # Nếu có thông tin nghệ sĩ, cập nhật quan hệ song_artists
        if artist_name:
            # Xóa quan hệ cũ
            db_conn = db.get_db()
            cursor = db_conn.cursor()
            cursor.execute('DELETE FROM song_artists WHERE song_id = ?', (song_id,))
            db_conn.commit()
            
            # Thêm quan hệ mới
            artist_id = db.get_or_create_artist(artist_name)
            db.add_song_artist_relation(song_id, artist_id)
            
        # Nếu có thông tin thể loại, cập nhật quan hệ song_genres
        if genre_name:
            # Xóa quan hệ cũ
            db_conn = db.get_db()
            cursor = db_conn.cursor()
            cursor.execute('DELETE FROM song_genres WHERE song_id = ?', (song_id,))
            db_conn.commit()
            
            # Xử lý nhiều thể loại được phân tách bằng dấu phẩy
            genre_names = [g.strip() for g in genre_name.split(',') if g.strip()]
            for g_name in genre_names:
                genre_id = db.get_or_create_genre(g_name)
                db.add_song_genre_relation(song_id, genre_id)
            
        return jsonify({"success": True, "message": "Song updated"}), 200
    except Exception as e:
        print("Lỗi khi cập nhật bài hát:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Cập nhật route add_song_admin để xử lý thể loại
@app.route('/admin/songs', methods=['POST'])
@admin_required
def add_song_admin():
    data = request.get_json()
    required_fields = ['id', 'name']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Trích xuất thông tin nghệ sĩ và thể loại
        artist_name = None
        genre_name = None
        
        if 'artist' in data:
            artist_name = data.get('artist')
            
        if 'genre' in data:
            genre_name = data.get('genre')
            
        # Đặt giá trị mặc định cho các trường thiếu
        if 'year' not in data or not data['year']:
            data['year'] = 2000
        if 'popularity' not in data or not data['popularity']:
            data['popularity'] = 50
        
        # Thêm các trường bắt buộc khác nếu thiếu
        for field in ['danceability', 'energy', 'valence', 'loudness', 'acousticness', 
                     'instrumentalness', 'liveness', 'speechiness', 'duration_ms',
                     'explicit', 'key', 'mode', 'release_date', 'tempo', 'cluster_label']:
            if field not in data:
                if field in ['danceability', 'energy', 'valence', 'acousticness', 
                           'instrumentalness', 'liveness', 'speechiness']:
                    data[field] = 0.5
                elif field == 'loudness':
                    data[field] = -10.0
                elif field == 'duration_ms':
                    data[field] = 200000
                elif field == 'explicit':
                    data[field] = 0
                elif field == 'key':
                    data[field] = 5
                elif field == 'mode':
                    data[field] = 1
                elif field == 'release_date':
                    data[field] = f"{data['year']}-01-01"
                elif field == 'tempo':
                    data[field] = 120.0
                elif field == 'cluster_label':
                    data[field] = 0
        
        # Lưu bài hát vào database
        db.add_song(data)
        
        # Nếu có thông tin nghệ sĩ, thêm vào bảng song_artists
        if artist_name:
            # Tìm artist_id từ tên nghệ sĩ hoặc tạo mới nếu chưa có
            artist_id = db.get_or_create_artist(artist_name)
            if artist_id:
                db.add_song_artist_relation(data['id'], artist_id)
        
        # Nếu có thông tin thể loại, thêm vào bảng song_genres
        if genre_name:
            # Xử lý nhiều thể loại được phân tách bằng dấu phẩy
            genre_names = [g.strip() for g in genre_name.split(',') if g.strip()]
            for g_name in genre_names:
                genre_id = db.get_or_create_genre(g_name)
                db.add_song_genre_relation(data['id'], genre_id)
        
        return jsonify({"success": True, "message": "Song added successfully"}), 201
    except Exception as e:
        print("Lỗi khi thêm bài hát:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route('/admin/artists', methods=['GET'])
@admin_required
def get_all_artists_admin():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result = db.get_all_artists_with_song_count(page, per_page)
        return jsonify(result), 200
    except Exception as e:
        print("Lỗi khi lấy danh sách nghệ sĩ:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/admin/artists', methods=['POST'])
@admin_required
def add_artist_admin():
    data = request.get_json()
    name = data.get('name')
    
    if not name:
        return jsonify({"error": "Artist name is required"}), 400
    
    try:
        artist_id = db.add_artist(name)
        return jsonify({"success": True, "artist_id": artist_id, "message": "Artist added successfully"}), 201
    except Exception as e:
        print("Lỗi khi thêm nghệ sĩ:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/admin/artists/<artist_id>', methods=['PUT'])
@admin_required
def update_artist_admin(artist_id):
    data = request.get_json()
    name = data.get('name')
    
    if not name:
        return jsonify({"error": "Artist name is required"}), 400
    
    try:
        success = db.update_artist(artist_id, name)
        if success:
            return jsonify({"success": True, "message": "Artist updated successfully"}), 200
        return jsonify({"error": "Artist not found"}), 404
    except Exception as e:
        print("Lỗi khi cập nhật nghệ sĩ:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/admin/artists/<artist_id>', methods=['DELETE'])
@admin_required
def delete_artist_admin(artist_id):
    try:
        success = db.delete_artist(artist_id)
        if success:
            return jsonify({"success": True, "message": "Artist deleted successfully"}), 200
        return jsonify({"error": "Artist not found"}), 404
    except Exception as e:
        print("Lỗi khi xóa nghệ sĩ:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/admin/artists/<artist_id>', methods=['GET'])
@admin_required
def get_artist_admin(artist_id):
    try:
        artist = db.get_artist_by_id(artist_id)
        if artist:
            return jsonify(artist), 200
        return jsonify({"error": "Artist not found"}), 404
    except Exception as e:
        print("Lỗi khi lấy thông tin nghệ sĩ:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
    
    
@app.route('/admin/stats', methods=['GET'])
# @admin_required 
def get_admin_stats():
    try:
        # Thêm print debug
        print("Đang thực hiện API stats...")
        
        # Lấy số lượng từ các hàm đã có trong db.py
        user_count = db.get_user_count()
        print(f"Số lượng người dùng: {user_count}")
        
        song_count = db.get_song_count()
        print(f"Số lượng bài hát: {song_count}")
        
        artist_count = db.get_artist_count()
        print(f"Số lượng nghệ sĩ: {artist_count}")
        
        play_count = db.get_play_count()
        print(f"Số lượng lượt nghe: {play_count}")
        
        # Trả về JSON response
        return jsonify({
            'userCount': user_count,
            'songCount': song_count,
            'artistCount': artist_count,
            'playCount': play_count
        }), 200
    except Exception as e:
        print("Lỗi chi tiết khi lấy thống kê:", str(e))
        import traceback
        traceback.print_exc()  # In ra stack trace đầy đủ
        return jsonify({"error": str(e)}), 500
    
@app.route('/admin/analytics', methods=['GET'])
@admin_required
def get_analytics_overview():
    try:
        # Lấy tất cả dữ liệu phân tích cần thiết
        most_played_result = db.get_most_played_songs(page=1, per_page=5)
        
        # Thống kê cơ bản
        user_count = db.get_user_count()
        song_count = db.get_song_count()
        artist_count = db.get_artist_count()
        play_count = db.get_play_count()
        
        return jsonify({
            'most_played_songs': most_played_result['most_played_songs'],
            'stats': {
                'userCount': user_count,
                'songCount': song_count,
                'artistCount': artist_count,
                'playCount': play_count
            }
        }), 200
    except Exception as e:
        print("Lỗi khi lấy tổng quan phân tích:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/admin/analytics/most_played', methods=['GET'])
@admin_required
def get_most_played_songs():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        result = db.get_most_played_songs(page, per_page)
        return jsonify(result), 200
    except Exception as e:
        print("Lỗi khi lấy danh sách bài hát được nghe nhiều nhất:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

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

# Thêm route sau để lấy tất cả thể loại
@app.route('/admin/genres', methods=['GET'])
@admin_required
def get_all_genres():
    try:
        genres = db.get_all_genres()
        return jsonify(genres), 200
    except Exception as e:
        print("Lỗi khi lấy danh sách thể loại:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
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
# Cập nhật route /login
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = db.get_user(username)
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
        access_token = create_access_token(identity=str(user['id']))
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user['id'],
                'username': username,
                'role': user['role'],  # Thêm role vào response
                'isNewUser': db.is_new_user(user['id'])
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