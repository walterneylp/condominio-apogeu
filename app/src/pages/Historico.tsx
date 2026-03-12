import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Loader2, Package, CheckCircle, Clock, Calendar, ShieldAlert, Image as ImageIcon } from 'lucide-react';

type Entrega = {
  id: string;
  codigo_entrega: string;
  tipo_entrega: string;
  status: string;
  created_at: string;
  unidades: { numero: string; bloco?: string };
  moradores: { nome: string };
  fotos_entrega?: { foto_url: string }[];
};

export const Historico = () => {
  const [encomendas, setEncomendas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id, codigo_entrega, tipo_entrega, status, created_at,
          unidades (numero, bloco),
          moradores (nome),
          fotos_entrega (foto_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEncomendas(data as unknown as Entrega[] || []);
    } catch (err) {
      console.error("Erro ao buscar histórico", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'entregue':
         return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} /> Entregue</span>;
      case 'recebido':
         return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> Na Portaria</span>;
      default:
         return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-secondary)' }}>{status}</span>;
    }
  };

  const getTypeIcon = () => {
    return <Package size={18} color="var(--text-secondary)" />;
  };

  const filtered = encomendas.filter(e => {
    const matchesSearch = 
      e.codigo_entrega.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.moradores?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.unidades?.numero || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'todos' || e.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="glass-card animate-fade-in text-gradient-wrap">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="text-gradient">Histórico de Encomendas</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Auditoria completa de tudo que passou pela portaria.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            className="input-base" 
            placeholder="Buscar por código, morador ou unidade..." 
            style={{ paddingLeft: '3rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input-base" 
          style={{ width: '200px', appearance: 'none' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="todos">Todos os Status</option>
          <option value="recebido">Na Portaria</option>
          <option value="entregue">Entregues</option>
        </select>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '4rem 0' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel flex-center" style={{ padding: '4rem 2rem', flexDirection: 'column', gap: '1rem' }}>
           <ShieldAlert size={48} color="var(--text-muted)" />
           <p style={{ color: 'var(--text-secondary)' }}>Nenhum registro encontrado no histórico.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--glass-light)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Data/Hora</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Código/Tipo</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Destinatário</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Foto</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(enc => (
                <tr key={enc.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background var(--transition-fast)' }} className="hover-glass">
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                      <Calendar size={16} color="var(--text-muted)" />
                      {new Date(enc.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {new Date(enc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="flex-center" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-light)' }}>
                        {getTypeIcon()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{enc.codigo_entrega}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
                          {enc.tipo_entrega}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 500 }}>{enc.moradores?.nome || 'Não identificado'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Unidade {enc.unidades?.numero} {enc.unidades?.bloco ? `- Bloco ${enc.unidades?.bloco}` : ''}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {enc.fotos_entrega && enc.fotos_entrega.length > 0 ? (
                      <a href={enc.fotos_entrega[0].foto_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
                        <ImageIcon size={16} /> Ver Anexo
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sem foto</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {getStatusBadge(enc.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
