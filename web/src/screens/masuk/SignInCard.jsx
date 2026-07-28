import { useState } from 'react';
import { CircleUser } from 'lucide-react';

import { Blueprint } from '../../components/Blueprint.jsx';

/**
 * Sign-in card, 400px. Copy verbatim from design/SCREENS.md screen 01:
 * lockup · paragraph · SSO button · "atau" divider · email fallback · note.
 */
export function SignInCard({ onSignInWithGoogle, onSendLink }) {
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
      setFailure(error?.message || 'Masuk gagal. Coba lagi.');
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
          <span className="rail-tagline">oleh EBCO</span>
        </span>
      </div>

      <p className="signin-intro">
        Masuk dengan akun kerja Anda. Akses ke cabang mengikuti peran Anda di organisasi.
      </p>

      <button
        type="button"
        className="btn btn-secondary btn-block signin-sso"
        onClick={() => run('sso', onSignInWithGoogle)}
        disabled={pending !== null}
      >
        <CircleUser size={16} strokeWidth={1.5} aria-hidden="true" />
        {pending === 'sso' ? 'Menghubungkan…' : 'Lanjutkan dengan Google Workspace'}
      </button>

      <div className="signin-divider" aria-hidden="true">
        <span className="signin-rule" />
        atau
        <span className="signin-rule" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="signin-email">Email kerja</label>
          <input
            id="signin-email"
            className="input"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@perusahaan.co.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={pending !== null}>
          {pending === 'link' ? 'Mengirim…' : 'Kirim tautan masuk'}
        </button>
      </form>

      {sentTo ? (
        <p className="signin-sent" role="status">
          Tautan masuk dikirim ke {sentTo}. Periksa kotak masuk Anda.
        </p>
      ) : null}

      {failure ? (
        <p className="signin-failure" role="alert">
          {failure}
        </p>
      ) : null}

      <p className="signin-note">Dilindungi SSO organisasi. LOKUS tidak menyimpan kata sandi.</p>
    </Blueprint>
  );
}
