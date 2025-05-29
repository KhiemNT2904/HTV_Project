import React, { useEffect, useState } from 'react';
import PlaylistCardS from './playlist-card-s';
import styles from './playlist-card-m.module.css';

const PlaylistCardT = ({ genreName }) => {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:8000/genre/${encodeURIComponent(genreName)}`)
            .then(res => res.json())
            .then(data => {
                setSongs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Lỗi khi fetch bài hát thể loại:', err);
                setLoading(false);
            });
    }, [genreName]);

    if (loading) return <p>Đang tải bài hát...</p>;

    if (songs.length === 0) return <p>Không có bài hát nào thuộc thể loại này.</p>;

    return (
        <div className={styles.SectionCards}>
            {songs.map(song => (
                <PlaylistCardS
                    key={song.id}
                    data={{
                        title: song.name,
                        artist: song.artist,
                        imgUrl: song.image || '/default.jpg',
                        link: `song-${song.id}`,
                        hoverColor: '#444'
                    }}
                />
            ))}
        </div>
    );
};

export default PlaylistCardT;
