# GitHub PII Scanner

Ferramenta web para análise estática de repositórios GitHub em busca de exposição de dados pessoais (PII) e credenciais sensíveis no código-fonte. Combina detecção por padrões (regex + heurísticas) com análise semântica por LLM para classificar vulnerabilidades e gerar recomendações objetivas.

---

> ### 🌐 Demo em produção
> Acesse o projeto **GitHub PII Scanner** em produção:
>
> **[https://git-hub-pii-scanner.vercel.app/](https://git-hub-pii-scanner.vercel.app/)**

---

## Como funciona

O fluxo de análise percorre três etapas sequenciais:

```
URL do repositório
       │
       ▼
1. Coleta de arquivos (GitHub API)
       │  Filtra por extensão, limita a 50 arquivos
       ▼
2. Detecção de padrões (regex + heurísticas)
       │  Produz lista de PIIMatch por arquivo
       ▼
3. Análise semântica (Groq · Llama 3.3 70B)
       │  Classifica severidade, gera descrição e recomendação
       ▼
Relatório com vulnerabilidades rankeadas
```

### Etapa 1 — Coleta de arquivos

`lib/github.ts` usa `@octokit/rest` para:

1. Resolver o branch padrão via `repos.get`
2. Obter o SHA da árvore via `repos.getBranch` → `commit.commit.tree.sha`
3. Listar recursivamente todos os blobs via `git.getTree({ recursive: "1" })`
4. Filtrar arquivos por extensão analisável (`isAnalyzable`)
5. Baixar o conteúdo de cada arquivo via `repos.getContent` (base64 → UTF-8)

### Etapa 2 — Detecção de padrões

`lib/pii-patterns.ts` varre cada linha do arquivo com dois mecanismos:

**Regex estrutural** — detecta padrões com forma definida:

| Tipo | Exemplo detectado |
|---|---|
| `cpf` | `123.456.789-09` |
| `email` | `usuario@dominio.com` |
| `phone` | `(11) 99999-8888` |
| `credit_card` | `4111 1111 1111 1111` |
| `password` | `senha = "segredo123"` |
| `token` | `api_key = "Abcd1234..."` |
| `address` | `Rua das Flores, 123` |

**Heurística de nomes de campo** — identifica campos com nomes sensíveis em qualquer contexto (SQL, JSON, YAML, código):
`cpf`, `cnpj`, `rg`, `senha`, `secret`, `token`, `api_key`, `credit_card`, `birth_date`, `ssn`, `passport`, entre outros.

### Etapa 3 — Análise semântica

`lib/groq.ts` envia os trechos suspeitos ao modelo `llama-3.3-70b-versatile` via Groq API com temperatura `0.1` (respostas determinísticas). O prompt solicita resposta em JSON estruturado com severidade, tipo de PII, descrição da vulnerabilidade e recomendação de correção em português.

Em caso de falha da API (timeout, quota, JSON inválido), há fallback automático: os `PIIMatch` são convertidos em `Vulnerability` usando o mapa de severidade padrão, sem análise semântica.

**Mapa de severidade padrão:**

| Tipo | Severidade |
|---|---|
| `password`, `token`, `credit_card` | critical |
| `cpf`, `email` | high |
| `phone`, `address` | medium |
| `name`, `generic` | low |

---

## Estrutura do projeto

```
├── app/
│   ├── page.tsx                  # Página principal (client component)
│   └── api/
│       └── analyze/
│           └── route.ts          # POST /api/analyze
├── components/
│   ├── RepoInput.tsx             # Formulário de entrada
│   ├── AnalysisReport.tsx        # Exibição do relatório
│   └── VulnerabilityCard.tsx     # Card individual de vulnerabilidade
├── lib/
│   ├── github.ts                 # Coleta de arquivos via GitHub API
│   ├── groq.ts                   # Análise semântica via Groq/Llama
│   └── pii-patterns.ts           # Regex, heurísticas e filtro de extensões
└── types/
    └── analysis.ts               # Tipos compartilhados (AnalysisReport, Vulnerability…)
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 4 |
| GitHub API | `@octokit/rest` v22 |
| LLM | Groq SDK · Llama 3.3 70B Versatile |
| Ícones | Lucide React |
| Runtime | Node.js 22 |

---

## Pré-requisitos

- Node.js 20+
- Conta na [Groq](https://console.groq.com) para obter a `GROQ_API_KEY`
- Token do GitHub (opcional, necessário para repositórios privados)

---

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/wsantos-ai/GitHub-PII-Scanner.git
cd GitHub-PII-Scanner

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# edite .env.local com suas chaves
```

### Variáveis de ambiente

```env
# Obrigatório
GROQ_API_KEY=gsk_...

# Opcional — token padrão para repositórios privados do GitHub
GITHUB_TOKEN=ghp_...
```

---

## Executando

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Uso

1. Cole a URL de um repositório GitHub no campo principal (`https://github.com/owner/repo`)
2. Clique em **Analisar**
3. Para repositórios privados ou para aumentar o rate limit, expanda **Opções avançadas** e informe o GitHub Token e/ou o branch desejado

O relatório exibe:
- Totais por severidade (critical / high / medium / low)
- Número de arquivos com problemas
- Lista de vulnerabilidades com arquivo, linha, trecho de código, descrição e recomendação

---

## API

### `POST /api/analyze`

**Body:**

```json
{
  "repoUrl": "https://github.com/owner/repo",
  "githubToken": "ghp_...",
  "branch": "main"
}
```

`githubToken` e `branch` são opcionais. Quando `githubToken` é omitido, usa `GITHUB_TOKEN` do ambiente.

**Resposta:**

```json
{
  "repository": "https://github.com/owner/repo",
  "analyzedAt": "2026-05-11T12:00:00.000Z",
  "totalFiles": 23,
  "filesWithIssues": 4,
  "summary": {
    "critical": 2,
    "high": 5,
    "medium": 3,
    "low": 1
  },
  "vulnerabilities": [
    {
      "id": "uuid",
      "file": "src/config.ts",
      "severity": "critical",
      "piiType": "token",
      "description": "Chave de API exposta diretamente no código-fonte.",
      "line": 12,
      "snippet": "const API_KEY = \"sk-abc123...\"",
      "recommendation": "Mova a chave para uma variável de ambiente e remova do código."
    }
  ]
}
```

**Timeout:** 60 segundos (`maxDuration = 60`).

---

## Extensões analisadas

`.ts` `.tsx` `.js` `.jsx` `.py` `.java` `.go` `.rb` `.php` `.cs` `.env` `.json` `.yaml` `.yml` `.sql` `.graphql` `.prisma` `.toml`

Arquivos com padrão `.env.*` (ex: `.env.production`) também são incluídos independente da extensão.

---

## Autor

<a href="https://github.com/me-wsantos">
  <img style="border-radius: 50%;" src="https://avatars.githubusercontent.com/u/179779189?v=4" width="80px;" alt="Wellington Santos"/>
</a>

**Wellington Santos**

[![LinkedIn](https://img.shields.io/badge/-Wellington--Santos-blue?style=flat-square&logo=Linkedin&logoColor=white)](https://www.linkedin.com/in/wellington-lima-dos-santos-13343143/)
[![Email](https://img.shields.io/badge/-me@wellington--santos.com-c14438?style=flat-square&logo=Gmail&color=11ab3a&logoColor=white)](mailto:me@wellington-santos.com)
