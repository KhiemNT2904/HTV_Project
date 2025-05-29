import PrevPageBtn from '../buttons/prev-page-button';
import NextPageBtn from '../buttons/next-page-button';
import SearchBox from './search-box';
import LibraryTabBtn from './library-tab-btn';
import { useState, useRef, useEffect } from 'react';
import styles from './topnav.module.css';
import { useAuth } from './AuthContext'; 
import { useHistory } from 'react-router-dom';

function Topnav({ search = false, tabButtons = false }) {
    const { user, login, logout } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const formRef = useRef(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showLogoutPopup, setShowLogoutPopup] = useState(false); // Quản lý popup đăng xuất

    const [showArtistSelector, setShowArtistSelector] = useState(false);
    const [availableArtists, setAvailableArtists] = useState([]);
    const [selectedArtists, setSelectedArtists] = useState([]);

    const history = useHistory();


    const toggleForm = () => {
        setShowForm(prev => !prev);
        setIsLogin(true); // reset về login mỗi lần mở
    };

    // Đóng khi click ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (formRef.current && !formRef.current.contains(event.target)) {
                setShowForm(false);
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    // Hàm xử lý submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!username || !password) {
            setError("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/${isLogin ? 'login' : 'register'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });
            
            const data = await response.json();

            //console.log(data); 

            if (response.ok) {
                login(data.user, data.access_token); // lưu toàn bộ object user


                await new Promise(resolve => setTimeout(resolve, 100));

                if (!isLogin) {
                    try {
                        const res = await fetch('http://localhost:5000/artists');
                        const artists = await res.json();
                        setAvailableArtists(artists);

                        login(data.user, data.access_token); // ✅ lưu full user info (gồm id)
                        setShowForm(false);
                        setShowArtistSelector(true); // ✅ sau khi có dữ liệu
                    } catch (err) {
                        console.error('Lỗi khi tải danh sách nghệ sĩ:', err);
                        setError('Không thể tải danh sách nghệ sĩ.');
                    }
                } else {
                    login(data.user, data.access_token); // đăng nhập bình thường
                    setShowForm(false);
                }

            } else {
                if(!isLogin && response.status === 400 && data.error === "Username already exists"){
                    setError("Tên đăng kí đã tồn tại!!!");
                }else {
                    setError (data.error || "Đã xảy ra lỗi!");
                }
            }
        } catch (error) {
            setError("Không thể kết nối với máy chủ.");
        }
    };

    // Hàm xử lý đăng xuất
    const handleLogout = () => {
        logout();
        setShowLogoutPopup(false); // Đóng popup
    };

    // Hàm hiển thị popup xác nhận đăng xuất
    const toggleLogoutPopup = () => {
        setShowLogoutPopup(prev => !prev);
    };

    const handleSelectArtist = (artist) => {
        if (selectedArtists.some(a => a.id === artist.id)) {
            // Nếu nghệ sĩ đã được chọn, bỏ chọn
            setSelectedArtists(selectedArtists.filter(a => a.id !== artist.id));
        } else {
            // Không giới hạn số lượng chọn
            setSelectedArtists([...selectedArtists, artist]);
        }
    };

    const handleSubmitArtists = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/add_artists_preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    artist_ids: selectedArtists.map(a => a.id),
                }),
            });

            if (response.ok) {
                setShowArtistSelector(false);
                //window.location.href = '/' // Chuyển sang trang chính
                setTimeout(() => {
                    window.location.href = '/';
                }, 100);
            } else {
                alert("Lỗi khi lưu nghệ sĩ");
            }
        } catch (err) {
            console.error(err);
        }
    };


    return (
        <>
            <nav className={styles.Topnav}>
                <div>
                    <span>
                        <PrevPageBtn />
                        <NextPageBtn />
                        {search && <SearchBox />}
                        {tabButtons && <LibraryTabBtn />}
                    </span>
                    <span>
                        {/* Nếu người dùng đã đăng nhập, hiển thị tên người dùng. */}
                        <button 
                            onClick={user ? toggleLogoutPopup : toggleForm} 
                            className={styles.ProfileBtn}
                        >
                            {user ? user.username : 'Guest'}
                        </button>
                    </span>
                </div>
            </nav>

            {showForm && (
                <div className={styles.Overlay}>
                    <div ref={formRef} className={styles.AuthFormContainer}>
                       <form className={styles.AuthForm} onSubmit={handleSubmit}>
                            <h3>{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h3>
                            {error && <p className={styles.error}>{error}</p>}

                            {isLogin ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Tên đăng nhập"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Tên đăng kí"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </>
                            )}

                            <button type="submit">
                                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
                            </button>

                            <p>
                                {isLogin ? (
                                    <>
                                        Chưa có tài khoản?{' '}
                                        <a href="#" onClick={(e) => {
                                            e.preventDefault();
                                            setIsLogin(false);
                                        }}>Đăng ký</a>
                                    </>
                                ) : (
                                    <>
                                        Đã có tài khoản?{' '}
                                        <a href="#" onClick={(e) => {
                                            e.preventDefault();
                                            setIsLogin(true);
                                        }}>Đăng nhập</a>
                                    </>
                                )}
                            </p>
                        </form>
                    </div>
                </div>
            )}

            {showLogoutPopup && (
                <div className={styles.Overlay}>
                    <div className={styles.Popup}>
                        <p>Bạn có chắc muốn đăng xuất?</p>
                        <button className={styles.PopA} onClick={handleLogout}>Đồng ý</button>
                        <button className={styles.PopD} onClick={toggleLogoutPopup}>Hủy</button>
                    </div>
                </div>
            )}


            {showArtistSelector && (
                <div className={styles.Overlay}>
                    <div className={styles.Popup}>
                        <h3>Chọn 3 nghệ sĩ bạn yêu thích</h3>
                        <div className={styles.ArtistList}>
                            {availableArtists.map(artist => (
                                <button
                                    key={artist.id}
                                    onClick={() => handleSelectArtist(artist)}
                                    className={`${styles.ArtistItem} ${selectedArtists.some(a => a.id === artist.id) ? styles.Selected : ''}`}
                                >
                                    {artist.name}
                                </button>
                            ))}
                        </div>

                        <div className={styles.ButtonsContainer}>
                            <button
                                onClick={() => {setShowArtistSelector(false) 
                                                window.location.href = '/';
                                }} 
                                className={styles.SkipBtn}
                            >
                                Bỏ qua
                            </button>
                            <button
                                onClick={handleSubmitArtists}
                                disabled={selectedArtists.length < 3}
                                className={styles.ConfirmBtn}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </>
    );
}

export default Topnav;
