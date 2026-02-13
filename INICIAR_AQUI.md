# Como executar a aplicação AAGC

Sempre rode os comandos **dentro da pasta aagc-saas** (onde está o `package.json`).

---

## Primeira vez (ou depois de clonar)

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"

# 1. Instalar dependências
pnpm install

# 2. Subir Postgres e Redis (Docker)
pnpm docker:up

# 3. Gerar cliente Prisma + aplicar migrations + popular dados demo
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Iniciar aplicação (Web + API + Worker)
pnpm dev
```

---

## Próximas vezes (Docker já rodando)

```powershell
cd "C:\Users\lucas\OneDrive\Desktop\agent teste\aagc-saas"
pnpm dev
```

Se já tiver rodado `docker:up`, `db:generate`, `db:migrate` e `db:seed` antes, basta rodar **`pnpm dev`**.

---

## Erro "porta 3000 já em uso"

Algum processo está usando a porta 3000. Para liberar no Windows:

```powershell
# Ver qual processo usa a porta 3000
netstat -ano | findstr :3000

# Encerrar o processo (substitua 12345 pelo PID que apareceu na última coluna)
taskkill /PID 12345 /F
```

Depois rode `pnpm dev` de novo.

---

## Onde acessar

| O quê   | URL                    |
|--------|------------------------|
| Site   | http://localhost:3002  |
| API    | http://localhost:3003  |

**Login:** `owner@demo.com` / `demo123`
