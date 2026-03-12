PRD – Sistema de Gestão de Entregas para Condomínios
1. Visão do Produto
Nome provisório

Portaria Delivery Manager (PDM)

Descrição

Sistema digital para controle de recebimento, armazenamento, notificação e entrega de encomendas em condomínios, permitindo rastreabilidade completa desde a chegada até a retirada pelo morador.

O sistema será projetado para operar em:

Modo SaaS (nuvem)

Modo local (servidor interno do condomínio)

Com possibilidade de integração com:

WhatsApp

Telegram

Email

aplicativos de condomínio

sistemas de portaria remota.

2. Problema que o sistema resolve

Condomínios recebem grande volume de entregas diariamente.

Problemas comuns:

perda de encomendas

erro de identificação do destinatário

ausência de registro de retirada

conflitos entre moradores e portaria

ausência de prova de entrega

controle manual em papel ou planilhas

dificuldade em auditar ocorrências

3. Objetivos do Produto
Objetivos principais

Registrar todas as entregas recebidas na portaria

Notificar o morador automaticamente

Controlar retirada ou entrega interna

Gerar prova de entrega

Criar histórico auditável

Reduzir conflitos e extravios

4. Público-alvo
Usuários primários

porteiros

zeladores

administradores

síndicos

Usuários secundários

moradores

entregadores internos

empresas de portaria remota

Clientes SaaS

administradoras de condomínios

condomínios residenciais

condomínios comerciais

portarias remotas

5. Modos de implantação
5.1 SaaS (Cloud)

Arquitetura multi-tenant.

Características:

acesso web

atualização automática

integração nativa com APIs externas

escalável

Indicado para:

administradoras

condomínios médios e grandes

5.2 On-Premise (Local)

Sistema rodando em:

mini servidor local

Raspberry Pi

NUC

servidor Linux

VM interna

Características:

banco local

funcionamento mesmo sem internet

sincronização opcional com nuvem

Indicado para:

condomínios com portaria offline

ambientes de segurança restrita

portarias remotas

6. Escopo do Produto (MVP)

O MVP deve conter:

cadastro de condomínio

cadastro de unidades

cadastro de moradores

cadastro de usuários da portaria

registro de recebimento de encomendas

registro de retirada

envio de notificação

fotos da encomenda

histórico

relatórios básicos

7. Módulos do Sistema
7.1 Gestão do Condomínio

Permite cadastrar:

torres

blocos

unidades

vagas

áreas comuns

Campos

Condomínio:

id

nome

CNPJ

endereço

cidade

estado

CEP

telefone

email

logo

7.2 Cadastro de Unidades

Campos:

id_unidade

bloco

torre

andar

número

tipo (casa/apto/sala)

observação

7.3 Cadastro de Moradores

Campos:

id

nome

CPF (opcional)

telefone

email

WhatsApp

Telegram ID

unidade

status

preferências de notificação

7.4 Cadastro de Usuários da Portaria

Campos:

id

nome

login

senha

perfil

turno

status

Perfis:

admin condomínio

porteiro

operador

síndico

morador

8. Gestão de Entregas
8.1 Registro de recebimento

Campos obrigatórios:

código da entrega

data/hora

recebido por

tipo de entrega

quantidade de volumes

unidade destino

morador

origem da entrega

Campos opcionais:

transportadora

nome do entregador

documento do entregador

observação

8.2 Fotos da entrega

Permitir:

até 5 fotos

compressão automática

armazenamento seguro

8.3 Tipos de entrega

delivery comida

supermercado

e-commerce

documento

correspondência

medicamento

item perecível

outro

9. Fluxo de Operação
9.1 Recebimento

Fluxo:

entregador chega
porteiro registra entrega
sistema gera protocolo
morador é notificado
9.2 Notificação

Canais possíveis:

WhatsApp

Telegram

Email

Push

Mensagem exemplo:

"Olá João. Uma encomenda foi recebida na portaria para você às 10:15. Protocolo ENT-00245."

9.3 Retirada

O sistema registra:

quem retirou

documento

relação com morador

data/hora

operador da portaria

Opcional:

assinatura digital

foto do recebedor

9.4 Entrega interna

Caso o condomínio entregue na unidade:

registro de:

saiu para entrega

entregue na unidade

tentativa de entrega

10. Status da Encomenda

recebido

notificado

aguardando retirada

saiu para entrega

entregue

retirado

devolvido

cancelado

11. Sistema de Notificações
Telegram

Bot oficial.

Funções:

avisar chegada

consulta de encomendas

confirmação de retirada

WhatsApp

Via API:

aviso de chegada

envio de protocolo

lembrete de retirada

Email

Fallback caso WhatsApp falhe.

12. Painel da Portaria

Dashboard mostra:

entregas recebidas hoje

pendentes

retiradas

atrasadas

perecíveis

13. Painel do Morador

Morador pode:

ver encomendas

histórico

autorizar terceiros

configurar notificações

14. Autorização de Terceiros

Morador pode autorizar:

familiar

funcionário

motorista

prestador

Sistema registra:

nome

documento

validade da autorização

15. Relatórios
Operacionais

entregas por período

entregas por bloco

tempo médio de retirada

Segurança

histórico por morador

entregas não retiradas

ocorrências

Auditoria

ações por operador

alterações no sistema

16. Requisitos Não Funcionais
Segurança

criptografia TLS

hash de senha

controle de acesso

logs de auditoria

LGPD

Performance

tempo de registro < 2 segundos

suporte a múltiplos operadores

Disponibilidade

SaaS:

99.5% uptime

Local:

funcionamento offline

17. Arquitetura Técnica
Backend

API REST.

Tecnologias possíveis:

Python (FastAPI)

Node.js

Go

Frontend

Web App:

React

Vue

Banco de Dados

SaaS:

PostgreSQL

Local:

PostgreSQL

SQLite (modo simplificado)

Storage

fotos de entregas

anexos

18. Arquitetura SaaS
Frontend
   |
API Gateway
   |
Backend Services
   |
Database Multi-tenant
   |
Notification Services
   |
Integrations
19. Arquitetura Local
Tablet Portaria
      |
Servidor Local
      |
Banco Local
      |
Integração Internet (opcional)
20. Sincronização Local ↔ Cloud

Modo híbrido opcional.

Fluxo:

servidor local
      |
fila de sincronização
      |
nuvem SaaS

Caso internet caia:

sistema continua funcionando.

21. APIs Principais
Cadastro
POST /condominios
POST /unidades
POST /moradores
Entregas
POST /entregas
GET /entregas
POST /entregas/{id}/retirada
POST /entregas/{id}/entrega
Notificações
POST /notificar/telegram
POST /notificar/whatsapp
22. Modelo de Dados Simplificado

Tabelas principais:

tenants

condominios

unidades

moradores

usuarios

entregas

fotos_entrega

notificacoes

retiradas

autorizacoes

logs

23. Segurança e LGPD

Dados pessoais:

nome

telefone

documento

Políticas:

retenção configurável

anonimização opcional

logs de acesso

24. Diferenciais do Produto

registro com fotos

QR code para retirada

PIN de segurança

autorização de terceiros

notificações automáticas

histórico auditável

funcionamento offline

25. Roadmap
Versão 1

controle básico de entregas

notificações

fotos

histórico

Versão 2

app do morador

QR code

BI

Versão 3

integração portaria remota

reconhecimento de encomendas por IA

26. Métricas de Sucesso

tempo médio de registro

redução de extravios

tempo médio de retirada

número de notificações entregues

27. Critérios de Aceitação

O sistema será considerado funcional quando:

porteiro consegue registrar entrega em menos de 30 segundos

morador recebe notificação automática

retirada fica registrada com prova

histórico pode ser auditado

28. Futuras Expansões

controle de visitantes

reservas de áreas comuns

controle de prestadores

integração com câmeras

reconhecimento automático de pacotes

integração com sistemas de acesso
