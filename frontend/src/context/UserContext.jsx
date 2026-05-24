import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  hasToken,
  removeToken,
  getAuthUserSnapshot,
  getUserIdFromToken,
  saveAuthUserSnapshot,
  getSession,
  acceptLegalNotice,
} from '../services/authService';
import { getUserProfile } from '../services/userService';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe usarse dentro de UserProvider');
  }
  return context;
};

function mapSessionUser(sessionUser) {
  if (!sessionUser) return null;
  const id = String(sessionUser.id ?? sessionUser.user_id);
  return {
    ...sessionUser,
    id,
    user_id: id,
    role: sessionUser.role || 'usuario',
    isMainAdmin: sessionUser.isMainAdmin || false,
    premium: sessionUser.premium === true,
    legalAccepted: sessionUser.legalAccepted === true,
  };
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState({ equipos: [], ligas: [] });
  const [simulatorState, setSimulatorState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPremiumBanner, setShowPremiumBanner] = useState(false);

  useEffect(() => {
    if (hasToken()) {
      loadUserProfile();
    } else {
      setUser(null);
      setFavorites({ equipos: [], ligas: [] });
      setSimulatorState(null);
      setShowPremiumBanner(false);
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const session = await getSession();
      if (!session.success) {
        throw new Error(session.message || 'Error al cargar sesión');
      }

      const sessionUser = mapSessionUser(session.user);
      saveAuthUserSnapshot(sessionUser);
      setUser(sessionUser);

      if (!sessionUser.legalAccepted) {
        setShowPremiumBanner(false);
        setFavorites({ equipos: [], ligas: [] });
        setSimulatorState(null);
        return;
      }

      try {
        const profile = await getUserProfile();
        if (profile.success) {
          const userData = mapSessionUser({
            ...profile.user,
            id: profile.user.user_id,
            legalAccepted: profile.user.legalAccepted === true,
          });
          saveAuthUserSnapshot(userData);
          setUser(userData);
          setShowPremiumBanner(false);
          setFavorites(profile.favorites || { equipos: [], ligas: [] });
          setSimulatorState(
            profile.simulator_state || {
              capital_inicial: 1000,
              capital_actual: 1000,
              apuestas: [],
            }
          );
        }
      } catch (profileError) {
        const paymentRequired =
          profileError.message === 'Debes completar el pago' ||
          profileError.message.includes('Debes completar el pago');

        if (paymentRequired) {
          setShowPremiumBanner(true);
          setFavorites({ equipos: [], ligas: [] });
          setSimulatorState({
            capital_inicial: 1000,
            capital_actual: 1000,
            apuestas: [],
          });
          setError(null);
        } else {
          throw profileError;
        }
      }
    } catch (err) {
      console.error('Error cargando perfil del usuario:', err);

      if (
        err.message.includes('Sesión expirada') ||
        err.message.includes('401')
      ) {
        handleLogout();
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const acceptLegal = async () => {
    const result = await acceptLegalNotice();
    if (result.success) {
      setUser((prev) => ({
        ...(prev || {}),
        legalAccepted: true,
        legalAcceptedAt: result.legalAcceptedAt || new Date().toISOString(),
      }));
      saveAuthUserSnapshot({
        ...(getAuthUserSnapshot() || {}),
        legalAccepted: true,
      });
      await loadUserProfile();
    }
    return result;
  };

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  const updateFavorites = (newFavorites) => {
    setFavorites(newFavorites);
  };

  const updateSimulatorState = (newState) => {
    setSimulatorState(newState);
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setFavorites({ equipos: [], ligas: [] });
    setSimulatorState(null);
    setShowPremiumBanner(false);
    setError(null);
  };

  const refreshProfile = () => {
    if (!hasToken()) {
      return Promise.resolve();
    }
    return loadUserProfile();
  };

  const isAdminRole = user?.role === 'admin' || user?.role === 'admin_secundario';
  const isMainAdminRole =
    (user?.role === 'admin' && user?.isMainAdmin === true) || user?.isMainAdmin === true;

  const needsLegalAcceptance = hasToken() && user && user.legalAccepted !== true;

  const value = {
    user,
    favorites,
    simulatorState,
    loading,
    error,
    showPremiumBanner,
    isAuthenticated: !!user && hasToken(),
    needsLegalAcceptance,

    updateUser,
    updateFavorites,
    updateSimulatorState,
    loadUserProfile,
    handleLogout,
    refreshProfile,
    acceptLegal,

    isAdmin: isAdminRole,
    isMainAdmin: isMainAdminRole,
    isAdminSecundario: user?.role === 'admin_secundario',
    isUser: user?.role === 'usuario' || (!user?.role && !user?.isMainAdmin),
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
