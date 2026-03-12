import { supabase } from './supabase';

export type LogAcao = 'CREATE' | 'UPDATE' | 'DELETE';
export type LogEntidade = 'moradores' | 'unidades' | 'usuarios' | 'terceiros_autorizados' | 'entregas';

export const logAuditoria = async (
  acao: LogAcao,
  entidade: LogEntidade,
  entidade_id: string,
  detalhes: unknown = null
) => {
  try {
    const storedUser = localStorage.getItem('pdm_user');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    const criadoPor = parsedUser?.nome || localStorage.getItem('pdm_auth_user') || 'Sistema/Local';

    const { error } = await supabase.from('logs_auditoria').insert([{
      acao,
      entidade,
      entidade_id,
      detalhes,
      criado_por: criadoPor
    }]);

    if (error) {
      console.error("Erro ao registrar log de auditoria:", error);
    }
  } catch (err) {
    console.error("Exceção ao registrar log:", err);
  }
};
