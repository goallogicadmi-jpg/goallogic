/**
 * Toasts internos de eventos en vivo (parte inferior de Alineaciones).
 */
export default function LineupsLiveEventToast({ toasts = [] }) {
  if (!toasts.length) return null;

  return (
    <div className="lineups-live-toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className="lineups-live-toast">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
