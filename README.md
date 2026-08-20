# NAPED — Registro de Atividades

Aplicação web minimalista para registro, acompanhamento e geração de relatórios das atividades do Núcleo de Apoio Pedagógico e Experiência Docente (NAPED).

## Arquitetura

- Next.js
- PostgreSQL gerenciado (Neon recomendado)
- Deploy: Vercel
- Relatórios: PDF e DOCX
- Sem login: seleção de perfil local após cadastro breve

## Funcionalidades

- Cadastro simples de usuários do NAPED
- Memorização do último usuário no navegador
- Registro estruturado de atividades
- Categorias aderentes às DCN de Medicina 2025 e ao Caderno de Orientações da ABEM
- Histórico de atendimentos
- Indicadores básicos: quantidade, horas e áreas alcançadas
- Geração de relatório institucional em PDF e DOCX
- Layout responsivo em azul, amarelo e branco

## Banco de dados

Defina a variável de ambiente `DATABASE_URL` com uma conexão PostgreSQL. As tabelas e o índice necessários são criados automaticamente no primeiro acesso às APIs.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy na Vercel

1. Importe o repositório `rodrigoniskier/naped` na Vercel.
2. Configure `DATABASE_URL` em Project Settings → Environment Variables.
3. Faça o deploy.

A aplicação usa rotas server-side para manter a string de conexão fora do navegador.
