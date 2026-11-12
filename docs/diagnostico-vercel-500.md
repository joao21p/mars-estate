# Diagnóstico do HTTP 500 — Vercel

Investigação em 12/11/2026. Não houve commit, push, deploy, edição do `.env`, migração ou conexão ao Neon. Todas as consultas de reprodução usaram o banco local com `default_transaction_read_only=on`.

## Evidência principal: deployment diferente do descrito

O registro fornecido para `GET /`, Request ID `c4chl-1794503178619-111ebdec6456`, informa:

- deployment `dpl_7rkLVfUrG5QbdHdHmHmZaxXWK474`;
- **Environment: production**;
- **Branch: main**;
- rota `/__server`, HTTP 500, duração da função 512 ms.

Isso não comprova uma falha do Preview de `feature/autenticacao`. O usuário informou que as variáveis de banco/Gemini foram cadastradas somente em Preview e que Production ainda usa main antiga. Essas configurações não são intercambiáveis. Além disso, a main local em `a100686` não lê `DATABASE_URL`: seu Pool usa somente `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` e `DATABASE_PASSWORD`. A branch atual já contém o suporte a URL e o preset Vercel. O commit Source do deployment remoto precisa ser conferido no painel; não foi possível inspecionar o código remoto privado diretamente.

**Hipótese mais forte para o erro observado:** execução do código antigo em Production sem a configuração PostgreSQL que foi adicionada apenas em Preview. **A exceção concreta ainda não foi fornecida**: o registro recebido contém metadados da requisição, não a mensagem/stack do erro. Não é possível afirmar se houve ECONNREFUSED, erro TLS, autenticação, schema ou outro problema naquela execução.

“No outgoing requests” no painel de External APIs não prova ausência de conexão PostgreSQL: `pg` usa TCP/TLS, não uma chamada HTTP de API. `Ready` comprova que o build/deployment concluiu, não que os loaders SSR conseguiram consultar o banco. Warnings npm deprecated não são, por si só, a causa do HTTP 500.

A URL enviada exige autenticação Vercel para acesso externo. GETs a `/`, `/sobre`, `/terrenos`, `/entrar` e `/favicon.svg` retornaram redirecionamento 302 para proteção Vercel. Não foi usado bypass, nem foram acessados Runtime Logs privados.

## Código revisado e alterações

`src/routes/index.tsx` executa regiões e catálogo em paralelo no loader. O catálogo também verifica a estrutura de reservas. Uma rejeição de conexão/query causa erro de SSR; não existe fallback silencioso para dados mock. `/sobre` não depende dessas queries e ajuda a separar erro de banco de erro geral de runtime.

`AUTH_ORIGIN` é exigida pelas mutações de autenticação/reservas; sua ausência não é utilizada pelo loader público da home. Ela precisa ser configurada para o uso funcional de login/reservas, mas não explica sozinha o 500 de `GET /`.

Foram preservados Node 24, Nitro `vercel`, wrapper Lovable, SSR, assets, Three.js, queries, regras de negócio, TLS e o timeout atual. Não foram adicionados `rejectUnauthorized: false`, retries cegos ou aumento especulativo de timeout.

Arquivos de aplicação alterados:

- `src/server/db.ts`: exige URL na Vercel, em vez de usar silenciosamente localhost/usuário do sistema; valida o formato da URI sem registrar seu conteúdo; trata `error` de conexões ociosas do Pool. Sem listener, um erro emitido pelo Pool poderia encerrar o processo. Esse risco foi corrigido, mas não foi comprovado como causa da requisição remota.
- `src/server/db-diagnostics.ts`: diagnóstico server-only com operação, código permitido e categoria. Não registra URL, host, usuário, senha, SQL, parâmetros, mensagens, stack ou cause do provedor. Ao relançar uma falha de query para o SSR, usa uma mensagem genérica sem anexar o erro original; isso evita que o logger global expanda dados sensíveis da cause.
- `src/functions/regioes.ts` e `src/functions/terrenos.ts`: aplicam o diagnóstico às consultas de regiões, catálogo e detalhe, incluindo a verificação de reservas. Os erros continuam falhando a requisição; não são convertidos em listas vazias ou HTTP 200.
- `src/test/db-config.test.ts` e `src/test/db-diagnostics.test.ts`: cobrem configuração Vercel, URI inválida, parsing real do pg/TLS sem conexão, erro ocioso, categorização e ausência de dados privados nos logs.

Exemplo de log seguro:

```json
{"operation":"catalog.regions","code":"42P01","category":"database-or-schema","connectionSource":"DATABASE_URL"}
```

O prefixo no log é **`[mars-db]`**. Se `pool.configuration` falhar no import do módulo, a função ainda não chega a consultar o banco. Não é esperado log SQLSTATE nesse caso.

## Validações

- `npm.cmd test`: 118 testes aprovados; 4 integrações opt-in ignoradas. Não foram executados testes que criam contas/reservas ou chamam Gemini real.
- `npx.cmd tsc --noEmit`: aprovado.
- `npm.cmd run build`: aprovado; função `nodejs24.x`, handler Web executado em Node. O uso de `default.fetch` não significa Edge Runtime.
- Handler Vercel real do bundle, antes e depois das alterações: `/sobre`, `/`, `/terrenos` e formulário de login com HTTP 200 usando banco local read-only, sem `AUTH_ORIGIN`.
- Smoke HTTP com srvx em modo produção e o artefato `.vercel/output`: oito páginas públicas e um detalhe com SSR, 26 assets com 200, rotas privadas com 307/no-store e rota inexistente com 404.
- Reprodução controlada: URL ausente em ambiente Vercel → `[mars-db] MARS_DB_URL_MISSING`; conexão local recusada → `ECONNREFUSED`; search_path de teste sem catálogo → `42P01`. Nos cenários de banco inválido, home/catálogo retornaram 500 e `/sobre`/login continuaram 200. Nenhum dado foi alterado para reproduzir os erros: só variáveis do processo e SELECTs.
- Auditoria de publicação sem credenciais conhecidas ou implementação privada no cliente. Os probes locais ficam em `exports/vercel-500-diagnostics/`, ignorados pelo Git; não devem ser publicados.

## Verificação exata no painel Vercel

1. Em Deployments, escolha um deployment cujo **Source seja `feature/autenticacao`**, cujo commit corresponda ao código atualizado, e cujo **Environment seja Preview**. Não continue avaliando a execução de `main`/Production como se fosse esse Preview.
2. Confira Settings → Environment Variables no projeto correto. `DATABASE_URL` deve estar habilitada em Preview e sem restrição de branch que exclua `feature/autenticacao`. Deve conter somente a URI PostgreSQL do Neon, sem `psql`, aspas externas ou texto de terminal. Não copie seu valor para logs/chat.
3. Use URL do banco/branch Neon que contém o catálogo migrado; confirme database e role no painel Neon. A URL deve configurar TLS, por exemplo com `sslmode=verify-full` ou o modo documentado pelo provedor, sem desativar validação de certificado. Se a URL já contém parâmetros TLS, não misture uma configuração `DATABASE_SSL_CA` concorrente sem revisar a precedência do pg.
4. Confirme Node 24, TanStack Start, `npm run build`, output padrão e commit correto. Não defina um rewrite SPA para `index.html`. Alterar variáveis exige **novo deployment**; reabrir um deployment antigo não atualiza suas variáveis.
5. Gere novo Preview da branch atualizada. Abra sua URL pelo botão Visit enquanto autenticado. Teste `/sobre`, `/`, `/terrenos` e um detalhe.
6. Se falhar, abra os Runtime Logs **desse mesmo deployment** e dessa nova requisição. Procure `[mars-db]`; antes de publicar a correção, procure a exceção original. Envie somente código, categoria e stack sem informações privadas. Se `/sobre` também falhar, procure falhas de import/runtime/SSR além de banco.
7. Configure `AUTH_ORIGIN` com a origem HTTPS estável do ambiente, sem caminho ou wildcard. Use o alias estável ao testar login/reservas e gere novo deployment. Não enfraqueça cookies Secure/CSRF para contornar uma divergência de URL.

| Código/categoria | Conferir |
| --- | --- |
| `MARS_DB_URL_MISSING` | Escopo da variável, branch selecionada, deployment antigo ou Production sem variáveis. |
| `MARS_DB_URL_INVALID` | URI copiada com comando psql, aspas externas ou formato/protocolo inválido. |
| `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN` | Host/endpoint correto, variável efetiva e DNS/rede; não expor o host em logs públicos. |
| `28P01`, `28000` | Role e credencial do Neon; verifique no painel sem compartilhar a senha. |
| Erro TLS/certificado | Parâmetros TLS e cadeia de confiança; não desative a verificação. |
| `42P01`, `42703`, `3D000` | Banco/branch/schema correto e compatibilidade com o catálogo já migrado. Não executar migrações novamente sem diagnosticar. |
| `42501` | USAGE no schema e permissões necessárias para a role da aplicação. |
| `53300` | Limite de conexões do endpoint e Pool por instância. |
| `timeout` | Neon suspenso/inicialização, rede e região; só ajustar timeout após observar o erro. |

## Publicar esta correção posteriormente

Nenhum comando abaixo foi executado nesta tarefa. Confirme que está em `feature/autenticacao` e revise o diff antes de commitar.

```powershell
git branch --show-current
git diff --check
git add -- src/server/db.ts src/server/db-diagnostics.ts src/functions/regioes.ts src/functions/terrenos.ts src/test/db-config.test.ts src/test/db-diagnostics.test.ts docs/diagnostico-vercel-500.md
git diff --cached --check
git diff --cached
git commit -m "fix: validar conexão Vercel e diagnosticar falhas PostgreSQL com segurança"
git push origin feature/autenticacao
git rev-parse --short HEAD
```

Use o novo commit para o Preview descrito acima. Para publicar Production depois de validar o Preview, cadastre explicitamente as variáveis também em **Production**, incluindo a origem HTTPS definitiva, e publique um **novo build com o código atualizado**. Não basta redeployar a main antiga: a versão local dela sequer usa `DATABASE_URL`. Não basta alterar variáveis somente em Preview. Mantenha o fluxo de PR/branch de produção escolhido pelo projeto; esta tarefa não fez merge nem mudou a Production Branch.

Se a Vercel CLI já estiver vinculada ao projeto correto, o comando manual para gerar um novo deployment de Production a partir do checkout atualizado é `npx.cmd vercel deploy --prod`. Ele deve ser executado apenas após configurar Production e validar o Preview; confira o projeto vinculado e não selecione criação de outro projeto. Não use o deployment antigo com erro como alvo de promoção. A configuração de qual branch deve disparar Production continua sendo uma decisão do operador.

**Estado:** correções locais de configuração/diagnóstico validadas; a causa final da exceção remota e a resolução do 500 só podem ser confirmadas no deployment/ambiente correto. O principal desalinhamento demonstrado pelos logs é `main`/Production versus código/variáveis preparados para `feature/autenticacao`/Preview.

Referências: [Vercel — variáveis entre ambientes](https://vercel.com/docs/environment-variables/manage-across-environments), [Vercel — TanStack Start com Nitro](https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel), [Neon — erros de conexão](https://neon.com/docs/connect/connection-errors).
