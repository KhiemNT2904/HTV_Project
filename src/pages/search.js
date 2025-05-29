import React, { useState } from 'react';
import axios from 'axios';
import Topnav from '../component/topnav/topnav';
import TitleM from '../component/text/title-m';
import SearchPageCard from '../component/cards/searchpage-card';
import { SEARCHCARDS } from '../data/index';
import styles from "./search.module.css";
import SearchBox from '../component/topnav/search-box';

function Search() {
    const [songName, setSongName] = useState('');
    const [recommendedSongs, setRecommendedSongs] = useState([]);
    const [error, setError] = useState('');

    // Hàm gửi yêu cầu đến backend để nhận gợi ý bài hát
    const getRecommendations = async () => {
        try {
            const response = await axios.post('http://localhost:8000/recommendations/', {
                song: songName
            });
            setRecommendedSongs(response.data.recommended_songs);
            setError('');
        } catch (err) {
            setError('Song not found or an error occurred.');
            setRecommendedSongs([]);
        }
    };

    return (
        <div className={styles.SearchPage}>
            <Topnav search={true} />

            <div className={styles.Search}>
                <TitleM>Nhac</TitleM>
                <input
                    type="text"
                    placeholder="Nhập tên bài hát"
                    value={songName}
                    onChange={(e) => setSongName(e.target.value)}
                    className={styles.searchInput}
                />
                <button onClick={getRecommendations} className={styles.searchButton}>
                    Tìm kiếm
                </button>

                {error && <p className={styles.errorMessage}>{error}</p>}

                <div className={styles.SearchCardGrid}>
                    {recommendedSongs.length > 0 ? (
                        recommendedSongs.map((song, index) => {
                            return (
                                <SearchPageCard
                                    key={index}
                                    cardData={{
                                        title: song,
                                        // Đây là ví dụ, bạn có thể thêm ảnh và màu sắc vào dữ liệu card nếu cần
                                    }}
                                />
                            );
                        })
                    ) : (
                        SEARCHCARDS.map((card) => {
                            return (
                                <SearchPageCard
                                    key={card.title}
                                    cardData={{
                                        bgcolor: card.bgcolor,
                                        title: card.title,
                                        imgurl: card.imgurl,
                                    }}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default Search