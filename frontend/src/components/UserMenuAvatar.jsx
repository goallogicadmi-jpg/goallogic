import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { UserAvatar } from './UserAvatar';
import './UserMenuAvatar.css';

function PersonIcon() {
  return (
    <svg
      className="user-menu-avatar__icon-svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

/**
 * Avatar de usuario en el header con menú popover (Inicio, Mi Cuenta, Cerrar sesión).
 */
export default function UserMenuAvatar() {
  const { isAuthenticated, user, handleLogout } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const closeMenu = () => setOpen(false);

  const goTo = (path) => {
    closeMenu();
    navigate(path);
  };

  const onLogout = () => {
    closeMenu();
    handleLogout();
    navigate('/clubes');
  };

  const displayName = user?.nombre || user?.email || '';

  return (
    <div className="user-menu-avatar" ref={containerRef}>
      <button
        type="button"
        className={`user-menu-avatar__trigger${open ? ' open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Menú de usuario"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="user-menu-avatar__circle" aria-hidden="true">
          {isAuthenticated && user?.foto_perfil_url ? (
            <UserAvatar
              nombre={displayName}
              foto_perfil_url={user.foto_perfil_url}
              size={36}
              className="user-menu-avatar__photo"
            />
          ) : isAuthenticated ? (
            <UserAvatar nombre={displayName} size={36} className="user-menu-avatar__photo" />
          ) : (
            <PersonIcon />
          )}
        </span>
      </button>

      {open && (
        <div className="user-menu-avatar__popover" role="menu" aria-label="Opciones de usuario">
          <button
            type="button"
            role="menuitem"
            className="user-menu-avatar__item"
            onClick={() => goTo('/clubes')}
          >
            Ir a Inicio
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu-avatar__item"
            onClick={() => goTo('/cuenta')}
          >
            Mi Cuenta
          </button>
          {isAuthenticated && (
            <button
              type="button"
              role="menuitem"
              className="user-menu-avatar__item user-menu-avatar__item--danger"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </div>
  );
}
