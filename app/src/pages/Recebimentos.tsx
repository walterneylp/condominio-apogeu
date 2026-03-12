import { useState, useEffect, useRef } from 'react';
import { Camera, Save, ArrowLeft, PackagePlus, AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SearchableSelect } from '../components/SearchableSelect';
import { telegramService } from '../lib/telegram';

type Unidade = { id: string, numero: string, bloco?: string };

export const Recebimentos = () => {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [condominioId, setCondominioId] = useState<string | null>(null);
  
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [moradoresUnidade, setMoradoresUnidade] = useState<any[]>([]);
  const [codigoEntrega, setCodigoEntrega] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [moradorId, setMoradorId] = useState('');
  const [operadorId, setOperadorId] = useState('');
  const [transportadora, setTransportadora] = useState('');
  
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [unidadesRes, operadoresRes, condRes] = await Promise.all([
        supabase.from('unidades').select('id, numero, bloco').order('bloco').order('numero'),
        supabase.from('usuarios').select('id, nome').order('nome'),
        supabase.from('condominios').select('id').limit(1).single()
      ]);
      
      if (unidadesRes.error) throw unidadesRes.error;
      if (operadoresRes.error) throw operadoresRes.error;
      
      setUnidades(unidadesRes.data || []);
      setOperadores(operadoresRes.data || []);
      
      if (condRes.data) {
        setCondominioId(condRes.data.id);
      } else {
        console.warn('Nenhum condomínio encontrado no banco de dados.');
      }
      
      if (operadoresRes.data && operadoresRes.data.length > 0) {
        setOperadorId(operadoresRes.data[0].id);
      }
    } catch (err) {
      console.error("Erro ao buscar dados", err);
    }
  };

  useEffect(() => {
    const fetchMoradores = async () => {
      if (!unidadeId) {
        setMoradoresUnidade([]);
        setMoradorId('');
        return;
      }
      const { data } = await supabase
        .from('moradores')
        .select('id, nome, telegram_id, whatsapp')
        .eq('unidade_id', unidadeId)
        .eq('status', 'ativo');
      setMoradoresUnidade(data || []);
      // If there's only one, auto-select it
      if (data?.length === 1) {
        setMoradorId(data[0].id);
      } else {
        setMoradorId('');
      }
    };
    fetchMoradores();
  }, [unidadeId]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFotoFile(file);
      setFotoUrl(URL.createObjectURL(file));
    }
  };

  const removerFoto = () => {
    setFotoFile(null);
    setFotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFoto = async (entregaId: string) => {
    if (!fotoFile) return;
    
    const fileExt = fotoFile.name.split('.').pop();
    const fileName = `${entregaId}-${Math.random()}.${fileExt}`;
    const filePath = `entregas/${fileName}`;

    // Upload to Supabase Storage (Assumes a bucket named 'pacotes' exists and is public)
    const { error: uploadError } = await supabase.storage
      .from('pacotes')
      .upload(filePath, fotoFile);

    if (uploadError) {
      console.error("Erro ao fazer upload da foto:", uploadError);
      return; // Fail silently for the photo, keep the package
    }

    const { data: publicUrlData } = supabase.storage
      .from('pacotes')
      .getPublicUrl(filePath);

    if (publicUrlData) {
       await supabase.from('fotos_entrega').insert([{
         entrega_id: entregaId,
         foto_url: publicUrlData.publicUrl
       }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!operadorId) {
      setError("Nenhum operador selecionado. Cadastre um operador primeiro na aba de Cadastros.");
      setLoading(false);
      return;
    }
    
    try {
      if (!condominioId) {
        throw new Error("Nenhum condomínio cadastrado no sistema. Cadastre um condomínio primeiro.");
      }

      // Create new entrega
      const { data: newEntrega, error: insertError } = await supabase.from('entregas').insert([{
         condominio_id: condominioId,
         recebido_por: operadorId, 
         codigo_entrega: codigoEntrega,
         tipo_entrega: tipoEntrega,
         unidade_id: unidadeId,
         morador_id: moradorId || null,
         transportadora: transportadora || null,
      }]).select('*').single();

      if (insertError) {
         console.error("Erro de inserção:", JSON.stringify(insertError));
         throw new Error(`Banco: ${insertError.message || insertError.code || 'Erro desconhecido'}`);
      }

      // Upload image if present and link to the delivery
      if (newEntrega && fotoFile) {
         await uploadFoto(newEntrega.id);
      }
      
      // Send Telegram notifications directly
      const targets = moradorId 
        ? moradoresUnidade.filter(m => m.id === moradorId)
        : moradoresUnidade;

      let notificationMsg = "Encomenda registrada.";

      if (targets.length === 0) {
        notificationMsg = "Encomenda registrada (nenhum morador ativo nesta unidade).";
      } else {
        const withTelegram = targets.filter(m => m.telegram_id);
        const withoutTelegram = targets.filter(m => !m.telegram_id);

        if (withTelegram.length > 0) {
          // Send real Telegram messages
          const operadorNome = operadores.find(op => op.id === operadorId)?.nome;
          const unidadeLabel = unidades.find(u => u.id === unidadeId);
          const unidadeStr = unidadeLabel ? `${unidadeLabel.numero}${unidadeLabel.bloco ? ` - Bloco ${unidadeLabel.bloco}` : ''}` : undefined;

          const notificados = await telegramService.notifyDelivery(withTelegram, {
            tipoEntrega,
            codigoEntrega,
            transportadora: transportadora || undefined,
            unidade: unidadeStr,
            operadorNome,
          });

          if (notificados.length > 0) {
            notificationMsg = `✅ Telegram enviado para: ${notificados.join(', ')}`;
          } else {
            notificationMsg = `⚠️ Erro ao enviar Telegram. Verificar vinculação.`;
          }
        }
        
        if (withoutTelegram.length > 0) {
          const semTelegram = withoutTelegram.map(m => m.nome).join(', ');
          notificationMsg += `${withTelegram.length > 0 ? ' | ' : ''}Sem Telegram: ${semTelegram} (use PIN em Cadastros)`;
        }
      }

      setSucesso(true);
      setCodigoEntrega('');
      setTipoEntrega('');
      setUnidadeId('');
      setTransportadora('');
      removerFoto();

      // Simulated notification toast
      const notificationEvent = new CustomEvent('pdm-notification', { 
        detail: { type: 'success', message: notificationMsg } 
      });
      window.dispatchEvent(notificationEvent);

      setTimeout(() => setSucesso(false), 5000);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao salvar a encomenda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <Link to="/" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> Voltar ao Painel
          </Link>
          <h1 className="text-gradient">Registrar Recebimento</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Cadastre uma nova encomenda e notifique o morador.</p>
        </div>
      </div>

      <div className="glass-card">
        {sucesso ? (
          <div className="flex-center flex-col animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>
              <PackagePlus size={64} />
            </div>
            <h2>Encomenda Registrada!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>A encomenda foi processada e as devidas notificações foram enviadas.</p>
            <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => setSucesso(false)}>
              Registrar Nova Encomenda
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid">
            {error && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} />
                {error}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Código da Entrega (Rastreio)</label>
                <input type="text" className="input-base" placeholder="Ex: BR123456789" required value={codigoEntrega} onChange={e => setCodigoEntrega(e.target.value)} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tipo de Entrega</label>
                <select className="input-base" style={{ appearance: 'none' }} required value={tipoEntrega} onChange={e => setTipoEntrega(e.target.value)}>
                  <option value="">Selecione o tipo...</option>
                  <option value="ecommerce">E-commerce / Pacote</option>
                  <option value="comida">Delivery (Comida)</option>
                  <option value="documento">Documento / Carta</option>
                  <option value="supermercado">Supermercado</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Recebido Por (Operador)</label>
                <SearchableSelect 
                  options={operadores.map(op => ({ value: op.id, label: op.nome }))}
                  value={operadorId}
                  onChange={setOperadorId}
                  placeholder="Selecione quem recebeu..."
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Unidade / Bloco</label>
                <SearchableSelect 
                  options={unidades.map(u => ({ value: u.id, label: `${u.numero} ${u.bloco ? `- Bloco ${u.bloco}` : ''}`.trim() }))}
                  value={unidadeId}
                  onChange={setUnidadeId}
                  placeholder="Selecione a unidade destino..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Notificar Morador(es)</label>
                <select 
                  className="input-base" 
                  value={moradorId} 
                  onChange={e => setMoradorId(e.target.value)}
                  disabled={!unidadeId || moradoresUnidade.length === 0}
                >
                  <option value="">👥 Todos da Unidade ({moradoresUnidade.length} morador(es))</option>
                  {moradoresUnidade.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} {m.telegram_id ? '✅ Telegram' : '⚠️ sem Telegram'}
                    </option>
                  ))}
                </select>
                {unidadeId && moradoresUnidade.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    {moradorId
                      ? `Notificará apenas: ${moradoresUnidade.find(m => m.id === moradorId)?.nome}`
                      : `Notificará todos os ${moradoresUnidade.length} morador(es) da unidade com Telegram vinculado`
                    }
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Transportadora (Opcional)</label>
                <input type="text" className="input-base" placeholder="Ex: Correios, Loggi" value={transportadora} onChange={e => setTransportadora(e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Foto da Encomenda (Opcional)</label>
              
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFotoChange}
              />

              {fotoUrl ? (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)', display: 'inline-block' }}>
                  <img src={fotoUrl} alt="Preview da Encomenda" style={{ maxWidth: '100%', maxHeight: '200px', display: 'block' }} />
                  <button 
                    type="button" 
                    onClick={removerFoto}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', padding: '0.25rem', borderRadius: '50%', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div 
                  className="flex-center" 
                  style={{ 
                    border: '2px dashed var(--glass-border)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '2rem',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'border-color var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={32} color="var(--text-muted)" />
                  <span style={{ color: 'var(--text-secondary)' }}>Clique para tirar ou fazer upload da foto</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Salvando...' : 'Registrar Encomenda'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
