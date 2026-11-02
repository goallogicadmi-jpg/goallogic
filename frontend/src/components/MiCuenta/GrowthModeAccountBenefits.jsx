import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GrowthModeAccountBenefits.css';

/** Funciones reales disponibles hoy en GoalLogic para consumidores. */
const CONSUMER_CAPABILITIES = [
  {
    label: 'Registrar apuestas en tu panel personal',
    hint: 'Herramientas → Panel de apuestas',
    tab: 'herramientas',
    sectionId: 'panel-apuestas',
  },
  {
    label: 'Seguimiento con estadísticas de ROI y acierto',
    hint: 'Herramientas → Estadísticas',
    tab: 'herramientas',
  },
  {
    label: 'Consultar historial de apuestas',
    hint: 'Herramientas → Historial',
    tab: 'herramientas',
    sectionId: 'historial-apuestas',
  },
  {
    label: 'Ver evolución de profit en gráficos',
    hint: 'Herramientas → Evolución del profit',
    tab: 'herramientas',
  },
  {
    label: 'Analizar partidos con Predicciones GoalLogic',
    hint: 'Menú → Predicciones',
    route: '/predicciones',
  },
  {
    label: 'Explorar partidos, clubes y selecciones',
    hint: 'Navegación principal',
    route: '/clubes',
  },
  {
    label: 'Estadísticas avanzadas de equipos y competiciones',
    hint: 'Fichas de equipo y pestaña Estadísticas',
  },
  {
    label: 'Simulador de apuestas con capital virtual',
    hint: 'Herramientas → Simulador',
    tab: 'herramientas',
    sectionId: 'simulador-apuestas',
  },
  {
    label: 'Gestionar favoritos de equipos y ligas',
    hint: 'Actividad → Resumen',
    tab: 'actividad',
  },
  {
    label: 'Participar en la comunidad',
    hint: 'Menú → Comunidad',
    route: '/comunidad',
  },
  {
    label: 'Recibir mensajes y notificaciones',
    hint: 'Actividad → Mensajes',
    tab: 'actividad',
    sectionId: 'mensajes-usuario',
  },
  {
    label: 'Descubrir analistas y sus publicaciones',
    hint: 'Comunidad y perfiles de analista',
    route: '/comunidad',
  },
  {
    label: 'Acceder a todas las competiciones disponibles',
    hint: 'Incluye torneos premium del catálogo',
    route: '/torneos',
  },
];

export default function GrowthModeAccountBenefits({ onNavigateTab }) {
  const navigate = useNavigate();

  const handleItemClick = (item) => {
    if (item.route) {
      navigate(item.route);
      return;
    }
    if (item.tab && typeof onNavigateTab === 'function') {
      onNavigateTab(item.tab);
      if (item.sectionId) {
        window.setTimeout(() => {
          document.getElementById(item.sectionId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 120);
      }
    }
  };

  return (
    <section className="growth-account-benefits" aria-labelledby="growth-account-benefits-title">
      <header className="growth-account-benefits__header">
        <h2 id="growth-account-benefits-title" className="growth-account-benefits__title">
          Mis funciones disponibles
        </h2>
        <p className="growth-account-benefits__intro">
          Tienes acceso completo a GoalLogic. Esto es lo que puedes hacer desde tu cuenta:
        </p>
      </header>
      <ul className="growth-account-benefits__list">
        {CONSUMER_CAPABILITIES.map((item) => {
          const interactive = Boolean(item.route || item.tab);
          return (
            <li key={item.label} className="growth-account-benefits__item">
              {interactive ? (
                <button
                  type="button"
                  className="growth-account-benefits__row growth-account-benefits__row--link"
                  onClick={() => handleItemClick(item)}
                >
                  <span className="growth-account-benefits__check" aria-hidden="true">
                    ✓
                  </span>
                  <span className="growth-account-benefits__text">
                    <span className="growth-account-benefits__label">{item.label}</span>
                    {item.hint ? (
                      <span className="growth-account-benefits__hint">{item.hint}</span>
                    ) : null}
                  </span>
                </button>
              ) : (
                <div className="growth-account-benefits__row">
                  <span className="growth-account-benefits__check" aria-hidden="true">
                    ✓
                  </span>
                  <span className="growth-account-benefits__text">
                    <span className="growth-account-benefits__label">{item.label}</span>
                    {item.hint ? (
                      <span className="growth-account-benefits__hint">{item.hint}</span>
                    ) : null}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
