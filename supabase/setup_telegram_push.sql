-- SQL para Configuração do Telegram e Notificações Push
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Adicionar coluna de PIN se ainda não existir
do $$ 
begin 
  if not exists (select from information_schema.columns where table_name='moradores' and column_name='pin_vinculo_telegram') then
    alter table public.moradores add column pin_vinculo_telegram text;
  end if;
end $$;

-- 2. Criar função para notificar via Edge Function
-- Substitua 'SUA_URL_DO_SUPABASE' pela URL do seu projeto (Ex: https://xyz.supabase.co)
-- O trigger enviará um POST para a Edge Function 'telegram-bot'
create or replace function public.notify_telegram_on_delivery()
returns trigger as $$
declare
  morador_record record;
begin
  -- Notificar todos os moradores ativos da unidade que possuem Telegram vinculado
  for morador_record in 
    select telegram_id, nome 
    from public.moradores 
    where (unidade_id = new.unidade_id or id = new.morador_id)
      and telegram_id is not null 
      and status = 'ativo'
  loop
    perform
      net.http_post(
        url := 'https://[SEU_SUBDOMINIO_DO_SUPABASE].functions.supabase.co/telegram-bot',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer [SUA_SERVICE_ROLE_KEY]'
        ),
        body := jsonb_build_object(
          'type', 'notification',
          'chatId', morador_record.telegram_id,
          'message', format('📦 Olá %s! Uma nova encomenda (%s) acabou de chegar na portaria para a sua unidade.', morador_record.nome, new.tipo_entrega)
        )
      );
  end loop;
  
  return new;
end;
$$ language plpgsql security definer;

-- 3. Criar o Trigger
drop trigger if exists on_delivery_created on public.entregas;
create trigger on_delivery_created
  after insert on public.entregas
  for each row execute function public.notify_telegram_on_delivery();

-- NOTA: O Supabase exige a extensão 'pg_net' habilitada para usar net.http_post
-- Você pode habilitá-la no painel: Database -> Extensions -> Procure por "pg_net" e ative.
