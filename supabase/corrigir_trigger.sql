-- ===========================================================================
-- CORREÇÃO URGENTE: O trigger anterior estava bloqueando o cadastro de
-- encomendas porque o libcurl no Supabase self-hosted não suporta HTTPS.
-- 
-- Execute este script no SQL Editor do seu Supabase para corrigir.
-- ===========================================================================

-- 1. Remover o trigger problemático
DROP TRIGGER IF EXISTS on_delivery_created ON public.entregas;

-- 2. Substituir a função para usar EXCEPTION e não bloquear o INSERT
CREATE OR REPLACE FUNCTION public.notify_telegram_on_delivery()
RETURNS trigger AS $$
DECLARE
  morador_record record;
BEGIN
  -- Tentar notificar via HTTP (opcional - não bloqueia se falhar)
  BEGIN
    FOR morador_record IN 
      SELECT telegram_id, nome 
      FROM public.moradores 
      WHERE (unidade_id = new.unidade_id OR id = new.morador_id)
        AND telegram_id IS NOT NULL 
        AND status = 'ativo'
    LOOP
      PERFORM
        net.http_post(
          url := '[SEU_SUBDOMINIO].functions.supabase.co/telegram-bot',
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := jsonb_build_object(
            'type', 'notification',
            'chatId', morador_record.telegram_id,
            'message', format('📦 Olá %s! Chegou uma encomenda (%s) na portaria.', morador_record.nome, new.tipo_entrega)
          )
        );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- Apenas logar o erro, não bloquear o INSERT
    RAISE WARNING 'Falha na notificação Telegram (não crítico): %', SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar o trigger
CREATE TRIGGER on_delivery_created
  AFTER INSERT ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_on_delivery();

-- NOTA: As notificações também são enviadas diretamente pelo frontend React
-- (arquivo telegram.ts), então mesmo sem o trigger funcionando, as 
-- notificações serão enviadas quando o sistema estiver aberto na portaria.
