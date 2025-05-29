import Topnav from '../component/topnav/topnav';
import TitleL from '../component/text/title-l';
import TitleM from '../component/text/title-m';
import PlaylistCardS from '../component/cards/playlist-card-s';
import PlaylistCardM from '../component/cards/playlist-card-m';
import PlaylistCardT from '../component/cards/playlist-card-t';
import { useAuth } from '../component/topnav/AuthContext';


import styles from "./home.module.css";

import React, { useEffect, useState } from 'react';


function Home({ setIsPopupOpen, isPopupOpen }){

    const { user, token, isAuthLoading  } = useAuth();
    const isLoggedIn = !!user;

    const [songs, setSongs] = useState([]);

    const [songHistory, setSongHistory] = useState([]);

    const [recommendSongs, setRecommendSongs] = useState([]);
    
    useEffect(() => {
        fetch('http://localhost:5000/recommend_songs/guest') 
            .then(response => response.json())
            .then(data => setSongs(data))
            .catch(error => console.error('Lỗi khi fetch songs:', error));
    }, []);

    // nguoi dung
    const [artistsUser, setArtistsUser] = useState([]);
    // khach
    const [artistsGuest, setArtistsGuest] = useState([]);

    useEffect(() => {
        if (!isAuthLoading && isLoggedIn && token) {
            fetch('http://localhost:5000/get_artist_preferences', {
            headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                console.log('🎧 Nghệ sĩ từ người dùng:', data);
                if (Array.isArray(data)) {
                setArtistsUser(data);
                } else if (Array.isArray(data.artists)) {
                setArtistsUser(data.artists);
                } else {
                setArtistsUser([]);
                }
            })
            .catch(() => setArtistsUser([]));
        }
    }, [isLoggedIn, token, isAuthLoading]);

    useEffect(() => {
        if (!isAuthLoading && !isLoggedIn) {
            fetch('http://localhost:5000/recommend_artists/guest')
            .then(res => res.json())
            .then(data => {
                console.log('👤 Nghệ sĩ cho khách:', data);
                if (Array.isArray(data)) {
                setArtistsGuest(data);
                } else {
                setArtistsGuest([]);
                }
            })
            .catch(() => setArtistsGuest([]));
        }
    }, [isLoggedIn, isAuthLoading]);

    // lich su nge gan day
    useEffect(() => {
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
                console.log('🎵 Lịch sử bài hát trả về:', JSON.stringify(data, null, 2));
                setSongHistory(data);
            })
            .catch(err => {
                console.error('Lỗi khi fetch lịch sử nghe:', err);
            });
        }
    }, [isLoggedIn, token, isAuthLoading]);


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

                    <div className={styles.SectionCardsMedium}>
                        {(() => {
                            const displayArtists = isLoggedIn ? artistsUser : artistsGuest;
                            const noDataMessage = isLoggedIn
                                ? 'Bạn chưa chọn nghệ sĩ yêu thích nào.'
                                : 'Hiện không có nghệ sĩ nổi bật nào.';

                            if (displayArtists.length === 0) {
                                return <p style={{ color: '#aaa' }}>{noDataMessage}</p>;
                            }

                            return displayArtists.map(item => (
                                <PlaylistCardS 
                                    key={item.id}
                                    data={{ 
                                        title: item.name,
                                        artist: item.artist,
                                        imgUrl: item.image_url || '/default.jpg',
                                        link: `song-${item.id}`,
                                        hoverColor: '#444'
                                    }}
                                />
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
