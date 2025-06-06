import Topnav from "../component/topnav/topnav";
import TitleL from "../component/text/title-l";
import TitleM from "../component/text/title-m";
import PlaylistCardS from "../component/cards/playlist-card-s";

import { useAuth } from "../component/topnav/AuthContext";

import styles from "./home.module.css";

import React, { useEffect, useState } from "react";

function Home({ setIsPopupOpen, isPopupOpen }) {
  const { user, token, isAuthLoading } = useAuth();
  const isLoggedIn = !!user;

  const [songs, setSongs] = useState([]);

  const [songHistory, setSongHistory] = useState([]);

  const [recommendSongs, setRecommendSongs] = useState([]);
  const [artistsUser, setArtistsUser] = useState([]);
  const [artistsGuest, setArtistsGuest] = useState([]);
  useEffect(() => {
    let isMounted = true; // Thêm flag này

    fetch("http://localhost:5000/recommend_songs/guest")
      .then((response) => response.json())
      .then((data) => {
        // Kiểm tra component còn mounted không trước khi cập nhật state
        if (isMounted) {
          setSongs(data);
        }
      })
      .catch((error) => {
        // Chỉ update state nếu component vẫn mounted
        if (isMounted) {
          console.error("Lỗi khi fetch songs:", error);
        }
      });

    // Cleanup function để ngăn memory leak
    return () => {
      isMounted = false;
    };
  }, []);

  // Lấy nghệ sĩ yêu thích cho user đã đăng nhập
  useEffect(() => {
    let isMounted = true; // Thêm flag này

    if (!isAuthLoading && isLoggedIn && token) {
      fetch("http://localhost:5000/get_artist_preferences", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("🎧 Nghệ sĩ từ người dùng:", data);
          // Kiểm tra component còn mounted không trước khi cập nhật state
          if (isMounted) {
            if (Array.isArray(data)) {
              setArtistsUser(data);
            } else if (Array.isArray(data.artists)) {
              setArtistsUser(data.artists);
            } else {
              setArtistsUser([]);
            }
          }
        })
        .catch((error) => {
          // Chỉ update state nếu component vẫn mounted
          if (isMounted) {
            console.error("Error fetching artist preferences:", error);
            setArtistsUser([]);
          }
        });
    }

    // Cleanup function để ngăn memory leak
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, token, isAuthLoading]);
  // Lấy nghệ sĩ nổi bật cho khách
  // Lấy nghệ sĩ nổi bật cho khách (không đăng nhập)
  useEffect(() => {
    let isMounted = true; // Thêm flag này

    if (!isLoggedIn) {
      fetch("http://localhost:5000/recommend_artists/guest")
        .then((response) => response.json())
        .then((data) => {
          // Kiểm tra component còn mounted không trước khi cập nhật state
          if (isMounted) {
            console.log("👤 Nghệ sĩ cho khách:", data);
            setArtistsGuest(data);
          }
        })
        .catch((error) => {
          // Chỉ update state nếu component vẫn mounted
          if (isMounted) {
            console.error("Lỗi khi fetch nghệ sĩ nổi bật:", error);
            setArtistsGuest([]);
          }
        });
    }

    // Cleanup function để ngăn memory leak
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  // lich su nge gan day
  useEffect(() => {
    let isMounted = true; // Thêm flag này

    if (!isAuthLoading && isLoggedIn && token) {
      fetch("http://localhost:5000/get_song_history", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          // Kiểm tra component còn mounted không trước khi cập nhật state
          if (isMounted) {
            console.log(
              "🎵 Lịch sử bài hát trả về:",
              JSON.stringify(data, null, 2)
            );
            setSongHistory(data);
          }
        })
        .catch((err) => {
          // Chỉ update state nếu component vẫn mounted
          if (isMounted) {
            console.error("Lỗi khi fetch lịch sử nghe:", err);
          }
        });
    }

    // Cleanup function để ngăn memory leak
    return () => {
      isMounted = false;
    };
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
            {songs.map((item) => (
              <PlaylistCardS
                key={item.id}
                data={{
                  id: item.id,
                  title: item.name,
                  artist: item.artist,
                  imgUrl: item.image_url || "/default.jpg",
                  link: `song-${item.id}`,
                  hoverColor: "#444",
                }}
                onRecommendations={setRecommendSongs}
              />
            ))}
          </div>
        </section>

        <section>
          <div className={styles.SectionTitle}>
            <TitleM>
              {isLoggedIn ? "Nghệ sĩ bạn yêu thích" : "Nghệ sĩ nổi bật"}
            </TitleM>
          </div>

          <div className={styles.SectionCardsMedium}>
            {(() => {
              const displayArtists = isLoggedIn ? artistsUser : artistsGuest;
              const noDataMessage = isLoggedIn
                ? "Bạn chưa chọn nghệ sĩ yêu thích nào."
                : "Hiện không có nghệ sĩ nổi bật nào.";

              if (displayArtists.length === 0) {
                return <p style={{ color: "#aaa" }}>{noDataMessage}</p>;
              }

              return displayArtists.map((item) => (
                <PlaylistCardS
                  key={item.id}
                  data={{
                    title: item.name,
                    artist: item.artist,
                    imgUrl: item.image_url || "/default.jpg",
                    link: `song-${item.id}`,
                    hoverColor: "#444",
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
              {recommendSongs.map((item) => (
                <PlaylistCardS
                  key={item.id}
                  data={{
                    id: item.id,
                    title: item.name,
                    artist: item.artist,
                    imgUrl: item.image_url || "/default.jpg",
                    link: `song-${item.id}`,
                    hoverColor: "#444",
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
                <p style={{ color: "#aaa" }}>Bạn chưa có lịch sử nghe.</p>
              ) : (
                songHistory.map((item) => (
                  <PlaylistCardS
                    key={item.id}
                    data={{
                      id: item.id,
                      title: item.name,
                      artist: item.artist || "", // thêm nếu backend có trả về artist
                      imgUrl: item.image_url || "/default.jpg",
                      link: `song-${item.id}`,
                      hoverColor: "#444",
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
