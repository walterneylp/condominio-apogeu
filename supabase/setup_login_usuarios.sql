ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS login text UNIQUE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS senha text;

-- Cria o usuário admin se não existir.
-- Pega o primeiro condominio_id disponivel para associar.
DO $$
DECLARE
    cond_id uuid;
BEGIN
    SELECT id INTO cond_id FROM public.condominios LIMIT 1;

    IF cond_id IS NOT NULL THEN
        INSERT INTO public.usuarios (id, condominio_id, nome, perfil, login, senha)
        VALUES (
            uuid_generate_v4(),
            cond_id,
            'Administrador',
            'admin',
            'admin',
            '1234'
        )
        ON CONFLICT (login) DO UPDATE SET senha = '1234';
    ELSE
        INSERT INTO public.usuarios (id, nome, perfil, login, senha)
        VALUES (
            uuid_generate_v4(),
            'Administrador Geral',
            'admin',
            'admin',
            '1234'
        )
        ON CONFLICT (login) DO UPDATE SET senha = '1234';
    END IF;
END $$;
