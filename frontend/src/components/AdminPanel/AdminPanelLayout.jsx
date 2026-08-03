import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { filterNavForUser, findNavItemByPath } from './adminNavConfig';
import { GoalLogicTitle } from '../GoalLogicTitle';
import { BRAND_NAME } from '../../constants/brand';
import './AdminPanel.css';

export default function AdminPanelLayout() {
  const { isMainAdmin, user, handleLogout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const navGroups = filterNavForUser(isMainAdmin);
  const currentItem = findNavItemByPath(location.pathname);

  const roleLabel =
    user?.role === 'admin' && user?.isMainAdmin
      ? 'Admin principal'
      : user?.role === 'admin_secundario'
        ? 'Admin secundario'
        : user?.role || 'admin';

  const handleLogoutClick = () => {
    handleLogout();
    navigate('/ligas');
  };

  return (
    <div className="admin-pro-layout">
      <aside className="admin-pro-sidebar" aria-label="Navegación del panel">
        <div className="admin-pro-sidebar-brand">
          <GoalLogicTitle as="div" size="sm" className="admin-pro-brand-title" />
          <span className="admin-pro-brand-sub">Admin PRO</span>
        </div>
        <nav className="admin-pro-nav">
          {navGroups.map((group) => (
            <div key={group.id} className="admin-pro-nav-group">
              <span className="admin-pro-nav-group-label">{group.label}</span>
              <ul className="admin-pro-nav-list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `admin-pro-nav-link${isActive ? ' active' : ''}`
                      }
                      end={item.path === '/admin/users' ? false : undefined}
                    >
                      <span className="admin-pro-nav-icon" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="admin-pro-nav-text">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-pro-main">
        <header className="admin-pro-topbar">
          <div>
            <h1>{currentItem?.label || 'Panel de administración'}</h1>
            <p>{currentItem?.description || `Gestión centralizada de ${BRAND_NAME}`}</p>
          </div>
          <div className="admin-pro-topbar-actions">
            <span className="admin-pro-user-chip">
              {user?.nombre || user?.email} · {roleLabel}
            </span>
            <button type="button" className="admin-btn-logout gl-btn-secondary" onClick={handleLogoutClick}>
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="admin-pro-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
