import { useUser } from '../../context/UserContext';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';
import { shouldSuppressPlatformUpsell } from '../../utils/planAccess';
import './TrialWelcomeModal.css';

export default function TrialBadge() {
  const { user, isAuthenticated } = useUser();
  const { freeModeEnabled } = usePlatformSettings();

  if (!isAuthenticated || !user?.trialActive) return null;
  if (shouldSuppressPlatformUpsell(user, freeModeEnabled)) return null;

  const days = user.trialDaysRemaining ?? 0;
  const label =
    days <= 1
      ? 'Prueba gratuita – 1 día restante'
      : `Prueba gratuita – ${days} días restantes`;

  return (
    <span className="trial-badge" title={label}>
      {label}
    </span>
  );
}
