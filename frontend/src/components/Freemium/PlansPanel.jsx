import React from 'react';
import { useUser } from '../../context/UserContext';
import { getPlanLabel, hasFullProAccess, PLANS } from '../../utils/planAccess';
import PayButton from '../PayButton';
import './PlansPanel.css';

const proPriceId = import.meta.env.VITE_STRIPE_PRICE_ID?.trim() || '';

export default function PlansPanel() {
  const { user } = useUser();
  const currentPlan = user?.plan || PLANS.FREE;
  const isPro = hasFullProAccess(user);

  return (
    <section className="plans-panel" aria-labelledby="plans-panel-title">
      <h3 id="plans-panel-title" className="plans-panel__title">
        Planes GOAL_LOGIC
      </h3>
      <p className="plans-panel__subtitle">
        Plan actual: <strong>{getPlanLabel(currentPlan)}</strong>
      </p>

      <div className="plans-panel__grid plans-panel__grid--two">
        <article className={`plans-panel__card${!isPro && currentPlan !== PLANS.TRIAL ? ' is-current' : ''}`}>
          <h4>Free</h4>
          <p className="plans-panel__price">$0</p>
          <ul>
            <li>Navegación completa de la app</li>
            <li>3 predicciones por día</li>
            <li>1 simulación por día</li>
            <li>Estadísticas y panorama básico</li>
            <li>Tabla, partidos, goleadores y equipos</li>
          </ul>
          {!isPro && currentPlan !== PLANS.TRIAL && (
            <span className="plans-panel__badge">Plan actual</span>
          )}
        </article>

        <article className={`plans-panel__card plans-panel__card--pro${isPro ? ' is-current' : ''}`}>
          <h4>PRO</h4>
          <p className="plans-panel__price">Acceso total</p>
          <ul>
            <li>Predicciones y simulaciones ilimitadas</li>
            <li>Estadísticas avanzadas</li>
            <li>Torneos premium (Champions, Mundial…)</li>
            <li>Modelos avanzados GOAL_LOGIC</li>
            <li>Alertas y notificaciones</li>
          </ul>
          {isPro ? (
            <span className="plans-panel__badge">Plan actual</span>
          ) : proPriceId ? (
            <PayButton buttonText="Elegir PRO" priceId={proPriceId} showCouponField={false} />
          ) : (
            <p className="plans-panel__soon">Configura VITE_STRIPE_PRICE_ID</p>
          )}
        </article>
      </div>
    </section>
  );
}
