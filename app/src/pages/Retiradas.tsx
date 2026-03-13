import { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, ShieldCheck, Loader2, AlertCircle, User, Package, History, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SearchableSelect } from '../components/SearchableSelect';
import { logAuditoria } from '../lib/audit';
import { telegramService } from '../lib/telegram';

type Entrega = {
  id: string;
  codigo_entrega: string;
  tipo_entrega: string;
  status: string;
  created_at: string;
  unidades?: { numero: string; bloco: string };
  moradores?: { nome: string } | null;
};

type Retirada = {
  id: string;
  created_at: string;
  retirado_por_nome: string;
  relacao_morador?: string;
  entrega_id: string;
  entregas?: {
    codigo_entrega: string;
    tipo_entrega: string;
    unidades?: { numero: string; bloco: string };
    moradores?: { nome: string } | null;
  };
  usuarios?: { nome: string };
};

type MoradorNotificacao = {
  id: string;
  nome: string;
  telegram_id?: string | null;
  pin_vinculo_telegram?: string | null;
};

export const Retiradas = () => {
  // --- SEÇÃO SUPERIOR (Pendentes) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [encomendas, setEncomendas] = useState<Entrega[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [selectedOperadorId, setSelectedOperadorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- MODAL de confirmação ---
  const [modalEntrega, setModalEntrega] = useState<Entrega | null>(null);
  const [nomeRetirador, setNomeRetirador] = useState('');
  const [relacaoRetirador, setRelacaoRetirador] = useState('Próprio morador');

  // --- SEÇÃO INFERIOR (Histórico) ---
  const [retiradas, setRetiradas] = useState<Retirada[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [filtroMorador, setFiltroMorador] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [unidades, setUnidades] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchHistorico();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [entregasRes, operadoresRes, unidadesRes] = await Promise.all([
        supabase
          .from('entregas')
          .select(`id, codigo_entrega, tipo_entrega, status, created_at, unidades(numero, bloco), moradores(nome)`)
          .in('status', ['recebido', 'aguardando retirada', 'notificado'])
          .order('created_at', { ascending: false }),
        supabase.from('usuarios').select('id, nome').order('nome'),
        supabase.from('unidades').select('id, numero, bloco').order('numero'),
      ]);

      setEncomendas((entregasRes.data || []) as any[]);
      setOperadores(operadoresRes.data || []);
      setUnidades(unidadesRes.data || []);

      if (operadoresRes.data && operadoresRes.data.length > 0) {
        setSelectedOperadorId(operadoresRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const { data, error: histError } = await supabase
        .from('retiradas')
        .select(`
          id, created_at, retirado_por_nome, relacao_morador, entrega_id,
          entregas(codigo_entrega, tipo_entrega, unidades(numero, bloco), moradores(nome)),
          usuarios(nome)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (histError) console.error('Erro no histórico:', histError);
      setRetiradas((data || []) as any[]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const abrirModal = (entrega: Entrega) => {
    setModalEntrega(entrega);
    setNomeRetirador(entrega.moradores?.nome || '');
    setRelacaoRetirador('Próprio morador');
  };

  const fetchPickupNotificationTargets = async (entregaId: string): Promise<MoradorNotificacao[]> => {
    const { data: entregaDetalhes, error: entregaError } = await supabase
      .from('entregas')
      .select('unidade_id, morador_id')
      .eq('id', entregaId)
      .single();

    if (entregaError) throw entregaError;
    if (!entregaDetalhes?.unidade_id) return [];

    let query = supabase
      .from('moradores')
      .select('id, nome, telegram_id, pin_vinculo_telegram')
      .eq('status', 'ativo');

    query = entregaDetalhes.morador_id
      ? query.eq('id', entregaDetalhes.morador_id)
      : query.eq('unidade_id', entregaDetalhes.unidade_id);

    const { data, error: moradoresError } = await query;

    if (moradoresError) throw moradoresError;

    return data || [];
  };

  const handleConfirmarRetirada = async () => {
    if (!modalEntrega || !nomeRetirador.trim()) {
      setError('Informe o nome de quem está retirando.');
      return;
    }
    if (!selectedOperadorId) {
      setError('Selecione o operador responsável.');
      return;
    }

    const entregaSnapshot = { ...modalEntrega }; // save before clearing
    const entregaId = entregaSnapshot.id;
    const nomeRetiradorSnapshot = nomeRetirador.trim();
    const relacaoSnapshot = relacaoRetirador;
    const operadorNome = operadores.find(op => op.id === selectedOperadorId)?.nome || 'Operador';
    const agora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    setModalEntrega(null);
    setEncomendas(prev => prev.filter(e => e.id !== entregaId));

    try {
      const { error: updateError } = await supabase
        .from('entregas')
        .update({ status: 'entregue' })
        .eq('id', entregaId);

      if (updateError) throw updateError;

      const { error: retiradaError } = await supabase
        .from('retiradas')
        .insert([{
          entrega_id: entregaId,
          operador_id: selectedOperadorId,
          retirado_por_nome: nomeRetiradorSnapshot,
          relacao_morador: relacaoSnapshot,
        }]);

      if (retiradaError) console.warn('Erro ao criar retirada:', retiradaError);

      const moradoresNotif = await fetchPickupNotificationTargets(entregaId);
      const withTelegram = moradoresNotif.filter(m => m.telegram_id);
      const pendingTelegramLink = moradoresNotif.filter(m => !m.telegram_id && m.pin_vinculo_telegram);
      const withoutAnyTelegramPath = moradoresNotif.filter(m => !m.telegram_id && !m.pin_vinculo_telegram);

      let notificationMsg = 'Retirada registrada com sucesso.';

      if (withTelegram.length > 0) {
        const notificados = await telegramService.notifyPickup(withTelegram, {
          codigoEntrega: entregaSnapshot.codigo_entrega,
          tipoEntrega: entregaSnapshot.tipo_entrega,
          retiradoPor: nomeRetiradorSnapshot,
          relacaoMorador: relacaoSnapshot,
          unidade: `${entregaSnapshot.unidades?.numero || ''}${entregaSnapshot.unidades?.bloco ? ` - Bloco ${entregaSnapshot.unidades.bloco}` : ''}`.trim(),
          operadorNome,
          dataHora: agora,
        });

        notificationMsg =
          notificados.length > 0
            ? `✅ Telegram de retirada enviado para: ${notificados.join(', ')}`
            : '⚠️ Erro ao enviar Telegram. Verificar vinculação.';
      }

      if (pendingTelegramLink.length > 0) {
        const pendentes = pendingTelegramLink.map(m => m.nome).join(', ');
        notificationMsg += `${withTelegram.length > 0 ? ' | ' : ''}Vínculo pendente: ${pendentes} (aguardando uso do novo QR/PIN)`;
      }

      if (withoutAnyTelegramPath.length > 0) {
        const semTelegram = withoutAnyTelegramPath.map(m => m.nome).join(', ');
        notificationMsg += `${withTelegram.length > 0 || pendingTelegramLink.length > 0 ? ' | ' : ''}Sem Telegram: ${semTelegram} (gere um novo QR em Cadastros)`;
      }

      const notificationEvent = new CustomEvent('pdm-notification', {
        detail: { type: 'success', message: notificationMsg }
      });
      window.dispatchEvent(notificationEvent);


      logAuditoria('UPDATE', 'entregas', entregaId, { status: 'entregue', retirado_por: nomeRetiradorSnapshot });
      fetchHistorico();
    } catch (err: any) {
      setError(err.message);
      fetchData();
    }
  };

  // Filtros
  const filteredPendentes = encomendas.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.codigo_entrega.toLowerCase().includes(term) ||
           (e.moradores?.nome?.toLowerCase().includes(term)) ||
           (e.unidades?.numero?.toLowerCase().includes(term));
  });

  const filteredHistorico = retiradas.filter(r => {
    const morMatch = !filtroMorador || r.entregas?.moradores?.nome?.toLowerCase().includes(filtroMorador.toLowerCase()) || r.retirado_por_nome.toLowerCase().includes(filtroMorador.toLowerCase());
    const uniMatch = !filtroUnidade || r.entregas?.unidades?.numero === filtroUnidade;
    return morMatch && uniMatch;
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ===== CABEÇALHO ===== */}
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient">Retirada de Encomendas</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Confirme a entrega e consulte o histórico.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <input type="text" className="input-base" placeholder="Buscar pendentes..." style={{ paddingLeft: '2.5rem' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div style={{ minWidth: '220px' }}>
            <SearchableSelect options={operadores.map(op => ({ value: op.id, label: op.nome }))} value={selectedOperadorId} onChange={setSelectedOperadorId} placeholder="Operador do Turno..." />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} /> {error}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      {/* ===== SEÇÃO SUPERIOR: PENDENTES ===== */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} style={{ color: 'var(--warning)' }} />
          <span style={{ fontWeight: 600 }}>Aguardando Retirada</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filteredPendentes.length} item(s)</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--glass-light)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Protocolo / Data</th>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Morador / Unidade</th>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Tipo</th>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textAlign: 'right' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 0.5rem', color: 'var(--accent-primary)' }} /><br/>Carregando...</td></tr>
            ) : filteredPendentes.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}><CheckCircle size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} /><br/>Sem pendências no momento!</td></tr>
            ) : (
              filteredPendentes.map(enc => (
                <tr key={enc.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{enc.codigo_entrega}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Clock size={11} /> {formatDate(enc.created_at)}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{enc.moradores?.nome || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '2px', border: '1px solid var(--glass-border)' }}>
                      Apto {enc.unidades?.numero}{enc.unidades?.bloco ? ` - Bloco ${enc.unidades.bloco}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{enc.tipo_entrega}</td>
                  <td style={{ padding: '0.85rem 1.5rem', textAlign: 'right' }}>
                    <button className="btn btn-primary" style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem' }} onClick={() => abrirModal(enc)}>
                      <ShieldCheck size={15} /> Registrar Retirada
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== SEÇÃO INFERIOR: HISTÓRICO ===== */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <History size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontWeight: 600 }}>Histórico de Retiradas</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <Filter size={14} style={{ position: 'absolute', top: '50%', left: '0.65rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="input-base" style={{ paddingLeft: '2rem', fontSize: '0.85rem', height: '36px' }} placeholder="Filtrar por morador..." value={filtroMorador} onChange={e => setFiltroMorador(e.target.value)} />
            </div>
            <select className="input-base" style={{ fontSize: '0.85rem', height: '36px', minWidth: '160px' }} value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}>
              <option value="">Todas as unidades</option>
              {unidades.map(u => <option key={u.id} value={u.numero}>{u.numero}{u.bloco ? ` - Bloco ${u.bloco}` : ''}</option>)}
            </select>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--glass-light)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Data / Hora</th>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Encomenda</th>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Quem Retirou</th>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Operador</th>
              <th style={{ padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Unidade</th>
            </tr>
          </thead>
          <tbody>
            {loadingHistorico ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" size={24} style={{ margin: '0 auto', color: 'var(--accent-primary)' }} /></td></tr>
            ) : filteredHistorico.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma retirada encontrada.</td></tr>
            ) : (
              filteredHistorico.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatDate(r.created_at)}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{r.entregas?.codigo_entrega || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.entregas?.tipo_entrega}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.retirado_por_nome}</div>
                    {r.relacao_morador && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.relacao_morador}</div>}
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {r.usuarios?.nome || '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', background: 'var(--bg-tertiary)', padding: '1px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid var(--glass-border)' }}>
                      {r.entregas?.unidades?.numero ? `Apto ${r.entregas.unidades.numero}${r.entregas?.unidades?.bloco ? ` - Bloco ${r.entregas.unidades.bloco}` : ''}` : '—'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r.entregas?.moradores?.nome}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== MODAL DE CONFIRMAÇÃO ===== */}
      {modalEntrega && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '480px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>Registrar Retirada</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Encomenda: <strong>{modalEntrega.codigo_entrega}</strong></p>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} onClick={() => setModalEntrega(null)}><X size={20} /></button>
            </div>

            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <div><strong>Tipo:</strong> {modalEntrega.tipo_entrega}</div>
                <div><strong>Morador:</strong> {modalEntrega.moradores?.nome || '—'}</div>
                <div><strong>Unidade:</strong> {modalEntrega.unidades?.numero}{modalEntrega.unidades?.bloco ? ` / Bl. ${modalEntrega.unidades.bloco}` : ''}</div>
                <div><strong>Chegada:</strong> {formatDate(modalEntrega.created_at)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}><User size={14} style={{ display: 'inline', marginRight: '4px' }} /> Nome de Quem Está Retirando *</label>
                <input type="text" className="input-base" placeholder="Nome completo do retirador" value={nomeRetirador} onChange={e => setNomeRetirador(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Relação com o Morador</label>
                <select className="input-base" value={relacaoRetirador} onChange={e => setRelacaoRetirador(e.target.value)}>
                  <option>Próprio morador</option>
                  <option>Familiar</option>
                  <option>Terceiro autorizado</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModalEntrega(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirmarRetirada} disabled={!nomeRetirador.trim()}>
                <ShieldCheck size={16} /> Confirmar Retirada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
