import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { dbAppUsers } from '../lib/supabaseService';
import type { AppUserRow } from '../lib/supabaseService';

export const LoginScreen: React.FC<{ onLogin: (user: AppUserRow) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: dbError } = await dbAppUsers.login(username, password);
      if (dbError || !data) {
        setError('Usuario o contraseña incorrectos');
      } else {
        onLogin(data as AppUserRow);
      }
    } catch (err: any) {
      setError('Error al intentar iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: '20px', zIndex: 9999 }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, textAlign: 'center', marginBottom: '8px', color: '#1e293b' }}>Gallo Azul Ops</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '32px' }}>Inicia sesión para continuar</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Usuario</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '12px', left: '12px', color: '#94a3b8' }}>
                <User size={20} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px' }}
                placeholder="Ingresa tu usuario"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '12px', left: '12px', color: '#94a3b8' }}>
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 40px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px' }}
                placeholder="Ingresa tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', top: '12px', right: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', fontWeight: 500 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '14px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};
