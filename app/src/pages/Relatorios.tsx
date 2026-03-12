import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Clock, ShieldAlert, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export const Relatorios = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLogs = logs.filter(log => {
     if (!searchTerm) return true;
     const term = searchTerm.toLowerCase();
     return (
       log.criado_por?.toLowerCase().includes(term) ||
       log.acao?.toLowerCase().includes(term) ||
       log.entidade?.toLowerCase().includes(term) ||
       JSON.stringify(log.detalhes).toLowerCase().includes(term)
     );
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: logError } = await supabase
        .from('logs_auditoria')
        .select('*')
        .order('created_at', { ascending: false });

      if (logError) throw logError;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar logs de auditoria.');
    } finally {
      setLoading(false);
    }
  };

  const formatAcao = (acao: string) => {
    switch (acao) {
      case 'CREATE': return <span style={{ color: 'var(--success)', fontWeight: 600 }}>CRIOU</span>;
      case 'UPDATE': return <span style={{ color: 'var(--warning)', fontWeight: 600 }}>EDITOU</span>;
      case 'DELETE': return <span style={{ color: 'var(--danger)', fontWeight: 600 }}>EXCLUIU</span>;
      default: return acao;
    }
  };

  const formatEntidade = (entidade: string) => {
    const titulos: any = {
      moradores: 'Morador',
      unidades: 'Unidade',
      usuarios: 'Operador',
      terceiros_autorizados: 'Terceiro Autorizado'
    };
    return titulos[entidade] || entidade;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity className="text-secondary" />
            Relatórios e Auditoria
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visualize o histórico de alterações no sistema</p>
        </div>

        <div style={{ position: 'relative', minWidth: '350px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Pesquisar em usuários, ações ou detalhes..." 
            className="input-base" 
            style={{ paddingLeft: '2.5rem' }} 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
        
        {loading ? (
          <div className="flex-center" style={{ padding: '4rem', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="spin" style={{ marginBottom: '1rem' }} />
            <p>Carregando registros...</p>
          </div>
        ) : error ? (
          <div className="flex-center flex-col" style={{ padding: '4rem', color: 'var(--danger)' }}>
            <ShieldAlert size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>{error}</p>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Data e Hora</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Usuário</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Ação</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Entidade Afetada</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Detalhes Adicionais</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {searchTerm ? 'Nenhum resultado para sua pesquisa.' : 'Nenhum registro de auditoria encontrado.'}
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="hover-glass">
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={14} />
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                         </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                        {log.criado_por === 'Sistema/Local' ? (
                           <span style={{ color: 'var(--text-muted)' }}>Sistema (Localhost)</span>
                        ) : log.criado_por}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>{formatAcao(log.acao)}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>{formatEntidade(log.entidade)}</td>
                      <td style={{ padding: '1rem 1.5rem', maxWidth: '300px' }}>
                         <pre style={{ 
                            background: 'rgba(0,0,0,0.2)', 
                            padding: '0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem', 
                            color: 'var(--text-secondary)', 
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                         }}>
                            {log.detalhes ? JSON.stringify(log.detalhes, null, 2) : '-'}
                         </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && totalPages > 1 && (
          <div style={{ 
            padding: '1rem 1.5rem', 
            borderTop: '1px solid var(--glass-border)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'var(--bg-tertiary)'
          }}>
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
               Mostrando <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{paginatedLogs.length}</span> de {filteredLogs.length} registros
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                >
                  <ChevronLeft size={18} />
                </button>
                
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Página <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{currentPage}</span> de {totalPages}
                </span>

                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                >
                  <ChevronRight size={18} />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
