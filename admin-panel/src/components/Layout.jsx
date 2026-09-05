import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/buildings', label: 'ساختمان‌ها' },
  { to: '/map-editor', label: 'ویرایشگر نقشه' },
  { to: '/qrcodes', label: 'کدهای QR' },
  { to: '/destinations', label: 'مقاصد' },
  { to: '/beacons', label: 'بیکن‌ها' },
];

export default function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">راهیار — پنل داخلی تیم</div>
        <nav className="topnav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <span>{username}</span>
          <button type="button" className="btn-ghost" onClick={handleLogout}>
            خروج
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
