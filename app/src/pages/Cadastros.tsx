import React, { useState, useEffect } from 'react';
import { Users, Building, Shield, UserPlus, FileText, Loader2, AlertCircle, Edit2, Trash2, Check, X, Search, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAuditoria } from '../lib/audit';

const BOT_USERNAME = "condomioapogeu_bot"; // Usuário real do Bot fornecido pelo usuário

// Helper types
type Morador = { id: string, nome: string, unidade_id: string, telefone: string, status: string, unidades?: { numero: string, bloco: string }, telegram_id?: string, whatsapp?: string, pin_vinculo_telegram?: string };
type Unidade = { id: string, numero: string, bloco: string, tipo: string };
type Terceiro = { id: string, nome: string, documento: string, tipo: string, status: string, unidade_id: string, unidades?: { numero: string, bloco: string } };

export const Cadastros = () => {
  const [activeTab, setActiveTab] = useState('moradores');
  
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Search and Pagination States
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // New Morador Form State
  const [showNovoMorador, setShowNovoMorador] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoTelegram, setNovoTelegram] = useState('');
  const [novaUnidadeId, setNovaUnidadeId] = useState('');
  const [loadingNovo, setLoadingNovo] = useState(false);

  // New Unidade Form State
  const [showNovaUnidade, setShowNovaUnidade] = useState(false);
  const [novoNumeroUnidade, setNovoNumeroUnidade] = useState('');
  const [novoBlocoUnidade, setNovoBlocoUnidade] = useState('');

  // New Operador Form State
  const [showNovoOperador, setShowNovoOperador] = useState(false);
  const [novoNomeOp, setNovoNomeOp] = useState('');
  const [novoTurnoOp, setNovoTurnoOp] = useState('Manhã');
  const [novoPerfilOp, setNovoPerfilOp] = useState('porteiro');

  // New Terceiro Form State
  const [showNovoTerceiro, setShowNovoTerceiro] = useState(false);
  const [novoNomeTerceiro, setNovoNomeTerceiro] = useState('');
  const [novoDocTerceiro, setNovoDocTerceiro] = useState('');
  const [novoTipoTerceiro, setNovoTipoTerceiro] = useState('Visitante');
  const [novaUnidadeTerceiro, setNovaUnidadeTerceiro] = useState('');

  // Helper to generate 6-digit PIN
  const generateTelegramPin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const [qrCodeData, setQrCodeData] = useState<{ nome: string, pin: string } | null>(null);

  // Filtering and Pagination Logic
  const getFilteredData = () => {
    let rawData: any[] = [];
    if (activeTab === 'moradores') rawData = moradores;
    else if (activeTab === 'unidades') rawData = unidades;
    else if (activeTab === 'operadores') rawData = operadores;
    else if (activeTab === 'autorizados') rawData = terceiros;

    if (!globalSearch) return rawData;

    const term = globalSearch.toLowerCase();
    return rawData.filter(item => {
      const searchString = JSON.stringify(item).toLowerCase();
      return searchString.includes(term);
    });
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchData();
    setCurrentPage(1); // Reset page on tab change
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'moradores') {
        const { data, error } = await supabase.from('moradores').select('*, unidades(numero, bloco)').order('created_at', { ascending: false });
        if (error) throw error;
        setMoradores(data || []);
      } else if (activeTab === 'unidades') {
        const { data, error } = await supabase.from('unidades').select('*').order('bloco').order('numero');
        if (error) throw error;
        setUnidades(data || []);
      } else if (activeTab === 'operadores') {
        const { data, error } = await supabase.from('usuarios').select('*').order('nome');
        if (error) throw error;
        setOperadores(data || []);
      } else if (activeTab === 'autorizados') {
        const { data, error } = await supabase.from('terceiros_autorizados').select('*, unidades(numero, bloco)').order('created_at', { ascending: false });
        if (error) throw error;
        setTerceiros(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMorador = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNovo(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase.from('moradores').insert([{
        nome: novoNome,
        telefone: novoTelefone || null,
        whatsapp: novoTelefone || null, // Assuming the UI maps telefone to whatsapp for now
        telegram_id: novoTelegram || null,
        pin_vinculo_telegram: generateTelegramPin(),
        unidade_id: novaUnidadeId,
        status: 'ativo'
      }]).select().single();

      if (insertError) throw insertError;

      // Reset and refetch
      setNovoNome('');
      setNovoTelefone('');
      setNovoTelegram('');
      setNovaUnidadeId('');
      setShowNovoMorador(false);
      
      const moradorUnidade = unidades.find(u => u.id === novaUnidadeId);
      logAuditoria('CREATE', 'moradores', data.id, { 
        nome: novoNome, 
        unidade_info: `${moradorUnidade?.numero} ${moradorUnidade?.bloco || ''}`.trim()
      });
      
      fetchData();

    } catch(err: any) {
      setError(err.message || 'Erro ao criar morador');
    } finally {
      setLoadingNovo(false);
    }
  };

  const handleCreateUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNovo(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase.from('unidades').insert([{
        condominio_id: '11111111-1111-1111-1111-111111111111',
        numero: novoNumeroUnidade,
        bloco: novoBlocoUnidade || null,
        tipo: 'apto'
      }]).select().single();

      if (insertError) throw insertError;
      
      logAuditoria('CREATE', 'unidades', data.id, { 
        numero: novoNumeroUnidade, 
        bloco: novoBlocoUnidade 
      });
      
      setNovoNumeroUnidade('');
      setNovoBlocoUnidade('');
      setShowNovaUnidade(false);
      fetchData();
    } catch(err: any) {
      setError(err.message || 'Erro ao criar unidade');
    } finally {
      setLoadingNovo(false);
    }
  };

  const handleCreateOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNovo(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase.from('usuarios').insert([{
        condominio_id: '11111111-1111-1111-1111-111111111111',
        nome: novoNomeOp,
        perfil: novoPerfilOp,
        turno: novoTurnoOp
      }]).select().single();

      if (insertError) throw insertError;
      
      logAuditoria('CREATE', 'usuarios', data.id, { 
        nome: novoNomeOp, 
        perfil: novoPerfilOp, 
        turno: novoTurnoOp
      });
      
      setNovoNomeOp('');
      setShowNovoOperador(false);
      fetchData();
    } catch(err: any) {
      setError(err.message || 'Erro ao criar operador.');
    } finally {
      setLoadingNovo(false);
    }
  };

  const handleCreateTerceiro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNovo(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase.from('terceiros_autorizados').insert([{
        nome: novoNomeTerceiro,
        documento: novoDocTerceiro,
        tipo: novoTipoTerceiro,
        unidade_id: novaUnidadeTerceiro,
        status: 'ativo'
      }]).select().single();

      if (insertError) throw insertError;
      
      const popUnidade = unidades.find(u => u.id === novaUnidadeTerceiro);
      logAuditoria('CREATE', 'terceiros_autorizados', data.id, { 
        nome: novoNomeTerceiro, 
        tipo: novoTipoTerceiro, 
        unidade_info: `${popUnidade?.numero} ${popUnidade?.bloco || ''}`.trim() 
      });
      
      setNovoNomeTerceiro('');
      setNovoDocTerceiro('');
      setNovaUnidadeTerceiro('');
      setShowNovoTerceiro(false);
      fetchData();
    } catch(err: any) {
      setError(err.message || 'Erro ao criar Terceiro Autorizado');
    } finally {
      setLoadingNovo(false);
    }
  };

  const startEdit = (entity: any) => {
    setEditingId(entity.id);
    setEditData({ ...entity });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (id: string, table: string, nameRef: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${nameRef}?`)) return;
    
    setLoading(true);
    try {
       const { error: delError } = await supabase.from(table).delete().eq('id', id);
       if (delError) throw delError;
       
       logAuditoria('DELETE', table as any, id, { item_excluido: nameRef });
       fetchData();
    } catch (err: any) {
       setError(err.message || `Erro ao excluir de ${table}`);
       setLoading(false);
    }
  };

  const handleSaveEdit = async (table: string) => {
    if (!editingId) return;
    setLoading(true);
    setError(null);
    try {
      // Remove joined data before updating
      const payload = { ...editData };
      delete payload.unidades;
      
      const { error: updateError } = await supabase
        .from(table)
        .update(payload)
        .eq('id', editingId);

      if (updateError) throw updateError;
      
      logAuditoria('UPDATE', table as any, editingId, payload);
      
      setEditingId(null);
      setEditData({});
      fetchData();
    } catch (err: any) {
      setError(err.message || `Erro ao atualizar ${table}`);
      setLoading(false);
    }
  };

  const handleRegeneratePin = async (moradorId: string) => {
    setLoading(true);
    const newPin = generateTelegramPin();
    try {
      const { error: pinError } = await supabase
        .from('moradores')
        .update({ pin_vinculo_telegram: newPin })
        .eq('id', moradorId);
      
      if (pinError) throw pinError;
      
      logAuditoria('UPDATE', 'moradores', moradorId, { acao: 'Regenerou PIN Telegram' });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar novo PIN');
    } finally {
      setLoading(false);
    }
  };

  const getActiveTabState = () => {
    if (activeTab === 'moradores') return { show: showNovoMorador, setShow: setShowNovoMorador };
    if (activeTab === 'unidades') return { show: showNovaUnidade, setShow: setShowNovaUnidade };
    if (activeTab === 'operadores') return { show: showNovoOperador, setShow: setShowNovoOperador };
    return { show: false, setShow: () => {} };
  };

  const tabs = [
    { id: 'moradores', label: 'Moradores', icon: <Users size={18} /> },
    { id: 'unidades', label: 'Unidades / Blocos', icon: <Building size={18} /> },
    { id: 'operadores', label: 'Operadores (Portaria)', icon: <Shield size={18} /> },
    { id: 'autorizados', label: 'Terceiros Autorizados', icon: <FileText size={18} /> },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="text-gradient">Gestão e Cadastros</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Administração central do condomínio.</p>
        </div>
        
        {['moradores', 'unidades', 'operadores'].includes(activeTab) && (
          <button className="btn btn-primary" onClick={() => getActiveTabState().setShow(!getActiveTabState().show)}>
            <UserPlus size={18} /> {getActiveTabState().show ? 'Cancelar' : 'Novo Registro'}
          </button>
        )}
      </div>

      {/* Search and Tabs Container */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder={`Pesquisar em ${tabs.find(t => t.id === activeTab)?.label}...`} 
            className="input-base" 
            style={{ paddingLeft: '2.5rem' }} 
            value={globalSearch}
            onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--glass-border)',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: activeTab === tab.id ? 600 : 500,
                boxShadow: activeTab === tab.id ? '0 0 10px rgba(0, 240, 255, 0.1)' : 'none',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-center flex-col animate-fade-in" style={{ padding: '4rem', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" size={40} style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }} />
            <p>Carregando dados do Supabase...</p>
          </div>
        ) : (
          <>
            {activeTab === 'moradores' && (
              <div className="animate-fade-in">
                {showNovoMorador && (
                  <form onSubmit={handleCreateMorador} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Cadastrar Novo Morador</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <input type="text" className="input-base" placeholder="Nome Completo" value={novoNome} onChange={e => setNovoNome(e.target.value)} required />
                      <input type="text" className="input-base" placeholder="WhatsApp (Opcional)" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} />
                      <input type="text" className="input-base" placeholder="Telegram ID (Opcional)" value={novoTelegram} onChange={e => setNovoTelegram(e.target.value)} />
                      <select className="input-base" style={{ appearance: 'none' }} value={novaUnidadeId} onChange={e => setNovaUnidadeId(e.target.value)} required>
                        <option value="">Selecione a Unidade...</option>
                        {unidades.map(u => (
                           <option key={u.id} value={u.id}>{u.numero} {u.bloco ? `- Bloco ${u.bloco}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loadingNovo}>
                      {loadingNovo ? 'Salvando...' : 'Salvar Morador'}
                    </button>
                  </form>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--glass-light)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Nome</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Unidade</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>WhatsApp</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Telegram ID</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum morador encontrado.</td></tr>
                    ) : (
                      paginatedData.map(m => editingId === m.id ? (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.nome} onChange={e => setEditData({...editData, nome: e.target.value})} /></td>
                          <td style={{ padding: '1rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.unidade_id} onChange={e => setEditData({...editData, unidade_id: e.target.value})}>
                              {unidades.map(u => <option key={u.id} value={u.id}>{u.numero} {u.bloco || ''}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '1rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.whatsapp || editData.telefone || ''} onChange={e => setEditData({...editData, whatsapp: e.target.value, telefone: e.target.value})} /></td>
                          <td style={{ padding: '1rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.telegram_id || ''} onChange={e => setEditData({...editData, telegram_id: e.target.value})} /></td>
                          <td style={{ padding: '1rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                              <option value="ativo">ativo</option>
                              <option value="inativo">inativo</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn btn-primary" style={{ padding: '0.25rem' }} onClick={() => handleSaveEdit('moradores')}><Check size={16} /></button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={cancelEdit}><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>{m.nome}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{m.unidades?.numero} {m.unidades?.bloco ? `- Bloco ${m.unidades?.bloco}` : ''}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{m.telefone || '-'}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                            {m.telegram_id ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Vinculado ({m.telegram_id})</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Não vinculado</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 700 }}>PIN: {m.pin_vinculo_telegram || '---'}</span>
                                    <button 
                                      className="btn" 
                                      style={{ padding: '0.2rem', background: 'transparent', border: 'none', color: 'var(--text-muted)' }} 
                                      onClick={() => handleRegeneratePin(m.id)}
                                      title="Gerar novo PIN"
                                    >
                                      <Clock size={12} />
                                    </button>
                                    <button 
                                      className="btn" 
                                      style={{ padding: '0.2rem', background: 'transparent', border: 'none', color: 'var(--accent-primary)' }} 
                                      onClick={() => setQrCodeData({ nome: m.nome, pin: m.pin_vinculo_telegram || '' })}
                                      title="Ver QR Code de Vínculo"
                                    >
                                      <Shield size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ padding: '0.2rem 0.5rem', background: m.status === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)', color: m.status === 'ativo' ? 'var(--success)' : 'var(--text-secondary)', borderRadius: '4px', fontSize: '0.8rem' }}>
                              {m.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }} onClick={() => startEdit(m)}><Edit2 size={16} /></button>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }} onClick={() => handleDelete(m.id, 'moradores', m.nome)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )))
                    }
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'unidades' && (
              <div className="animate-fade-in">
                {showNovaUnidade && (
                  <form onSubmit={handleCreateUnidade} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Cadastrar Nova Unidade</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <input type="text" className="input-base" placeholder="Bloco (Ex: A, B, Único)" value={novoBlocoUnidade} onChange={e => setNovoBlocoUnidade(e.target.value)} />
                      <input type="text" className="input-base" placeholder="Número (Ex: 101)" value={novoNumeroUnidade} onChange={e => setNovoNumeroUnidade(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loadingNovo}>
                      {loadingNovo ? 'Salvando...' : 'Salvar Unidade'}
                    </button>
                  </form>
                )}
                {filteredData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Nenhuma unidade encontrada.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--glass-light)', borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Número</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Bloco/Torre</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Tipo</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map(u => editingId === u.id ? (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.numero} onChange={e => setEditData({...editData, numero: e.target.value})} /></td>
                          <td style={{ padding: '1rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.bloco || ''} onChange={e => setEditData({...editData, bloco: e.target.value})} /></td>
                          <td style={{ padding: '1rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.tipo} onChange={e => setEditData({...editData, tipo: e.target.value})}>
                              <option value="apto">Apartamento</option>
                              <option value="casa">Casa</option>
                              <option value="sala">Sala Comercial</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn btn-primary" style={{ padding: '0.25rem' }} onClick={() => handleSaveEdit('unidades')}><Check size={16} /></button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={cancelEdit}><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>{u.numero}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.bloco || '-'}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{u.tipo}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }} onClick={() => startEdit(u)}><Edit2 size={16} /></button>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }} onClick={() => handleDelete(u.id, 'unidades', `Unidade ${u.numero}`)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'operadores' && (
              <div className="animate-fade-in">
                 {showNovoOperador && (
                  <form onSubmit={handleCreateOperador} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Cadastrar Novo Operador/Funcionário</h3>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      O acesso administrativo é configurado por variáveis de ambiente. Este cadastro registra operadores no banco atual.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                      <input type="text" className="input-base" placeholder="Nome Completo" value={novoNomeOp} onChange={e => setNovoNomeOp(e.target.value)} required />
                      <select className="input-base" value={novoPerfilOp} onChange={e => setNovoPerfilOp(e.target.value)} required>
                        <option value="porteiro">Porteiro</option>
                        <option value="operador">Operador (Estoque/Triagem)</option>
                        <option value="admin">Administrador Geral</option>
                      </select>
                      <select className="input-base" style={{ appearance: 'none' }} value={novoTurnoOp} onChange={e => setNovoTurnoOp(e.target.value)} required>
                        <option value="Manhã">Manhã</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noite">Noite</option>
                        <option value="Madrugada">Madrugada</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loadingNovo}>
                      {loadingNovo ? 'Salvando...' : 'Salvar Operador'}
                    </button>
                  </form>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--glass-light)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Nome do Operador</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Perfil</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Turno</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Status</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum operador encontrado.</td></tr>
                    ) : (
                      paginatedData.map(op => editingId === op.id ? (
                        <tr key={op.id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem 1.5rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.nome} onChange={e => setEditData({...editData, nome: e.target.value})} /></td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.perfil} onChange={e => setEditData({...editData, perfil: e.target.value})}>
                              <option value="porteiro">Porteiro</option>
                              <option value="operador">Operador Base</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.turno || ''} onChange={e => setEditData({...editData, turno: e.target.value})}>
                              <option value="Manhã">Manhã</option>
                              <option value="Tarde">Tarde</option>
                              <option value="Noite">Noite</option>
                              <option value="Madrugada">Madrugada</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                              <option value="ativo">ativo</option>
                              <option value="inativo">inativo</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn btn-primary" style={{ padding: '0.25rem' }} onClick={() => handleSaveEdit('usuarios')}><Check size={16} /></button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={cancelEdit}><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={op.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="hover-glass">
                          <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{op.nome}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{op.perfil}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{op.turno || '-'}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600, background: op.status === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)', color: op.status === 'ativo' ? 'var(--success)' : 'var(--text-secondary)' }}>
                              {op.status || 'ativo'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }} onClick={() => startEdit(op)}><Edit2 size={16} /></button>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }} onClick={() => handleDelete(op.id, 'usuarios', op.nome)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )))
                    }
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'autorizados' && (
              <div className="animate-fade-in">
                 {showNovoTerceiro && (
                  <form onSubmit={handleCreateTerceiro} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Cadastrar Terceiro Autorizado</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <input type="text" className="input-base" placeholder="Nome Completo" value={novoNomeTerceiro} onChange={e => setNovoNomeTerceiro(e.target.value)} required />
                      <input type="text" className="input-base" placeholder="Documento (RG/CPF)" value={novoDocTerceiro} onChange={e => setNovoDocTerceiro(e.target.value)} required />
                      <select className="input-base" style={{ appearance: 'none' }} value={novoTipoTerceiro} onChange={e => setNovoTipoTerceiro(e.target.value)} required>
                        <option value="Visitante">Visitante</option>
                        <option value="Prestador de Serviço">Prestador de Serviço</option>
                        <option value="Familiar">Familiar</option>
                      </select>
                      <select className="input-base" style={{ appearance: 'none' }} value={novaUnidadeTerceiro} onChange={e => setNovaUnidadeTerceiro(e.target.value)} required>
                        <option value="">Vincular a uma Unidade</option>
                        {unidades.map(u => (
                          <option key={u.id} value={u.id}>Unidade {u.numero} {u.bloco ? `- Bloco ${u.bloco}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loadingNovo}>
                      {loadingNovo ? 'Salvando...' : 'Salvar Autorização'}
                    </button>
                  </form>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--glass-light)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Nome</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Tipo</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Documento</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Unidade</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>Status</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum terceiro autorizado encontrado.</td></tr>
                    ) : (
                      paginatedData.map(t => editingId === t.id ? (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem 1.5rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.nome} onChange={e => setEditData({...editData, nome: e.target.value})} /></td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.tipo} onChange={e => setEditData({...editData, tipo: e.target.value})}>
                              <option value="Visitante">Visitante</option>
                              <option value="Prestador de Serviço">Prestador de Serviço</option>
                              <option value="Familiar">Familiar</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}><input type="text" className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.documento || ''} onChange={e => setEditData({...editData, documento: e.target.value})} /></td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.unidade_id} onChange={e => setEditData({...editData, unidade_id: e.target.value})}>
                               {unidades.map(u => <option key={u.id} value={u.id}>{u.numero} {u.bloco || ''}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <select className="input-base" style={{ padding: '0.25rem 0.5rem' }} value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                              <option value="ativo">ativo</option>
                              <option value="inativo">inativo</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn btn-primary" style={{ padding: '0.25rem' }} onClick={() => handleSaveEdit('terceiros_autorizados')}><Check size={16} /></button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={cancelEdit}><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="hover-glass">
                          <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{t.nome}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{t.tipo}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{t.documento || '-'}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{t.unidades?.numero} {t.unidades?.bloco ? `- Bloco ${t.unidades?.bloco}` : ''}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600, background: t.status === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)', color: t.status === 'ativo' ? 'var(--success)' : 'var(--text-secondary)' }}>
                              {t.status || 'ativo'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }} onClick={() => startEdit(t)}><Edit2 size={16} /></button>
                              <button className="btn" style={{ padding: '0.25rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }} onClick={() => handleDelete(t.id, 'terceiros_autorizados', t.nome)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )))
                    }
                  </tbody>
                </table>
              </div>
            )}

            {activeTab !== 'moradores' && activeTab !== 'unidades' && activeTab !== 'operadores' && activeTab !== 'autorizados' && (
              <div className="flex-center flex-col animate-fade-in" style={{ padding: '4rem', color: 'var(--text-muted)' }}>
                <Building size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p>Módulo em desenvolvimento para o MVP.</p>
              </div>
            )}
          </>
        )}

        {/* Pagination Footer (existing check) */}
        {totalPages > 1 && (
          <div style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '1rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--glass-border)'
          }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}
            >
              <ChevronLeft size={20} />
            </button>
            
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Página <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{currentPage}</span> de {totalPages}
            </div>
            
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* QR Code Modal for Telegram */}
      {qrCodeData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>Vincular Telegram</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Peça para <strong>{qrCodeData.nome}</strong> escanear o código abaixo com a câmera do celular para abrir o Bot do Telegram automaticamente.
            </p>
            
            <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://t.me/${BOT_USERNAME}?start=${qrCodeData.pin}`} 
                alt="QR Code Telegram" 
                style={{ display: 'block' }}
              />
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Caso o QR Code não funcione:</span>
              <code style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{qrCodeData.pin}</code>
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Fale com o bot <strong>@{BOT_USERNAME}</strong> e digite o código acima.</p>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setQrCodeData(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cadastros;
