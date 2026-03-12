import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { Package, Truck, Users, Settings, LogOut, CheckCircle, History, Activity } from 'lucide-react'; // Added History and Activity icon
import { Login } from './pages/Login';
import { Recebimentos } from './pages/Recebimentos';
import { Dashboard } from './pages/Dashboard';
import { Retiradas } from './pages/Retiradas';
import { Cadastros } from './pages/Cadastros';
import { Historico } from './pages/Historico'; // Added Historico import
import { Relatorios } from './pages/Relatorios'; // Added Relatorios import
import { NotificationToast } from './components/NotificationToast';
import { startTelegramPolling, stopTelegramPolling } from './lib/telegramPolling';

// Layout Component
const Layout = ({ onLogout }: { onLogout: () => void }) => { // Removed children prop, now uses Outlet
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Package size={20} /> }, // Changed path from '/' to '/dashboard'
    { path: '/recebimentos', label: 'Recebimentos', icon: <Truck size={20} /> },
    { path: '/retiradas', label: 'Retiradas', icon: <CheckCircle size={20} /> },
    { path: '/historico', label: 'Histórico', icon: <History size={20} /> }, // Added Historico nav item
    { path: '/cadastros', label: 'Cadastros', icon: <Users size={20} /> },
    { path: '/relatorios', label: 'Relatórios', icon: <Activity size={20} /> }, // Added Relatorios nav item
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar Navigation */}
      <aside className="glass-panel" style={{ width: '280px', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0, position: 'sticky', top: 0, height: '100vh', zIndex: 10 }}>
        <div style={{ padding: '0 1rem', marginBottom: '3rem' }}>
          <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
            <Package /> PDM
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Portaria Delivery Manager</p>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={isActive ? 'nav-active' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  background: isActive ? 'linear-gradient(90deg, rgba(0, 240, 255, 0.15), transparent)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  borderLeft: isActive ? '4px solid var(--accent-primary)' : '4px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {React.cloneElement(item.icon, { color: isActive ? 'var(--accent-primary)' : 'currentColor' })}
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: 'auto' }}>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
            <Settings size={20} />
            Configurações
          </button>
          <button 
            className="btn btn-danger" 
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', marginTop: '0.5rem' }}
            onClick={onLogout}
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', maxWidth: '100%', overflowX: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'var(--glass-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Carlos Silva</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Porteiro - Turno Manhã</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              CS
            </div>
          </div>
        </header>

        <div style={{ flex: 1, position: 'relative' }}>
          <Outlet /> {/* Renders nested routes */}
          <NotificationToast />
        </div>
      </main>
    </div>
  );
};

// Dummy Authentication logic for MVP
const ProtectedRoute = ({ children, isAuthenticated }: { children: React.ReactNode, isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Main App Router
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for authentication on initial load
  React.useEffect(() => {
    const storedAuth = localStorage.getItem('pdm_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      startTelegramPolling();
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem('pdm_auth', 'true');
    setIsAuthenticated(true);
    startTelegramPolling();
  };

  const handleLogout = () => {
    localStorage.removeItem('pdm_auth');
    setIsAuthenticated(false);
    stopTelegramPolling();
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} /> {/* Redirect root to dashboard */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="recebimentos" element={<Recebimentos />} />
          <Route path="retiradas" element={<Retiradas />} />
          <Route path="historico" element={<Historico />} /> {/* Added Historico route */}
          <Route path="cadastros" element={<Cadastros />} />
          <Route path="relatorios" element={<Relatorios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
