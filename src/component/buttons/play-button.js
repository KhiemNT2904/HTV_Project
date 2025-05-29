import React from 'react';
import { connect } from 'react-redux';
import { changePlay } from '../../actions';
import * as Icons from '../icons';
import IconButton from '../buttons/icon-button';
import { useAuth } from '../topnav/AuthContext';

import styles from './play-button.module.css'

function PlayButton(props) {
    const { user, token } = useAuth(); 

    const handlePlay = () => {
        props.changePlay(!props.isPlaying);

        if (user && token && props.songId) {
            // 1. Gửi lịch sử nghe
            fetch('http://localhost:5000/add_song_history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    song_id: props.songId,
                })
            })
            .then(res => res.json())
            .then(data => {
                // 2. Gọi API gợi ý bài hát cùng cluster với đúng songId
                fetch(`http://localhost:5000/songs/cluster/${props.songId}`)
                    .then(res => res.json())
                    .then(recommendData => {
                        if (props.onRecommendations) {
                            props.onRecommendations(recommendData); // Luôn cập nhật lại
                        }
                    })
                    .catch(err => {
                        console.error('❌ Lỗi lấy gợi ý:', err);
                        if (props.onRecommendations) {
                            props.onRecommendations([]); // Xóa gợi ý nếu lỗi
                        }
                    });
            })
            .catch(error => {
                console.error('❌ Lỗi gửi lịch sử:', error);
            });
        } else if (props.onRecommendations) {
            props.onRecommendations([]); // Xóa gợi ý nếu không đủ điều kiện
        }
    };

    return (
        <div className={styles.playBtn} tabIndex="0" role="button" onClick={handlePlay}>
            {props.isPlaying && props.isthisplay
                  ? <IconButton icon={<Icons.Pause />} activeicon={<Icons.Pause />}/>
                  : <IconButton icon={<Icons.Play />} activeicon={<Icons.Play />}/>
          }
      </div>
  );
}

const mapStateToProps = (state) => {
  return {
    isPlaying: state.isPlaying
  };
};

export default connect(mapStateToProps, { changePlay })(PlayButton);