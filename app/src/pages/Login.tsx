import React, { useState } from 'react';
import { Package, Lock, User, AlertCircle } from 'lucide-react';

export const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulate login validation
    setTimeout(() => {
      setLoading(false);
      if (username === 'admin' && password === '123') {
        onLogin();
      } else {
        setError('Usuário ou senha inválidos (use: admin / 123)');
      }
    }, 1000);
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', width: '100%', padding: '2rem' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="flex-center" style={{ 
            width: '80px', height: '80px', 
            borderRadius: '50%', background: 'rgba(0, 240, 255, 0.1)', 
            margin: '0 auto 1.5rem auto', border: '1px solid var(--accent-primary)',
            boxShadow: 'var(--shadow-neon)'
          }}>
            <Package color="var(--accent-primary)" size={40} />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>PDM</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Portaria Delivery Manager</p>
        </div>

        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', textAlign: 'left' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <User style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              className="input-base" 
              placeholder="Usuário" 
              style={{ paddingLeft: '3rem' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="password" 
              className="input-base" 
              placeholder="Senha" 
              style={{ paddingLeft: '3rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};
