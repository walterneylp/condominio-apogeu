import { supabase } from './supabase';

export type LogAcao = 'CREATE' | 'UPDATE' | 'DELETE';
export type LogEntidade = 'moradores' | 'unidades' | 'usuarios' | 'terceiros_autorizados' | 'entregas';

export const logAuditoria = async (
  acao: LogAcao,
  entidade: LogEntidade,
  entidade_id: string,
  detalhes: any = null
) => {
  try {
    const { error } = await supabase.from('logs_auditoria').insert([{
      acao,
      entidade,
      entidade_id,
      detalhes,
      criado_por: localStorage.getItem('pdm_auth_user') || 'Sistema/Local'
    }]);

    if (error) {
      console.error("Erro ao registrar log de auditoria:", error);
    }
  } catch (err) {
    console.error("Exceção ao registrar log:", err);
  }
};
