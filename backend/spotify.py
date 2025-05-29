# spotify.py
import base64
import requests
import time

CLIENT_ID = '5553d91d0aa4410a8adc61d11b76aeeb'
CLIENT_SECRET = '1179d61b62d5416b931a17b7667b51b9'
TOKEN_URL = 'https://accounts.spotify.com/api/token'

# Lưu token toàn cục
access_token = None
token_expires = 0

def get_spotify_token():
    global access_token, token_expires
    if access_token and time.time() < token_expires:
        return access_token

    auth_header = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}

    response = requests.post(TOKEN_URL, headers=headers, data=data)
    token_info = response.json()
    access_token = token_info["access_token"]
    token_expires = time.time() + token_info["expires_in"] - 60  # trừ 60s để dự phòng

    return access_token

# 
import requests

def get_track_image(track_name, artist_name=None):
    token = get_spotify_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Kiểm tra rỗng
    if not track_name:
        return None

    if artist_name:
        query = f"track:{track_name} artist:{artist_name}"
    else:
        query = f"track:{track_name}"

    params = {
        "q": query,
        "type": "track",
        "limit": 1
    }

    try:
        response = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)
        response.raise_for_status()

        items = response.json().get("tracks", {}).get("items", [])
        if items and items[0].get("album", {}).get("images"):
            return items[0]["album"]["images"][0]["url"]
        else:
            return None
    except requests.exceptions.RequestException as e:
        print(f"Spotify API error: {e}")
        return None

#
def get_artist_image(artist_name):
    token = get_spotify_token()
    url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": artist_name, "type": "artist", "limit": 1}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        items = response.json().get("artists", {}).get("items", [])
        if items and items[0]["images"]:
            return items[0]["images"][0]["url"]
    return None
