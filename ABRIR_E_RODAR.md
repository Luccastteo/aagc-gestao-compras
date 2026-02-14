# Ao abrir para rodar o programa — checklist

Use este guia **toda vez** que for subir a aplicação.

---

## Forma mais fácil (evita erro de porta / lock)

**Dê dois cliques em:**  
`RODAR_DEV.bat`

Esse script libera as portas 3002 e 3003, remove o lock do Next.js (se existir) e roda `pnpm dev`. Use isso quando o `pnpm dev` no terminal der erro.

---

## O que precisa estar aberto / rodando

| # | O quê | Status |
|---|------|--------|
| 1 | **Docker Desktop** | Abrir e deixar rodando (Postgres + Redis) |
| 2 | **1 terminal** (PowerShell ou CMD) | Na pasta do projeto |

Nada mais. Um único terminal basta.

---

## Comandos (na ordem) — 1 terminal

Rode **todos na mesma pasta**:  
`C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas`

### Se o Docker **já está rodando** (já subiu antes)

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"
pnpm dev
```

**1 comando.** O `pnpm dev` sobe sozinho: **Web** (porta 3002), **API** (porta 3003) e **Worker**.

---

### Se for a **primeira vez** ou Docker estava fechado

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"

pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

**5 comandos**, um após o outro, no **mesmo terminal**.

---

## Resumo rápido

| Situação | Terminais | Comandos |
|---------|-----------|----------|
| Dia a dia (Docker já aberto) | **1** | `cd ...` → `pnpm dev` |
| Primeira vez / Docker fechado | **1** | `cd ...` → `docker:up` → `db:generate` → `db:migrate` → `db:seed` → `pnpm dev` |

**Programas que precisam estar abertos:**  
- **Docker Desktop** (para Postgres e Redis)  
- **1 terminal** (para os comandos acima)

---

## Onde acessar depois que subir

- **Site (login):** http://localhost:3002  
- **API / Docs:** http://localhost:3003 e http://localhost:3003/api/docs  

**Login demo:** `manager@demo.com` / `demo123`

---

## Por que `pnpm dev` dá erro toda vez?

Dois motivos comuns:

1. **Porta em uso** — A última vez que você rodou, o processo ficou nas portas 3002 (Web) ou 3003 (API). Na próxima vez, o novo processo não consegue usar a mesma porta.
2. **Lock do Next.js** — O Next cria um arquivo de lock em `apps/web/.next/dev/lock`. Se o processo foi fechado sem encerrar direito, o lock fica lá e o Next reclama.

**O que fazer:**

- **Opção A:** Rodar **`RODAR_DEV.bat`** (ele já libera portas e remove o lock e depois sobe o app).
- **Opção B (manual):** No terminal, na pasta do projeto:
  1. Rodar `kill-ports.bat` (libera 3002 e 3003).
  2. Se aparecer erro de "lock", apagar o arquivo:  
     `del apps\web\.next\dev\lock`
  3. Rodar de novo: `pnpm dev`.
