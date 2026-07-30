import { useState } from 'react';
import { CircleUser } from 'lucide-react';

import { Blueprint } from '../../components/Blueprint.jsx';
import { useT } from '../../i18n/index.js';

/**
 * Sign-in card, 400px. Copy verbatim from design/SCREENS.md screen 01:
 * lockup · paragraph · SSO button · "atau" divider · email fallback · note.
 */
export function SignInCard({ onSignInWithGoogle, onSendLink }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [failure, setFailure] = useState(null);

  const run = async (kind, action) => {
    setPending(kind);
    setFailure(null);
    try {
      return await action();
    } catch (error) {
      setFailure(error?.message || t('masuk.signInFailed'));
      return null;
    } finally {
      setPending(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await run('link', () => onSendLink(email));
    if (result) setSentTo(result.sentTo);
  };

  return (
    <Blueprint className="signin">
      <div className="signin-lockup">
        <span className="signin-logo" aria-hidden="true">
          LOGO
        </span>
        <span className="rail-lockup">
          <span className="signin-name">LOKUS</span>
          <span className="rail-tagline">{t('masuk.signInBy')}</span>
        </span>
      </div>

      <p className="signin-intro">{t('masuk.intro')}</p>

      <button
        type="button"
        className="btn btn-secondary btn-block signin-sso"
        onClick={() => run('sso', onSignInWithGoogle)}
        disabled={pending !== null}
      >
        <CircleUser size={16} strokeWidth={1.5} aria-hidden="true" />
        {pending === 'sso' ? t('masuk.connecting') : t('masuk.google')}
      </button>

      <div className="signin-divider" aria-hidden="true">
        <span className="signin-rule" />
        {t('masuk.or')}
        <span className="signin-rule" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="signin-email">{t('masuk.emailLabel')}</label>
          <input
            id="signin-email"
            className="input"
            type="email"
            required
            autoComplete="email"
            placeholder={t('masuk.emailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={pending !== null}>
          {pending === 'link' ? t('masuk.sending') : t('masuk.sendLink')}
        </button>
      </form>

      {sentTo ? (
        <p className="signin-sent" role="status">
          {t('masuk.linkSent', { email: sentTo })}
        </p>
      ) : null}

      {failure ? (
        <p className="signin-failure" role="alert">
          {failure}
        </p>
      ) : null}

      <p className="signin-note">{t('masuk.note')}</p>
    </Blueprint>
  );
}
