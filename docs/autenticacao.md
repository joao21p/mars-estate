# Autenticação — etapa 1

Implementação na branch `feature/autenticacao`. Sem novas dependências, commits, reservas ou alterações no Mars AI, globo e comparação. As alterações locais anteriores foram preservadas.

## Decisão e arquitetura

- Server functions do TanStack Start (`src/functions/auth.ts`) chamam módulos exclusivos do servidor por importação dinâmica. Reutiliza o Pool PostgreSQL de `src/server/db.ts`.
- Validação Zod compartilhada em `src/data/auth.ts`: nome aparado com 2–100 caracteres; e-mail aparado, minúsculo e válido com até 254; senha preservada literalmente com 12–128 caracteres. A restrição UNIQUE no banco resolve também cadastros concorrentes.
- Scrypt assíncrono nativo do Node: N=131072, r=8, p=1, salt aleatório de 16 bytes, chave de 64 bytes e comparação em tempo constante. Usa a [configuração mínima de scrypt recomendada pela OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Até duas derivações simultâneas por processo (~128 MiB cada); excesso recebe erro temporário, sem fila ilimitada. Deploy exige runtime com suporte a `node:crypto`/scrypt; o build gerado por si só não comprova compatibilidade do provedor Cloudflare/Nitro.
- Tokens de sessão com 32 bytes criptograficamente aleatórios; apenas SHA-256 no banco. Validade absoluta de sete dias, sem renovação deslizante. Login/cadastro criam nova sessão e revogam a sessão apresentada anteriormente. Logout revoga no banco antes de remover o cookie. Sessões de outros dispositivos permanecem válidas.
- Cookie local `mars_session`; produção `__Host-mars_session`, com HttpOnly, SameSite=Lax, Path=/, sem Domain e Secure em produção. Nenhum token vai para localStorage ou resposta JSON.
- Middleware CSRF já existente em `src/start.ts` preservado. As mutações também exigem POST e Origin exatamente correspondente à origem configurada; rejeitam `Sec-Fetch-Site: cross-site`. Não aceitam origem ausente. Consulte a [documentação do TanStack](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions).
- Limites atômicos no PostgreSQL, separados entre login e cadastro: 10 tentativas por e-mail normalizado e 100 globais por janela de 15 minutos. Contam também sucessos para evitar abuso de contas válidas. Não dependem de IP ou cabeçalhos de proxy falsificáveis. É um limite conservador para este projeto; um atacante pode esgotar a janela global ou de um e-mail. Antes de escalar, complementar com limites de rede em proxy confiável e monitoração. Os registros usam hashes de identificadores, sem registrar credenciais.
- Erro de login igual para conta ausente/senha incorreta; ambos fazem scrypt. Cadastro duplicado retorna erro genérico, sem afirmar que a conta existe. Erros internos de banco não são enviados ao cliente nem registrados por estes módulos.
- `/conta` exige sessão na própria server function, inclusive em chamadas diretas. Respostas de autenticação/conta usam `Cache-Control: no-store`. Rotas públicas não consultam autenticação em seus loaders; o cabeçalho consulta depois da montagem e revalida a cada minuto, ao focar/reconectar. Falha no banco não bloqueia o catálogo público. O servidor sempre é a autoridade para acessar dados privados.

## Migração e configuração

Migração: `migrations/20261111_001_auth.sql`. Cria somente `auth_users`, `auth_sessions`, `auth_rate_limits` e índices, dentro de transação. Não altera ou apaga tabelas existentes e não roda no startup. `IF NOT EXISTS` permite reaplicação; não reconcilia uma tabela prévia com estrutura diferente. Inspecione eventuais tabelas homônimas antes de aplicar.

1. Faça backup do banco local e confirme host, banco e usuário de destino usando suas ferramentas habituais. Revise a migração e permissões de criação de tabelas/índices.
2. Use pgAdmin ou `psql` com conexão configurada localmente. Exemplo com nomes fictícios (psql solicita a senha, não a inclua na linha de comando):

   ```powershell
   psql -h localhost -U SEU_USUARIO -d SEU_BANCO -v ON_ERROR_STOP=1 -f migrations/20261111_001_auth.sql
   ```

3. Confira as três tabelas e seus índices. Nenhuma migração permanente foi aplicada durante esta implementação.
4. O Pool reutiliza as variáveis já existentes `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`. Não alteramos nem exibimos o `.env`.
5. Variável nova: `AUTH_ORIGIN` (somente servidor, sem prefixo VITE). Em produção é obrigatória: origem pública exata em HTTPS, sem caminho. Localmente é opcional: utiliza a origem da requisição. Atrás de proxy, configure-a explicitamente e encaminhe corretamente os cookies e Origin. `NODE_ENV=production` ativa Secure; teste produção usando HTTPS.

Manutenção futura: remover periodicamente sessões expiradas e buckets de limite vencidos por tarefa administrativa (`DELETE` somente onde `expires_at <= now()`), com retenção e periodicidade definidas pelo operador. Não há job automático nesta etapa. O banco nega sessões expiradas mesmo antes da limpeza.

## Testes e evidência

Resultados desta implementação (11/11/2026):

- Autenticação: **12 testes passaram**, incluindo a integração PostgreSQL real em tabelas temporárias (`AUTH_TEST_POSTGRES=1`, quatro arquivos de teste).
- Suíte completa `npm.cmd test`: **65 passaram, 2 falharam, 1 ignorado** (integração PostgreSQL opt-in). As duas falhas são em `src/test/mars-ai-provider.test.ts`, preservado sem alterações: mock do Gemini não fornece `ThinkingLevel`, e expectativas ainda usam modelo/timeout/configuração antigos, diferentes da implementação atual. Não são falhas dos testes de autenticação.
- `npx.cmd tsc --noEmit`: passou. `npm.cmd run build`: passou, com avisos existentes de tsconfig paths, validator antigo em terrenos e tamanho de bundles.
- Smoke HTTP local: `/entrar`, `/cadastro`, `/terrenos` responderam 200; `/conta` sem cookie respondeu 307 para `/entrar`. Isso não substitui um teste de navegador com sessão real.
- Nenhuma tabela permanente foi migrada e não houve homologação em navegador ou produção.

- `npm.cmd test`: inclui testes de validação, scrypt, autorização, limites, cookies, CSRF e formulários. O teste PostgreSQL fica desabilitado por padrão para não exigir banco em toda execução.
- `npx.cmd tsc --noEmit` e `npm.cmd run build` validam tipos e bundles.
- Teste real de PostgreSQL, separado e opt-in:

  ```powershell
  $env:AUTH_TEST_POSTGRES='1'
  npx.cmd vitest run src/test/auth-postgres.test.ts
  Remove-Item Env:AUTH_TEST_POSTGRES
  ```

  Este teste carrega a configuração existente sem imprimi-la. Usa conexão real, transação, tabelas temporárias e rollback. Não aplica a migração em tabelas permanentes. Verifica cadastro, unicidade/e-mail normalizado, senha com hash, token com hash, login válido/inválido, rotação, leitura da sessão por nova instância do serviço, expiração, logout, bloqueio anônimo e limite persistido. A nova instância compartilha a conexão; isso não comprova persistência após reiniciar o PostgreSQL/processo, nem cookies no navegador.

## Roteiro obrigatório no navegador (pendente)

Após aplicar a migração permanente revisada e iniciar `npm.cmd run dev`:

1. Em janela anônima, abra `/conta`: deve redirecionar para `/entrar`. Catálogo, comparação, globo e Mars AI devem continuar acessíveis.
2. Abra `/cadastro`, tente nome/e-mail inválidos e senha curta; depois crie conta com e-mail de teste e senha longa. Deve abrir `/conta` e exibir nome no cabeçalho, inclusive no menu móvel.
3. Atualize a página, navegue, feche/reabra o navegador dentro da validade; confirme sessão. Reinicie o servidor e o PostgreSQL e confirme a persistência em tabelas permanentes.
4. Inspecione cookie em DevTools: HttpOnly, SameSite=Lax, Path=/, validade; em HTTPS/produção, Secure e prefixo __Host-. Confirme ausência de credenciais nas respostas e localStorage.
5. Clique Sair: cookie removido, sessão revogada, `/conta` bloqueada. Tente login com senha errada e conta inexistente: mesmo erro. Entre com conta válida e e-mail em maiúsculas: deve funcionar.
6. Tente cadastro duplicado variando maiúsculas/espaços; não deve criar segundo usuário. Faça mais de 10 tentativas para um e-mail de teste; confirme bloqueio e liberação após 15 minutos. Use contas de teste para evitar bloquear o próprio acesso.
7. Em ambiente de teste, expire uma sessão pelo banco e confirme recusa imediata em `/conta`. Tente POST com Origin ausente/externo e confirme rejeição sem alterar dados.

Pendentes: fluxo completo em navegador, persistência em tabelas permanentes após reinícios, validação HTTPS/cookies atrás do proxy de produção e comportamento no runtime final. Não considerar a entrega homologada apenas pelos testes automatizados.

## Arquivos desta etapa

`migrations/20261111_001_auth.sql`; `src/data/auth.ts`; `src/server/auth-password.ts`, `auth-service.ts`, `auth.ts`; `src/functions/auth.ts`; `src/components/auth/AuthForm.tsx`, `AuthControls.tsx`; `src/components/site/Header.tsx`; `src/routes/entrar.tsx`, `cadastro.tsx`, `conta.tsx`; `src/routeTree.gen.ts` (gerado pelo TanStack); `src/test/auth.test.ts`, `auth-http.test.ts`, `auth-form.test.tsx`, `auth-postgres.test.ts`, `setup.ts` (setup compatível com testes Node); este documento.

Não incluídos: confirmação de e-mail, recuperação de senha, MFA, revogação de todos os dispositivos e reservas.
