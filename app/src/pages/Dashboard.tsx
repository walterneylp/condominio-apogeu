import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState({ recebidasHoje: 0, entregues: 0, pendentes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase.from('entregas').select('status, created_at');
      if (error) throw error;

      let recebidasHoje = 0;
      let entregues = 0;
      let pendentes = 0;

      data?.forEach(enc => {
        if (enc.status === 'entregue') {
          entregues++;
        } else {
          pendentes++;
        }
        
        const createdMs = new Date(enc.created_at).getTime();
        if (createdMs >= today.getTime()) {
           recebidasHoje++;
        }
      });

      setMetrics({ recebidasHoje, entregues, pendentes });
    } catch (err) {
      console.error('Erro ao buscar métricas', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card animate-fade-in text-gradient-wrap">
      <h1 className="text-gradient">Painel da Portaria</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Visão geral das encomendas e atividades do dia.</p>
      
      {loading ? (
        <div className="flex-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginTop: '2rem' }}>
          <Link to="/historico" className="glass-panel hover-glass" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="flex-between">
              <h3 style={{ color: 'var(--text-secondary)' }}>Recebidas Hoje</h3>
              <Package color="var(--accent-primary)" size={24} />
            </div>
            <h2 style={{ fontSize: '2.5rem', marginTop: '1rem', color: 'var(--text-primary)' }}>{metrics.recebidasHoje}</h2>
          </Link>
          
          <Link to="/historico" className="glass-panel hover-glass" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="flex-between">
              <h3 style={{ color: 'var(--text-secondary)' }}>Entregues</h3>
              <CheckCircle color="var(--success)" size={24} />
            </div>
            <h2 style={{ fontSize: '2.5rem', marginTop: '1rem', color: 'var(--text-primary)' }}>{metrics.entregues}</h2>
          </Link>
          
          <Link to="/retiradas" className="glass-panel hover-glass" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="flex-between">
              <h3 style={{ color: 'var(--text-secondary)' }}>Pendentes</h3>
              <Truck color="var(--warning)" size={24} />
            </div>
            <h2 style={{ fontSize: '2.5rem', marginTop: '1rem', color: 'var(--text-primary)' }}>{metrics.pendentes}</h2>
          </Link>
        </div>
      )}
    </div>
  );
};
