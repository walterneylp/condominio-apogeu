-- 1. Inserir um Condomínio de Teste
INSERT INTO public.condominios (id, nome, cnpj, endereco, cidade, estado, cep)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Condomínio Vista Linda',
  '12.345.678/0001-90',
  'Rua das Palmeiras, 100',
  'São Paulo',
  'SP',
  '01000-000'
) ON CONFLICT (id) DO NOTHING;

-- 2. Inserir um Operador (Porteiro) - associado a um auth.id genérico se RLS for relaxado
-- Nota: em produção este ID deve existir em auth.users
INSERT INTO public.usuarios (id, condominio_id, nome, perfil, turno)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  '11111111-1111-1111-1111-111111111111', 
  'Carlos Silva', 
  'porteiro', 
  'Manhã'
) ON CONFLICT (id) DO NOTHING;

-- 3. Inserir Unidades
INSERT INTO public.unidades (id, condominio_id, bloco, numero, tipo)
VALUES 
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'A', '101', 'apto'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'A', '102', 'apto'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'B', '201', 'apto')
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Moradores
INSERT INTO public.moradores (id, unidade_id, nome, telefone)
VALUES
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'João Figueiredo', '11999999999'),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Maria Souza', '11988888888'),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Pedro Cardoso', '11977777777')
ON CONFLICT (id) DO NOTHING;

-- 5. Inserir algums pacotes (Entregas)
INSERT INTO public.entregas (id, condominio_id, codigo_entrega, recebido_por, tipo_entrega, unidade_id, morador_id, status)
VALUES
  (
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111',
    'BR987654321',
    '00000000-0000-0000-0000-000000000000',
    'ecommerce',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    'recebido'
  )
ON CONFLICT (id) DO NOTHING;
