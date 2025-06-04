import Topnav from '../component/topnav/topnav';
import TitleL from '../component/text/title-l';
import TitleM from '../component/text/title-m';
import PlaylistCardS from '../component/cards/playlist-card-s';
import PlaylistCardM from '../component/cards/playlist-card-m';
import PlaylistCardT from '../component/cards/playlist-card-t';
import { useAuth } from '../component/topnav/AuthContext';
import { useHistory } from 'react-router-dom';

import styles from "./home.module.css";

import React, { useEffect, useState } from 'react';


function Home({ setIsPopupOpen, isPopupOpen }){

    const { user, token, isAuthLoading  } = useAuth();
    const isLoggedIn = !!user;
    const history = useHistory();

    const [songs, setSongs] = useState([]);

    const [songHistory, setSongHistory] = useState([]);

    const [recommendSongs, setRecommendSongs] = useState([]);
    
    useEffect(() => {
        let isMounted = true;
        
        fetch('http://localhost:5000/recommend_songs/guest') 
            .then(response => response.json())
            .then(data => {
                if (isMounted) {
                    setSongs(data);
                }
            })
            .catch(error => {
                if (isMounted) {
                    console.error('Lỗi khi fetch songs:', error);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // nguoi dung
    const [artistsUser, setArtistsUser] = useState([]);
    // khach
    const [artistsGuest, setArtistsGuest] = useState([]);

    useEffect(() => {
        let isMounted = true;

        if (!isAuthLoading && isLoggedIn && token) {
            fetch('http://localhost:5000/get_artist_preferences', {
            headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    console.log('🎧 Nghệ sĩ từ người dùng:', data);
                    if (Array.isArray(data)) {
                    setArtistsUser(data);
                    } else if (Array.isArray(data.artists)) {
                    setArtistsUser(data.artists);
                    } else {
                    setArtistsUser([]);
                    }
                }
            })
            .catch(() => {
                if (isMounted) {
                    setArtistsUser([]);
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [isLoggedIn, token, isAuthLoading]);

    useEffect(() => {
        let isMounted = true;

        if (!isAuthLoading && !isLoggedIn) {
            fetch('http://localhost:5000/recommend_artists/guest')
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    console.log('👤 Nghệ sĩ cho khách:', data);
                    if (Array.isArray(data)) {
                    setArtistsGuest(data);
                    } else {
                    setArtistsGuest([]);
                    }
                }
            })
            .catch(() => {
                if (isMounted) {
                    setArtistsGuest([]);
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [isLoggedIn, isAuthLoading]);

    // lich su nge gan day
    useEffect(() => {
        let isMounted = true;

        if (!isAuthLoading && isLoggedIn && token) {
            fetch('http://localhost:5000/get_song_history', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();  // <-- chỉ thực thi nếu response hợp lệ
            })
            .then(data => {
                if (isMounted) {
                    console.log('🎵 Lịch sử bài hát trả về:', JSON.stringify(data, null, 2));
                    setSongHistory(data);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error('Lỗi khi fetch lịch sử nghe:', err);
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [isLoggedIn, token, isAuthLoading]);

    const handleArtistClick = (artistName) => {
        history.push(`/artist/${encodeURIComponent(artistName)}`);
    };

    return (
        <div className={styles.Home}>
            <div className={styles.HoverBg}></div>
            <div className={styles.Bg}></div>

            <Topnav />

            <div className={styles.Content}>
                <section>
                    <div className={styles.SectionTitle}>
                        <TitleL>Bài hát phổ biến</TitleL>
                    </div>

                    <div className={styles.SectionCards}>
                        {songs.map(item => (
                            <PlaylistCardS 
                                key={item.id}
                                data={{ 
                                    id: item.id,
                                    title: item.name,
                                    artist: item.artist,
                                    imgUrl: item.image_url || '/default.jpg',
                                    link: `song-${item.id}`,
                                    hoverColor: '#444'
                                }}
                                onRecommendations={setRecommendSongs}
                            />
                        ))}
                    </div>
                </section>

                <section>
                    <div className={styles.SectionTitle}>
                        <TitleM>{isLoggedIn ? 'Nghệ sĩ bạn yêu thích' : 'Nghệ sĩ nổi bật'}</TitleM> 
                    </div>

                    <div className={styles.artistsGrid}>
                        {(() => {
                            const displayArtists = isLoggedIn ? artistsUser : artistsGuest;
                            const noDataMessage = isLoggedIn
                                ? 'Bạn chưa chọn nghệ sĩ yêu thích nào.'
                                : 'Hiện không có nghệ sĩ nổi bật nào.';

                            if (displayArtists.length === 0) {
                                return <p style={{ color: '#aaa' }}>{noDataMessage}</p>;
                            }

                            return displayArtists.map((artist, index) => (
                                <div 
                                    key={index} 
                                    className={styles.artistCard}
                                    onClick={() => handleArtistClick(artist.name)}
                                >
                                    {artist.image_url && (
                                        <img 
                                            src={artist.image_url} 
                                            alt={artist.name} 
                                            className={styles.artistImage}
                                        />
                                    )}
                                    <h3>{artist.name}</h3>
                                </div>
                            ));
                        })()}
                    </div>
                </section>

                {isLoggedIn && recommendSongs.length > 0 && (
                    <section>
                        <div className={styles.SectionTitle}>
                            <TitleM>Danh sách bài hát gợi ý cho bạn</TitleM>
                        </div>
                        <div className={styles.SectionCards}>
                            {recommendSongs.map(item => (
                                <PlaylistCardS
                                    key={item.id}
                                    data={{
                                        id: item.id,
                                        title: item.name,
                                        artist: item.artist,
                                        imgUrl: item.image_url || '/default.jpg',
                                        link: `song-${item.id}`,
                                        hoverColor: '#444'
                                    }}
                                    
                                />
                            ))}
                        </div>
                    </section>
                )}

                {isLoggedIn && (
                    <section>
                        <div className={styles.SectionTitle}>
                            <TitleM>Lịch sử nghe gần đây</TitleM>
                        </div>

                        <div className={styles.SectionCards}>
                            {songHistory.length === 0 ? (
                                <p style={{ color: '#aaa' }}>Bạn chưa có lịch sử nghe.</p>
                            ) : (
                                songHistory.map(item => (
                                    <PlaylistCardS 
                                        key={item.id}
                                        data={{ 
                                            id: item.id,
                                            title: item.name,
                                            artist: item.artist || '',  // thêm nếu backend có trả về artist
                                            imgUrl: item.image_url || '/default.jpg',
                                            link: `song-${item.id}`,
                                            hoverColor: '#444'
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );

}

export default Home;
