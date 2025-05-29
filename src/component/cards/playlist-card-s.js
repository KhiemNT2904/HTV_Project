import { Link } from "react-router-dom";
import TextBoldL from '../text/text-bold-l';
import PlayButton from '../buttons/play-button';

import styles from "./playlist-card-s.module.css";

function PlaylistCardS(props) {
    return (
        <div className={styles.PlaylistCardSBox}>
            <Link to={`/playlist/${props.data.link}`} onMouseOver={() => {
                document.documentElement.style.setProperty('--hover-home-bg', props.data.hoverColor);
            }}>
                <div className={styles.PlaylistCardS}>
                    <div className={styles.ImgBox}>
                        <img src={props.data.imgUrl} alt={`${props.data.title}`} />
                    </div>
                    <div className={styles.Title}>
                        <TextBoldL>{props.data.title}</TextBoldL>
                    </div>
                </div>
            </Link>
            <div
                className={styles.IconBox}
            >
                {/* Truyền songId cho nút Play */}
                <PlayButton songId={props.data.id} onRecommendations={props.onRecommendations} />
            </div>
        </div>
    );
}

export default PlaylistCardS;
