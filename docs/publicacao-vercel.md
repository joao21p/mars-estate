# Publicação do Mars Estate na Vercel

Preparação e validação local em **12/11/2026**. Nenhum deploy, conta externa, banco hospedado, commit, push ou merge foi realizado. O `.env` foi somente lido para executar o bundle e comparar segredos sem imprimir seus valores. Nenhuma migração, cadastro, login, reserva ou alteração de dados foi executada no PostgreSQL.

## Decisão e compatibilidade

A configuração Lovable foi preservada. `@lovable.dev/vite-tanstack-config` já inclui `nitro/vite` e expõe `nitro.preset`; adicionar outro plugin duplicaria a integração. A mudança seleciona `vercel` no build padrão e `node-server` exclusivamente em `--mode node`, usado pelo build local.

Versões **instaladas**, conferidas em `node_modules`, no lockfile e por `npm ls`:

| Pacote | Versão |
| --- | --- |
| React / React DOM | 19.3.1 |
| TanStack React Start | 1.168.60 |
| TanStack React Router | 1.170.41 |
| TanStack Router Plugin | 1.168.42 |
| Lovable Vite TanStack Config | 2.26.5 |
| Vite | 8.1.5 |
| Nitro | 3.0.260603-beta |
| Plugin React | 5.2.0 |
| pg | 8.23.1 |
| Google GenAI | 3.0.0 |
| Three.js | 0.186.1 |
| Node utilizado | 24.21.0 |

O wrapper aceita Vite `<9`, Nitro `>=3.0.260603-beta` e Start `>=1.100.0`. Nitro aceita Vite 7/8; Start exige Node `>=22.12`; GenAI exige Node `>=22`. O Router Plugin aceita a versão instalada do Router. As faixas de peers relevantes são compatíveis, e o build validou sua integração. Nenhuma dependência foi atualizada ou substituída para trocar o adaptador. `engines.node` fixa `24.x`, e o lockfile foi sincronizado.

**Atenção à versão:** a documentação Nitro atual evoluiu desde esta beta. Nesta versão instalada, o preset escolhe o runtime a partir do Node que executa o build; por isso é importante usar Node 24 também no builder. O artefato foi inspecionado e declara `nodejs24.x`. Não trocar Nitro 3 por Nitro 2/nitropack, nem atualizar a beta sem nova validação.

Foram mantidos aliases `@`/tsconfig, deduplicação React/TanStack, React, Tailwind, rotas, server functions e `src/server.ts` como entry SSR. O globo continua em import lazy, dentro de `ClientOnly`, com fallback e controles DOM; Embla, filtros e identidade visual não foram alterados. Os avisos existentes sobre `vite-tsconfig-paths` e o chunk grande do globo permanecem visíveis.

## Artefatos e comandos

```powershell
npm.cmd ci
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
npm.cmd run audit:publication
```

O build padrão usa o adaptador oficial Nitro/Vercel e produz:

- `.vercel/output/config.json`: Build Output API v3; assets imutáveis, filesystem e fallback para `/__server`.
- `.vercel/output/functions/__server.func/index.mjs`: handler Web (`default.fetch`), executado em Node; formato Web não significa Edge Runtime.
- `.vercel/output/functions/__server.func/.vc-config.json`: `runtime: nodejs24.x`, `launcherType: Nodejs`, streaming habilitado.
- `.vercel/output/static`: somente conteúdo público.

`vercel.json` declara `tanstack-start`, instalação `npm ci` e build `npm run build`. Não configure `dist` como Output Directory, não use preset Vite estático, e não adicione rewrite SPA para `index.html`: isso impediria SSR e server functions. Deixe o Output Directory no padrão do framework. `npm ci` evita ambiguidade com o `bun.lock` legado, que foi preservado.

Para testar um servidor de produção Node local:

```powershell
npm.cmd run build:local
npm.cmd run preview
# Em outro terminal:
node scripts/smoke-production.mjs http://127.0.0.1:4173
```

`preview` carrega o `.env` existente somente em memória, define `NODE_ENV=production` e executa `.output/server/index.mjs`. Host padrão `127.0.0.1`, porta `4173`; `HOST`/`PORT` podem ser definidos no ambiente. O script recusa um artefato que não seja `node-server`, com instrução de reconstrução. Não cria o caminho fictício `dist/server/server.js` nem encobre exceções HTTP.

O build Vercel também foi servido **diretamente** pelo srvx instalado com Nitro, sem recompilar como dev server:

```powershell
npm.cmd run build
$env:NODE_ENV='production'
node --env-file-if-exists=.env node_modules/srvx/bin/srvx.mjs --prod --host 127.0.0.1 --port 4174 --static ../../static .vercel/output/functions/__server.func/index.mjs
# Em outro terminal:
node scripts/smoke-production.mjs http://127.0.0.1:4174
```

`../../static` é resolvido relativamente ao diretório do entry pelo srvx. Essa execução usa o handler Vercel real e os assets gerados, mas não reproduz CDN, roteamento da plataforma, proxy HTTPS, suspensão/concorrência Fluid Compute ou limites da Vercel. `vite preview` não é usado como evidência de funcionamento: o wrapper Lovable registra Nitro somente durante build, enquanto o preview anterior procurava o entry diferente do TanStack.

No Windows com sandbox restritivo, o tracer `nf3/@vercel/nft` inicialmente recebeu `EPERM` em `readlink` de um diretório ancestral fora do workspace. O build foi repetido com execução autorizada fora desse sandbox e passou. Não houve patch de dependências nem mudança de configuração para ocultar essa restrição local.

Dentro do ambiente de build próprio do Lovable, o wrapper pode forçar o preset dele e ignorar o solicitado. Gere o artefato Vercel no checkout local/CI/Vercel, sem variáveis de sandbox Lovable (`LOVABLE_SANDBOX=1` ou `DEV_SERVER__PROJECT_PATH`). Confirme sempre o preset no log e no artefato.

## PostgreSQL gerenciado

O backend usa o driver `pg`, sockets TCP/TLS do Node, `node:crypto` (scrypt, hashes e aleatoriedade), transações e queries parametrizadas. São recursos compatíveis com Node 24; não foi escolhido `vercel-edge`. Scrypt consome aproximadamente 128 MiB por operação, com duas simultâneas por processo: confira memória e concorrência no Preview, sem reduzir os parâmetros de senha para fazer caber.

`src/server/db.ts` continua a criar um Pool por módulo/instância quente. Agora aceita `DATABASE_URL`, TLS verificado opcional, limite configurável por instância, timeout de conexão de 5 segundos e descarte ocioso de 10 segundos. O Pool não é encerrado a cada requisição. `allowExitOnIdle` permite que sockets ociosos não mantenham um processo local vivo; não equivale a uma integração com o ciclo de suspensão da Vercel.

Para conectar um serviço escolhido pelo operador, posteriormente:

1. Escolha PostgreSQL numa região próxima da função Vercel. Reserve banco/schema e credenciais separados para Preview e Production. Não exponha o PostgreSQL local à internet.
2. Use endpoint com pooler gerenciado compatível com transações; comece com `DATABASE_POOL_MAX=2` e dimensione pelo limite total do provedor, pois cada instância pode abrir seu próprio Pool. Não há limite global de conexões no código.
3. Configure TLS com validação do certificado. Use uma das formas abaixo; a aplicação não faz fallback silencioso para conexão sem TLS após uma falha.
4. Prepare o schema e o catálogo no destino por procedimento administrativo separado, com dados fictícios/sanitizados. Revise `migrations/20261111_001_auth.sql` e `20261111_002_reservations.sql` e aplique somente no destino correto, após as tabelas do catálogo. O repositório não contém um provisionamento completo do catálogo; essas migrações não recriam `plots`, regiões, imagens ou características. Não assumir que um banco vazio basta. Nada disso foi executado nesta tarefa.
5. Use usuário de aplicação com privilégios mínimos para as tabelas necessárias; não use superusuário. Migrações devem usar credencial administrativa separada, fora da aplicação.
6. Teste conexão, TLS, schema, transações e concorrência em Preview. Não execute scripts de schema/testes opt-in contra Production.

TLS: com `DATABASE_SSL=true`, use URL **sem** `sslmode`, `sslcert`, `sslkey` ou `sslrootcert`; esses parâmetros substituem o objeto `ssl` no pg. O código usa `rejectUnauthorized: true` e aceita `DATABASE_SSL_CA` em PEM, quando necessária uma CA própria. Alternativamente, deixe `DATABASE_SSL` ausente e use a URL fornecida pelo provedor com `sslmode=verify-full` e cadeia de confiança adequada. Não use `sslmode=no-verify`, `sslmode=disable`, `uselibpqcompat=true` com modo permissivo ou `NODE_TLS_REJECT_UNAUTHORIZED=0`. Não acrescente caminhos de certificados locais à URL para o deploy.

## Variáveis no painel Vercel

Em **Project → Settings → Environment Variables**, adicione os valores fornecidos pelo operador e selecione o ambiente correto. Marque segredos como Sensitive quando disponível. Nunca use prefixo `VITE_` em credenciais. `.env.example` é apenas referência e não deve substituir o `.env` existente.

| Variável | Valor esperado / uso |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL do endpoint gerenciado, preferencialmente pooler. Privada. Não imprimir nem colocar no Git. |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | Alternativa à URL, preservada para o banco local; a URL prevalece nos campos que contém. Não configurar duas fontes conflitantes. |
| `DATABASE_SSL` | `true` quando configurar TLS pelo objeto do Pool; ausente se a URL já configura TLS. |
| `DATABASE_SSL_CA` | Opcional: PEM completo exigido pelo provedor, somente servidor. |
| `DATABASE_POOL_MAX` | Inteiro positivo; ponto inicial `2` em ambiente serverless. Padrão legado `10` se ausente. |
| `AUTH_ORIGIN` | Origem pública HTTPS exata e estável do ambiente, por exemplo `https://mars-estate.example.invalid`; substituir pelo domínio real, sem caminho, wildcard ou barra final. |
| `GEMINI_API_KEY` | Chave privada do projeto Google destinada ao ambiente; com cota e acesso ao modelo. |
| `GEMINI_MODEL` | Opcional; ID de modelo habilitado para a chave. Sem valor, preserva o padrão atual `gemini-3.5-flash-lite`. A disponibilidade real não foi testada nesta tarefa. |

`NODE_ENV` é `production` nos builds/funções de produção; não configure `development` para contornar cookies. Não são necessárias novas chaves de sessão: a sessão existente é um token opaco com hash persistido no PostgreSQL.

Cadastre valores distintos em **Preview** e **Production**; Development só é necessário se for usar o ambiente Vercel de desenvolvimento. Alterações de variáveis exigem novo deployment. Não execute `vercel env pull` sobre o `.env` local existente sem um procedimento separado que o preserve.

## Sessões, cookies, CSRF e cache

- Cookie de produção: `__Host-mars_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sem `Domain`, validade de sete dias. O banco guarda SHA-256 do token; valida expiração e usuário, e o logout revoga a sessão. Não há dependência de filesystem persistente ou sticky session.
- O middleware CSRF do TanStack Start foi preservado. Login, cadastro, logout e mutações de reservas também exigem POST, `Origin` igual a `AUTH_ORIGIN` e ausência de `Sec-Fetch-Site: cross-site`. Em produção, `AUTH_ORIGIN` ausente impede a mutação. Não adicione wildcard ou confiança irrestrita em headers encaminhados.
- Configure `AUTH_ORIGIN` para a **URL em que o navegador está aberto**. Para Preview, use alias estável de branch ou domínio de homologação. Após o primeiro Preview, obtenha esse alias, configure a variável para a branch e gere outro Preview. Colar a URL imutável de um deployment anterior e depois gerar outro causa divergência de origem. Abra o alias configurado ao testar autenticação.
- HTTP local serve para SSR e assets. Não homologa cookies `Secure` ou autenticação por HTTPS. Use o Preview HTTPS para testar esses fluxos, sem relaxar os cookies locais de produção.
- Durante o smoke, foi constatado que headers definidos dentro de server functions não apareciam no redirect SSR privado. `nitro.config.ts` agora aplica `private, no-store` a `/conta`, `/minhas-reservas` e `/_serverFn/**`, incluindo redirects. As regras de negócio e validação não foram alteradas.
- No Preview, verifique `Location`, URL de requisição atrás do proxy, metadados OG com HTTPS, `Set-Cookie` e respostas sem cache. Não habilite ISR/cache compartilhado para páginas ou funções com sessão.

## Auditoria de publicação

`.gitignore` agora exclui metadados Vercel, exports/backups, SQL avulso, dumps e chaves; mantém `migrations/*.sql` versionáveis. `.vercelignore` também exclui segredos, dumps, certificados, testes e documentação do upload via CLI. Regras ignore não removem arquivos já rastreados; o auditor verifica esses arquivos também. Não exclua migrações do Git: elas são código de schema, não backups de dados.

`npm.cmd run audit:publication` lê `.env` em memória e compara valores privados conhecidos com seis ou mais caracteres (também com encoding de URL) com arquivos elegíveis para Git e bundles existentes. O limite evita matches de substrings comuns e significa que a comparação literal não cobre segredos curtos. Verifica também padrões de tokens/chaves/URLs com senha, arquivos privados em diretórios públicos e referências de implementação privada no cliente. Examina `.vercel/output/static`, `.output/public`, `dist/client`, `public`, e também bundles de servidor. Não imprime matches, linhas ou valores secretos; falha quando encontra evidência.

As credenciais Gemini são lidas por `process.env` em `src/server/mars-ai.ts`, já marcado server-only; o Pool também recebeu a barreira `@tanstack/react-start/server-only`. As server functions importam os módulos privados dentro dos handlers; suas implementações não seguem para o navegador. `pg` e GenAI existem no bundle servidor, e não no cliente. Não foi encontrado valor de segredo conhecido nem padrão de credencial embutida nos arquivos auditados.

Nenhum `.env`, dump ou backup foi encontrado entre os arquivos rastreados/novos elegíveis para Git. A consulta de nomes de arquivos no histórico acessível não encontrou `.env*`, `.dump` ou `.backup`. Isso não é uma varredura completa de todos os blobs e referências históricas. Se houver suspeita de vazamento anterior, revogue a credencial e faça auditoria específica, sem reescrever o histórico conectado ao Lovable nesta tarefa.

E-mails e dados pessoais de exemplo encontrados nos testes são fixtures fictícias, fora do bundle público. Nenhum export de usuários, sessões ou reservas foi incluído. Detecção automática não prova ausência de todo dado pessoal: revise arquivos novos antes de versionar e sanitize qualquer transferência futura do banco. Não publique prints do painel, respostas privadas, logs de requisições ou backups como assets.

## Evidências e limites

| Verificação | Resultado |
| --- | --- |
| `npm.cmd test` | 105 aprovados; 4 ignorados; 18 arquivos (15 executados, 3 ignorados). Inclui configuração local/gerenciada do Pool, cookies, origem, autenticação, reservas e Gemini com mocks. |
| `npx.cmd tsc --noEmit` | Aprovado após as alterações. |
| `npm.cmd run build` | Aprovado, preset `vercel`, função `nodejs24.x`. |
| `npm.cmd run build:local` e `npm.cmd run preview` | Aprovados; servidor Nitro real, sem o erro de entry anterior. |
| `npm.cmd ci --dry-run --ignore-scripts --offline` | Aprovado; consistência do lockfile, sem reinstalação completa. |
| Smoke HTTP nos dois bundles | Oito páginas públicas + um detalhe de catálogo: 200 com HTML SSR. `/entrar` e `/cadastro` normalizam `returnTo` via 307 antes do 200. Duas rotas privadas: 307 para login com `no-store`. Rota inexistente: 404. 26 assets: 200, conteúdo não HTML. |
| Auditoria | Sem matches de credenciais conhecidas/padrões ou implementação privada no cliente. Rodar novamente após qualquer mudança de conteúdo/env/build. |

Os testes PostgreSQL/Gemini opt-in foram mantidos desabilitados: não houve transações de escrita, alterações de schema, chamadas pagas ao Gemini ou modificação dos dados locais. O smoke utilizou somente GET e leituras do catálogo. Não houve homologação visual/hidratação de Three.js, teste de sessão real em navegador, banco gerenciado, CDN ou execução na infraestrutura Vercel.

O limitador Gemini é **por processo em memória**; múltiplas instâncias/reinícios multiplicam ou reiniciam a cota local. Não equivale a um limite global de custo. Para Preview, habilite Deployment Protection e cotas do provedor; antes de abrir produção irrestrita, planeje limite compartilhado/controle de abuso. As regras Gemini foram preservadas nesta tarefa.

## Próximos passos exatos para Preview e produção

1. Revise o diff, incluindo o trabalho local anterior. Há muitos arquivos novos de autenticação/reservas/identidade visual ainda não versionados; eles precisam integrar a futura publicação. Esta tarefa não fez commit/push. Não use force push, amend ou rebase de commits publicados no projeto Lovable.
2. Prepare o PostgreSQL gerenciado de homologação e seu schema/catálogo sanitizado, pelo procedimento administrativo acima, fora desta tarefa.
3. Ao importar o repositório na Vercel, selecione a raiz que contém `package.json`. Confira framework **TanStack Start**, Node **24.x**, instalação `npm ci`, build `npm run build`, Output Directory padrão. Escolha região próxima do banco e verifique memória/duração; a chamada Gemini permite até 30 segundos, além do restante do processamento.
4. Cadastre as variáveis de **Preview**, habilite a proteção do deployment e inicie **somente um deployment de Preview**, quando autorizado. Não execute `vercel --prod` nem promova automaticamente.
5. Ajuste `AUTH_ORIGIN` ao alias HTTPS estável da branch/homologação, gere novo Preview e abra esse alias. Verifique no log `preset: vercel`, runtime Node 24 e ausência de mensagens de credenciais.
6. Execute o smoke no domínio de Preview; se houver Deployment Protection, use acesso autenticado ou bypass guardado privadamente, nunca incluído no Git/URL de relatório. Faça também revisão em navegador desktop/mobile: globo/fallback e teclado, carousel, filtros, comparação, navegação direta e assets.
7. Em banco de homologação e com contas fictícias, valide cadastro/login/logout, persistência de sessão entre requisições/instâncias, duas contas isoladas, cookie Secure, CSRF com Origin ausente/incorreta, redirects privados, reserva/cancelamento/concorrência e Mars AI. Examine o browser Network: nenhum segredo ou conteúdo de outra conta. Esses testes escrevem dados e ficam para o Preview autorizado.
8. Confira TLS, erros de conexão, orçamento de conexões, memória scrypt, timeout/cota Gemini e metadados HTTPS. Só após essa homologação cadastre variáveis **Production**, origem do domínio definitivo e banco de produção, e autorize a publicação.

**Conclusão:** a preparação técnica local está pronta para um deployment de Preview na Vercel, condicionado à configuração do PostgreSQL gerenciado, variáveis e alias HTTPS. Ainda não está homologada para produção.

## Referências oficiais

- [Vercel: TanStack Start com Nitro](https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel)
- [Nitro: provider Vercel](https://nitro.build/deploy/providers/vercel)
- [Vercel: Node.js 24 em builds e funções](https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions)
- [node-postgres: TLS e interação entre URL e objeto ssl](https://node-postgres.com/features/ssl)

As diferenças desta beta foram verificadas também no código instalado do wrapper e de `nitro/dist/_presets.mjs`, além dos artefatos e testes reais.
