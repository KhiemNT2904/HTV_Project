import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import useWindowSize from "./hooks/useWindowSize";
import Sidebar from "./component/sidebar/sidebar";
import MobileNavigation from "./component/sidebar/mobile-navigation";
import Footer from "./component/footer/footer";
import Home from "./pages/home";
import Search from "./pages/search";
import Library from "./pages/library";
import PlaylistPage from "./pages/playlist";

// Import các component Admin
import Dashboard from "./pages/Admin/Dashboard";
import UserManagement from "./pages/Admin/UserManagement";
import SongManagement from "./pages/Admin/SongManagement";
import ArtistManagement from "./pages/Admin/ArtistManagement"; // Thêm dòng này
import Analytics from "./pages/Admin/Analytics"; // Thêm dòng này
import { useAuth } from "./component/topnav/AuthContext";
import CONST from "./constants/index";
import styles from "./style/App.module.css";

function App() {
  const size = useWindowSize();
  const { user, isAdmin } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  // Thêm debug khi component render
  console.log("App rendering, user:", user);
  console.log("App rendering, isAdmin:", isAdmin);

  return (
    <Router>
      <Switch>
        {/* Admin Routes */}
        <Route path="/admin">
          {isAdmin ? (
            <>
              {console.log("Rendering admin routes, isAdmin=true")}
              <Switch>
                <Route exact path="/admin" component={Dashboard} />
                <Route path="/admin/users" component={UserManagement} />
                <Route path="/admin/songs" component={SongManagement} />
                <Route
                  path="/admin/artists"
                  component={ArtistManagement}
                />{" "}
                {/* Thêm route nghệ sĩ */}
                <Route path="/admin/analytics" component={Analytics} />{" "}
                {/* Thêm route analytics */}
                <Route path="/admin/*">
                  <Redirect to="/admin" />{" "}
                  {/* Catch-all route để chuyển hướng các URL admin không hợp lệ */}
                </Route>
              </Switch>
            </>
          ) : (
            <>
              {console.log("Redirecting from admin routes, isAdmin=false")}
              <Redirect to="/" />
            </>
          )}
        </Route>

        {/* Normal Routes */}
        <Route path="/">
          <div className={styles.layout}>
            {size.width > CONST.MOBILE_SIZE ? (
              <Sidebar />
            ) : (
              <MobileNavigation />
            )}
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/search" component={Search} />
              <Route path="/library" component={Library} />
              <Route path="/playlist/:path" component={PlaylistPage} />
            </Switch>
            <Footer />
          </div>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
