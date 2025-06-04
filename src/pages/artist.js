import React, { useState, useEffect } from 'react';
import styles from './artist.module.css';
import { useParams } from 'react-router-dom';
import PlaylistCardS from '../component/cards/playlist-card-s';
import Topnav from '../component/topnav/topnav';

const Artist = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [artistInfo, setArtistInfo] = useState(null);
  const { artistId } = useParams();

  useEffect(() => {
    const fetchArtistSongs = async () => {
      try {
        console.log('🎵 Đang tìm bài hát của nghệ sĩ:', artistId);
        const response = await fetch(`http://localhost:5000/artist/${encodeURIComponent(artistId)}/songs`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch songs');
        }
        
        console.log('🎵 Danh sách bài hát nhận được:', data);
        setSongs(data);
        if (data.length > 0) {
          setArtistInfo({
            name: data[0].artist,
            imageUrl: data[0].image_url
          });
        }
        setError(null);
      } catch (error) {
        console.error('❌ Lỗi khi lấy bài hát:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistSongs();
  }, [artistId]);

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Topnav />
        <div className={styles.loading}>Đang tải danh sách bài hát...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <Topnav />
        <div className={styles.error}>
          <h2>Đã xảy ra lỗi</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Topnav />
      <div className={styles.artistHeader}>
        <div className={styles.artistInfo}>
          <div className={styles.artistImageContainer}>
            <img 
              src={artistInfo?.imageUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1000&auto=format&fit=crop'} 
              alt={artistInfo?.name || artistId}
              className={styles.artistImage}
            />
          </div>
          <div className={styles.artistDetails}>
            <h1 className={styles.artistName}>{artistInfo?.name || artistId}</h1>
            <p className={styles.songCount}>{songs.length} bài hát</p>
          </div>
        </div>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.sectionTitle}>
          <h2>Danh sách bài hát</h2>
        </div>
        
        <div className={styles.songList}>
          {songs.length === 0 ? (
            <p className={styles.noSongs}>Không tìm thấy bài hát nào của nghệ sĩ này.</p>
          ) : (
            songs.map((song) => (
              <PlaylistCardS
                key={song.id}
                data={{
                  id: song.id,
                  title: song.name,
                  artist: song.artist,
                  imgUrl: song.image_url || 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=1000&auto=format&fit=crop',
                  link: `song-${song.id}`,
                  hoverColor: '#444'
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Artist; 