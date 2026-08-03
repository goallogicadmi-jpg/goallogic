import { useEffect, useState } from 'react';
import {
  getAnalystSubscribers,
  sendAnalystMessage,
} from '../../services/analystService';
import './AnalystSubscriberMessaging.css';

export default function AnalystSubscriberMessaging({ analystId }) {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const rows = await getAnalystSubscribers(analystId);
        if (!cancelled) setSubscribers(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || 'No se pudieron cargar los suscriptores');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [analystId]);

  function toggleSubscriber(publicId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
      };

      if (!sendToAll) {
        const publicIds = [...selectedIds].filter(Boolean);
        if (!publicIds.length) {
          throw new Error('Selecciona al menos un suscriptor.');
        }
        payload.subscriberPublicIds = publicIds;
      }

      const result = await sendAnalystMessage(analystId, payload);
      setSuccess(result.message || 'Mensaje enviado correctamente.');
      setTitle('');
      setContent('');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="analyst-messaging">
        <p className="analyst-messaging__status">Cargando suscriptores…</p>
      </div>
    );
  }

  if (error && subscribers.length === 0) {
    return (
      <div className="analyst-messaging">
        <p className="analyst-messaging__error">{error}</p>
      </div>
    );
  }

  if (subscribers.length === 0) {
    return (
      <div className="analyst-messaging">
        <div className="analyst-messaging__empty">
          <p className="analyst-messaging__status">Aún no tienes suscriptores activos.</p>
          <p className="analyst-messaging__hint">
            Cuando alguien se suscriba a tu perfil, podrás verlo aquí y enviarle mensajes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="analyst-messaging">
      <div className="analyst-messaging__layout">
        <div className="analyst-messaging__card analyst-messaging__subscribers">
          <h3 className="analyst-messaging__card-title">
            Suscriptores ({subscribers.length})
          </h3>
          <p className="analyst-messaging__hint">
            Lista de usuarios con suscripción activa a tu perfil.
          </p>
          <ul>
            {subscribers.map((sub, index) => {
              const key = sub.publicId || `row-${index}`;
              return (
                <li key={key}>
                  <span className="analyst-messaging__name">{sub.name}</span>
                  <span className="analyst-messaging__public-id">{sub.publicId || '—'}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="analyst-messaging__card analyst-messaging__compose">
          <h3 className="analyst-messaging__card-title">Enviar mensaje</h3>
          <p className="analyst-messaging__hint">
            Los suscriptores recibirán el mensaje en su bandeja interna (Mi Cuenta → Actividad).
          </p>

          <form className="analyst-messaging__form" onSubmit={handleSubmit}>
            <label className="analyst-messaging__field">
              <span>Título</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className="analyst-messaging__field">
              <span>Mensaje</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={5000}
                required
              />
            </label>

            <fieldset className="analyst-messaging__targets">
              <legend>Destinatarios</legend>
              <label>
                <input
                  type="radio"
                  name="targetMode"
                  checked={sendToAll}
                  onChange={() => setSendToAll(true)}
                />
                Todos los suscriptores
              </label>
              <label>
                <input
                  type="radio"
                  name="targetMode"
                  checked={!sendToAll}
                  onChange={() => setSendToAll(false)}
                />
                Suscriptores específicos
              </label>
            </fieldset>

            {!sendToAll ? (
              <div className="analyst-messaging__picker">
                {subscribers.map((sub, index) => {
                  const key = sub.publicId || `row-${index}`;
                  return (
                    <label key={key} className="analyst-messaging__picker-item">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(key)}
                        onChange={() => toggleSubscriber(key)}
                      />
                      <span>{sub.name}</span>
                      <span className="analyst-messaging__public-id">{sub.publicId || '—'}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {error ? <p className="analyst-messaging__error">{error}</p> : null}
            {success ? <p className="analyst-messaging__success">{success}</p> : null}

            <button type="submit" className="analyst-messaging__submit" disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
