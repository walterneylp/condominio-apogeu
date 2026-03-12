-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Condominios
create table public.condominios (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  cnpj text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Unidades
create table public.unidades (
  id uuid default uuid_generate_v4() primary key,
  condominio_id uuid references public.condominios(id) not null,
  bloco text,
  torre text,
  andar text,
  numero text not null,
  tipo text, -- casa/apto/sala
  observacao text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Moradores
create table public.moradores (
  id uuid default uuid_generate_v4() primary key,
  unidade_id uuid references public.unidades(id) not null,
  nome text not null,
  cpf text,
  telefone text,
  email text,
  whatsapp text,
  telegram_id text,
  pin_vinculo_telegram text,
  status text default 'ativo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Usuarios (Portaria) - Modified for MVP to not require auth.users
create table public.usuarios (
  id uuid default uuid_generate_v4() primary key,
  condominio_id uuid references public.condominios(id),
  nome text not null,
  perfil text not null, -- admin, porteiro, operador, sindico
  turno text,
  status text default 'ativo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Entregas
create table public.entregas (
  id uuid default uuid_generate_v4() primary key,
  condominio_id uuid references public.condominios(id) not null,
  codigo_entrega text not null,
  recebido_por uuid references public.usuarios(id) not null,
  tipo_entrega text not null,
  quantidade_volumes integer default 1,
  unidade_id uuid references public.unidades(id) not null,
  morador_id uuid references public.moradores(id),
  origem_entrega text,
  transportadora text,
  nome_entregador text,
  documento_entregador text,
  observacao text,
  status text default 'recebido', -- recebido, notificado, aguardando retirada, entregue, devolvido
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Fotos Entrega
create table public.fotos_entrega (
  id uuid default uuid_generate_v4() primary key,
  entrega_id uuid references public.entregas(id) not null,
  foto_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Retiradas
create table public.retiradas (
  id uuid default uuid_generate_v4() primary key,
  entrega_id uuid references public.entregas(id) not null,
  retirado_por_nome text not null,
  documento text,
  relacao_morador text,
  operador_id uuid references public.usuarios(id) not null,
  assinatura_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Auditing Logs
create table public.logs_auditoria (
  id uuid default uuid_generate_v4() primary key,
  acao text not null, -- CREATE, UPDATE, DELETE
  entidade text not null, -- moradores, unidades, usuarios, terceiros_autorizados
  entidade_id uuid,
  detalhes jsonb,
  criado_por text default 'Sistema/Local',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Terceiros Autorizados
create table public.terceiros_autorizados (
  id uuid default uuid_generate_v4() primary key,
  unidade_id uuid references public.unidades(id) not null,
  nome text not null,
  documento text, -- RG/CPF
  tipo text not null, -- Visitante, Prestador de Serviço
  data_inicio date,
  data_fim date,
  status text default 'ativo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) - Basic setup
alter table public.condominios enable row level security;
alter table public.unidades enable row level security;
alter table public.moradores enable row level security;
alter table public.usuarios enable row level security;
alter table public.entregas enable row level security;
alter table public.fotos_entrega enable row level security;
alter table public.retiradas enable row level security;
alter table public.logs_auditoria enable row level security;
alter table public.terceiros_autorizados enable row level security;

-- Policies (allow read/write for MVP local testing since auth is via localStorage)
drop policy if exists "Allow full access for authenticated users" on public.condominios;
drop policy if exists "Allow full access for authenticated users" on public.unidades;
drop policy if exists "Allow full access for authenticated users" on public.moradores;
drop policy if exists "Allow full access for authenticated users" on public.usuarios;
drop policy if exists "Allow full access for authenticated users" on public.entregas;
drop policy if exists "Allow full access for authenticated users" on public.fotos_entrega;
drop policy if exists "Allow full access for authenticated users" on public.retiradas;
drop policy if exists "Allow full access for authenticated users" on public.logs_auditoria;
drop policy if exists "Allow full access for authenticated users" on public.terceiros_autorizados;

create policy "Allow full access for all users" on public.condominios for all using (true) with check (true);
create policy "Allow full access for all users" on public.unidades for all using (true) with check (true);
create policy "Allow full access for all users" on public.moradores for all using (true) with check (true);
create policy "Allow full access for all users" on public.usuarios for all using (true) with check (true);
create policy "Allow full access for all users" on public.entregas for all using (true) with check (true);
create policy "Allow full access for all users" on public.fotos_entrega for all using (true) with check (true);
create policy "Allow full access for all users" on public.retiradas for all using (true) with check (true);
create policy "Allow full access for all users" on public.logs_auditoria for all using (true) with check (true);
create policy "Allow full access for all users" on public.terceiros_autorizados for all using (true) with check (true);
