# Reservas fictícias — Mars Estate

Implementação local em 11/11/2026. **Homologação visual pendente:** a automação de navegador foi interrompida porque não conseguiu determinar a URL atual do Chrome com confiança. Não considerar esta entrega homologada em navegador ou produção. Nenhuma migração foi aplicada ao schema permanente; nenhum `.env`, credencial, commit, push ou merge foi alterado/criado.

## Inspeção e decisões

- O PostgreSQL real tem `plots.id varchar(50)`, `plots.status varchar(20)` com valores `disponivel`, `reservado`, `vendido`; `auth_users.id uuid`; `auth_sessions.user_id uuid`. Há nove terrenos e dois deles já têm status `reservado`; um é `vendido`. Esses dados foram preservados.
- Detalhes: `src/routes/terrenos.$id.tsx`; catálogo em `src/functions/terrenos.ts`; modal anterior em `InteresseDialog.tsx`; autenticação em `AuthForm`, `AuthControls`, `src/functions/auth.ts` e `src/server/auth*.ts`.
- A autenticação existente valida hash SHA-256 de token aleatório em `auth_sessions`, prazo da sessão e usuário no banco. Cookies HttpOnly/SameSite, middleware CSRF e checagem estrita de Origin foram reutilizados. Não foi reimplementada a autenticação.
- “Minhas reservas” fica no cabeçalho autenticado, menu móvel, página `/conta` e link após sucesso. `/minhas-reservas` exige sessão no servidor, inclusive via chamada direta à server function.
- O relato da segunda conta **não foi reproduzido no serviço nem no teste HTTP real**. Duas contas novas foram cadastradas; logout/login e alternância confirmaram identidades e reservas corretas. Isso não comprova o estado das contas previamente cadastradas ou o preenchimento automático no navegador do usuário. Nenhum usuário/senha existente foi alterado. O login agora invalida loaders e as páginas privadas descartam cache para evitar dados antigos ao alternar contas.

## Banco e atomicidade

Migração versionada completa: `migrations/20261111_002_reservations.sql`, após a migração de autenticação existente. O SQL abaixo é o conteúdo integral:

```sql
-- Additive; apply explicitly after 20261111_001_auth.sql. Never run at startup.
BEGIN;
CREATE TABLE plot_reservations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE RESTRICT,
  plot_id varchar(50) NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
  status varchar(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT reservation_cancellation_check CHECK (
    (status = 'active' AND cancelled_at IS NULL) OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_at >= created_at)
  )
);
CREATE UNIQUE INDEX plot_reservations_active_plot_idx
  ON plot_reservations(plot_id) WHERE status = 'active';
CREATE INDEX plot_reservations_user_created_idx
  ON plot_reservations(user_id, created_at DESC, id);
COMMIT;
```

Reserva: identifica o usuário pelo token validado, contabiliza limite persistente e inicia transação. Revalida e bloqueia a sessão com `FOR SHARE`, bloqueia o terreno com `FOR UPDATE`, exige seu status original `disponivel`, verifica reservas ativas e insere. A transação faz commit ou rollback; o índice único parcial protege inclusive inserções concorrentes que não sigam o protocolo da aplicação. A sessão bloqueada impede que um logout concorrente seja concluído no meio dessa operação.

Cancelamento: atualização transacional condicionada a `id`, usuário da sessão e status `active`. Outro usuário recebe erro genérico, sem acesso à reserva. Histórico permanece com status `cancelled` e data; não há exclusão da reserva.

Disponibilidade é derivada: status original disponível + reserva ativa → `reservado`; demais status originais são preservados. Cancelar elimina essa sobreposição e o terreno volta ao status original. Isso evita liberar reservas preexistentes ou terrenos vendidos e não modifica `plots`, regiões, imagens ou características. Catálogo, detalhes, consulta de teste do banco e consulta pública do Mars AI usam a mesma regra. A mudança no Mars AI se limita a essa expressão SQL; modelo, prompts, limites e comportamento do assistente permanecem iguais. Nenhuma reserva expira automaticamente.

## Segurança e comportamento

- O cliente envia somente o identificador do terreno ou reserva. UUID da reserva é validado; slug do terreno respeita até 50 caracteres. Objetos com `user_id`, SQL injetado e identificadores inválidos são recusados. SQL sempre parametrizado.
- POST exige Origin correto e não aceita `Sec-Fetch-Site: cross-site`, além do middleware CSRF existente. O cookie não é exposto ao JavaScript.
- Limite compartilhado em `auth_rate_limits`: 30 solicitações de criação/cancelamento por conta a cada 15 minutos, incluindo falhas. Prefixo de hash próprio evita misturar com login/cadastro. Limite de criação de contas existente permanece. Limites adicionais no proxy/rede podem ser necessários sob carga; não há novo limitador por IP.
- Reservas e autenticação usam `Cache-Control: no-store`; consultas principais do catálogo também. Mutações invalidam os loaders; retorno ao login só aceita `/minhas-reservas` ou `/terrenos/<slug válido>` e usa `/conta` como destino padrão. Cadastro preserva o retorno. URLs externas, codificadas, com query ou barra invertida são recusadas.
- A tela pede confirmação com o nome do terreno e mostra sucesso somente depois da resposta do servidor. Se houver erro de rede após commit, orienta consultar Minhas reservas antes de repetir. Duplicidade continua bloqueada no banco.
- “Tenho interesse” permanece demonstrativo, com apenas uma mensagem opcional de exemplo. Não solicita nome/e-mail, não cria conta, não envia nem persiste informação. O texto e o botão explicitam isso.
- Nenhuma cobrança, título ou direito de propriedade real sobre Marte. A reserva fictícia é persistente apenas dentro da simulação.

## Aplicação manual no ambiente permanente

1. Faça backup e confirme o banco/schema de destino. Revise o SQL e confirme que `auth_users`, `auth_sessions`, `auth_rate_limits` e `plots` têm os tipos inspecionados. Use um papel de migração autorizado. A aplicação precisa de SELECT nas tabelas relacionadas e INSERT/UPDATE em reservas e limites; não precisa de DDL em execução.
2. Pare o servidor de desenvolvimento de teste e remova qualquer `PGOPTIONS` de teste da sessão de execução. Não altere seu `.env` nem copie os dados de autenticação para um ambiente público.
3. No pgAdmin, conectado ao banco correto e com schema de destino selecionado, execute o arquivo completo. Alternativa (nomes fictícios; senha solicitada pelo psql):

   ```powershell
   psql -h localhost -U SEU_USUARIO -d SEU_BANCO -v ON_ERROR_STOP=1 -f migrations/20261111_002_reservations.sql
   ```

4. Execute uma única vez e registre a versão no processo de implantação. A migração deliberadamente falha se a tabela já existir, evitando tratar uma estrutura divergente como válida. Se houver falha, a transação impede aplicação parcial.
5. Confira as FKs, o índice único parcial e os índices; inicie o app atualizado. **A migração é necessária para habilitar reservas.** Após a correção de carregamento descrita abaixo, o catálogo funciona antes dela usando os status existentes em `plots`; quando a tabela passa a existir, a próxima consulta inclui reservas ativas. Não há criação automática em startup nem reserva local fictícia.

## Testes reproduzíveis

Sem escrever no banco permanente:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build

$env:AUTH_TEST_POSTGRES='1'
$env:RESERVATIONS_TEST_POSTGRES='1'
npx.cmd vitest run src/test/auth-postgres.test.ts src/test/reservations-postgres.test.ts
Remove-Item Env:AUTH_TEST_POSTGRES
Remove-Item Env:RESERVATIONS_TEST_POSTGRES
```

O teste de autenticação usa tabelas temporárias e rollback. O teste de reservas cria um schema exclusivo `mars_reservation_test_<timestamp>`, copia somente terrenos públicos, aplica as duas migrações **nesse schema**, cria duas contas de teste e usa conexões separadas para disputar o mesmo terreno. Remove exclusivamente esse schema no `finally`. Exige PostgreSQL acessível e privilégio CREATE SCHEMA; os testes opt-in ficam ignorados na suíte padrão. Não execute com contas reais.

Preview isolado e teste HTTP real, usando a configuração já existente sem imprimi-la:

```powershell
node scripts/reservation-test-schema.mjs create mars_reservation_test_browser_20261111
$env:PGOPTIONS='-c search_path=mars_reservation_test_browser_20261111'
npm.cmd run dev -- --host 127.0.0.1 --port 3012
```

Em outra sessão no mesmo checkout:

```powershell
node scripts/reservation-http-smoke.mjs mars_reservation_test_browser_20261111
```

Esse script cria um terreno marcador só no schema isolado e verifica que o servidor o enxerga **antes de cadastrar contas**, evitando executar as escritas HTTP se o preview usar o schema permanente. Usa o protocolo RPC do TanStack com cookies em memória, sem imprimir tokens/senhas. Não é automação de navegador. Recrie o schema antes de repetir o smoke: ele conserva o histórico de teste até a limpeza.

Depois de parar o servidor com Ctrl+C, remova a variável apenas da sessão e apague somente o schema de teste criado:

```powershell
Remove-Item Env:PGOPTIONS
node scripts/reservation-test-schema.mjs drop mars_reservation_test_browser_20261111
```

O helper só aceita o prefixo restrito `mars_reservation_test_...`; nunca recebe o nome de um schema existente do usuário. Não use para dados que deseja preservar.

## Evidência e falhas

- Testes novos de fronteira HTTP/CSRF e formulário: **8 passaram**; com os três testes de formulário da autenticação, **11 passaram** na execução focada.
- PostgreSQL real: **2 testes de integração passaram**, cobrindo a autenticação existente e as reservas. Reserva válida, anônimo, identificador inválido, falsificação de usuário, terreno inexistente/vendido/reservado, duas contas, concorrência (um único vencedor), índice único, isolamento por proprietário, cancelamento, nova reserva após cancelamento e limite persistente.
- Smoke HTTP com PostgreSQL real: passou; páginas públicas 200 e reservas privadas anônimas 307 para login; duas contas cadastradas, logout/login alternados, criação/listagem/cancelamento, duplicidade e vendido recusados; disponibilidade no HTML renderizado mudou corretamente após reservar/cancelar. Não comprova hidratação, cliques ou layout visual.
- Suíte completa: **73 passaram, 2 falharam, 2 ignorados** (integrações opt-in). As duas falhas preexistentes em `src/test/mars-ai-provider.test.ts` foram preservadas e reproduzidas antes e depois da implementação: “usa chave do servidor, modelo inicial, JSON, timeout e uma única tentativa” espera `ok: true`, recebe false; “respeita GEMINI_MODEL e descarta resposta bloqueada/truncada” acessa uma chamada inexistente de `gerar` (`TypeError`, índice 0). O mock existente não fornece `ThinkingLevel`; expectativas de modelo/timeout/configuração também divergem do gateway atual. Nenhuma correção no gateway/teste Gemini foi incluída nesta etapa.
- `npx.cmd tsc --noEmit`: passou. `npm.cmd run build`: passou. Avisos existentes: vite-tsconfig-paths redundante, `.inputValidator()` antigo em terrenos e bundle do globo acima de 500 kB. Novas server functions usam `.validator()`.
- Durante a preparação, a cópia de colunas identity no helper exigiu `OVERRIDING SYSTEM VALUE`; foi corrigida e o schema recriado. A primeira tentativa do smoke usava um helper RPC fora do contexto Start e depois um Content-Type JSON sem corpo no logout; o harness foi corrigido e o fluxo real passou. Não foram defeitos observados da autenticação.
- Navegador: acesso por extensão indisponível; tentativa de Chrome nativo interrompida por verificação da URL. **Não houve homologação visual.** Responsividade, foco, teclado, hidratação, histórico entre contas, persistência após reiniciar servidor/banco e HTTPS/proxy permanecem para homologação. Disponibilidade não recebe push em abas já abertas: atualize/navegue para consultar novamente; o servidor sempre revalida ao confirmar.
- Limpeza desta execução: o servidor de preview foi encerrado e o schema descartável `mars_reservation_test_browser_20261111` foi removido. Os schemas gerados pelos testes de integração também foram removidos pelos próprios testes. As tabelas permanentes não foram migradas.

## Roteiro de homologação no navegador

Use primeiro o preview com schema isolado descrito acima, em `http://127.0.0.1:3012`. Crie contas descartáveis com e-mails diferentes e senha de 12 a 128 caracteres; não use credenciais reais.

1. Sem sessão, abra `/minhas-reservas`: login com retorno para a lista. Abra um terreno disponível e clique “Reservar terreno”: login com retorno para esse terreno. Teste também cadastro a partir do login; o retorno deve ser mantido. Tente `returnTo=https://example.org` e `returnTo=//example.org`: deve permanecer no app, destino `/conta`.
2. Cadastre a conta A, confirme nome/e-mail em `/conta`. Reserve um terreno disponível, confirme o nome e o aviso de simulação; sucesso apenas após a resposta. Verifique status reservado no detalhe, catálogo, comparação e recomendações do Mars AI quando o terreno aparecer. Não deve haver pedido de pagamento.
3. Abra Minhas reservas: nome, data em São Paulo, status ativo, link e cancelamento. Atualize a página; dados devem persistir. Se a rede falhar, consulte essa lista antes de tentar novamente.
4. Saia, cadastre a conta B e verifique identidade no cabeçalho/conta. Minhas reservas deve estar vazia. O terreno de A permanece indisponível para B. Tente entrar com senha incorreta: erro, sem trocar a sessão. Faça logout e login alternando A → B → A; confirme que não aparecem reservas da outra conta, inclusive ao voltar/avançar e atualizar.
5. Como A, cancele sua reserva pelo diálogo. Deve ficar cancelada com data, e o terreno deve voltar a disponível. B pode então reservá-lo; histórico cancelado de A permanece. Terrenos originalmente vendidos ou reservados devem continuar indisponíveis.
6. Em duas sessões separadas, tente reservar simultaneamente outro terreno disponível: uma única confirmação; a outra recebe indisponibilidade. O teste PostgreSQL já verifica essa disputa com conexões concorrentes.
7. Abra “Tenho interesse”: deve mostrar somente mensagem de exemplo, aviso de que não envia e botão de simulação. Confirmar não pode criar conta, reserva nem linha no banco.
8. Teste 375, 768 e 1280 px; menu móvel inclui Minhas reservas quando autenticado. Percorra botões, links e diálogos com Tab/Shift+Tab, Enter e Escape; confira foco e leitura dos alertas. O menu recolhido passa a valer até 1023 px para acomodar os controles autenticados.
9. No ambiente de homologação, teste sessão expirada, POST de origem externa, limite de 30 mutações e acesso direto às funções com outra sessão. Confirme ausência de tokens nos dados retornados e que somente o dono pode cancelar/listar suas reservas. Não esgote limites das contas reais.
10. Reinicie servidor e PostgreSQL no ambiente de teste e confirme a persistência. Em HTTPS/produção, valide `AUTH_ORIGIN` já previsto pela autenticação, cookies Secure/HttpOnly/SameSite, proxy e ausência de cache em respostas privadas.

## Arquivos desta etapa

Novos:

- `migrations/20261111_002_reservations.sql`.
- `src/data/reservations.ts`; `src/server/reservation-service.ts`; `src/server/reservations.ts`; `src/functions/reservations.ts`.
- `src/components/site/ReservationDialog.tsx`; `src/routes/minhas-reservas.tsx`.
- `src/test/reservations-postgres.test.ts`; `src/test/reservations-http.test.ts`; `src/test/reservations-form.test.tsx`.
- `scripts/inspect-reservations.mjs` (inspeção somente leitura); `scripts/reservation-test-schema.mjs`; `scripts/reservation-http-smoke.mjs`.
- `docs/reservas.md`.

Alterados nesta etapa, preservando o trabalho que já estava no checkout:

- `src/functions/terrenos.ts`; `src/server/terrenos.ts`; `src/server/mars-ai-catalog.ts`: status efetivo de reserva; no-store nas consultas principais.
- `src/routes/terrenos.$id.tsx`: botão de reserva.
- `src/components/site/InteresseDialog.tsx`: demonstração inequívoca sem dados de cadastro.
- `src/components/auth/AuthForm.tsx`; `AuthControls.tsx`; `src/functions/auth.ts`; `src/routes/entrar.tsx`; `cadastro.tsx`; `conta.tsx`: retorno validado, invalidação de cache e acesso à lista.
- `src/components/site/Header.tsx`: breakpoint do menu para acomodar controles autenticados.
- `src/routeTree.gen.ts`: regenerado pelo TanStack, inclui a nova rota.
- `src/test/auth-form.test.tsx`: mock do router para a invalidação após login.

Os demais arquivos modificados/untracked que já existiam na primeira inspeção não foram revertidos nem incluídos como alterações desta etapa. Não há mudança no globo, cobrança ou migração automática.

## Correção do carregamento sem a migração — 11/11/2026

Causa reproduzida no banco permanente, sem executar migração: o catálogo e seus loaders passaram a referenciar `plot_reservations` incondicionalmente. Como a tabela ainda não existia, a home, o catálogo e os detalhes retornavam HTTP 500. A exceção original retornada pelo servidor era `relação "plot_reservations" não existe`; a consulta direta no PostgreSQL confirmou SQLSTATE **42P01**, rotina `parserOpenTable`. A inspeção de metadados retornou `current_schema = public` e `to_regclass('plot_reservations') = NULL`.

O terminal do servidor de desenvolvimento mostrava o aviso de depreciação de `.inputValidator()`. A exceção do loader foi capturada na resposta SSR/RPC real, pois o TanStack a serializava em vez de imprimir a pilha nesse terminal. O aviso não é a causa SQL: o erro foi reproduzido executando a expressão de disponibilidade diretamente no PostgreSQL, sem TanStack ou validador.

Correção:

- `src/server/reservation-schema.ts` consulta `to_regclass` no search_path da conexão. Quando a ausência é confirmada, o SQL de catálogo usa somente `p.status`; quando a tabela existe, usa a expressão original de reservas ativas. As duas expressões são constantes do servidor, sem interpolação de entradas do usuário. Não há cache negativo ou DDL automático.
- `src/functions/terrenos.ts`, `src/server/terrenos.ts` e `src/server/mars-ai-catalog.ts` compartilham essa verificação. Os loaders, globo e comparação continuam recebendo os mesmos dados reais. A troca de `.inputValidator()` por `.validator()` foi feita apenas no arquivo de terrenos que já precisava ser corrigido; remove o aviso, mas não é a correção causal.
- `src/server/reservation-service.ts` verifica a tabela depois de autenticar e antes de listar, contabilizar tentativas ou gravar. Sem migração, retorna erro de reservas não habilitadas. Não retorna sucesso nem cria reservas simuladas em memória.
- `src/routes/minhas-reservas.tsx` mostra indisponibilidade e link ao catálogo em caso de erro de carregamento, preservando a proteção/redirect de autenticação do servidor.
- Erros de conexão, permissão, metadados inválidos, outras tabelas ausentes ou estrutura incorreta não são convertidos em um catálogo vazio nem mascarados por catch genérico de SQL. A ausência da tabela de reservas é o único caso de compatibilidade tratado.

Validação desta correção:

- Antes: `/`, `/terrenos` e `/terrenos/borda-de-jezero` responderam 500, com a exceção de tabela ausente na resposta real.
- Depois, ainda sem migrar o banco permanente: `/`, `/terrenos`, detalhes disponível/vendido, URL de comparação, `/como-funciona`, `/entrar` e `/cadastro` responderam 200. A RPC retornou nove terrenos reais, preservando seis disponíveis, dois reservados e um vendido. `/conta` e `/minhas-reservas` sem sessão mantiveram 307 para login.
- `npm.cmd test`: **103 passaram, 4 ignorados**, sem falhas. Os ignorados são integrações opt-in; os testes Gemini atuais passaram.
- Execução focada com `RESERVATIONS_TEST_POSTGRES=1`: **5 passaram**, incluindo dois cenários reais de PostgreSQL. O teste transacional temporário cobre status antes/depois da criação da tabela e após cancelamento. O teste de serviço cria duas contas somente no schema descartável e confirma bloqueio antes da migração, ativação após aplicá-la nesse schema, concorrência, propriedade e cancelamento. Nenhum dado de usuário permanente foi usado/alterado.
- `npx.cmd tsc --noEmit` e `npm.cmd run build`: passaram. Não há mais aviso de inputValidator em terrenos; continuam os avisos existentes de tsconfig paths redundante e bundle grande do globo.
- Não houve teste visual em navegador nesta correção. A evidência de carregamento é HTTP/SSR/RPC real; comportamento interativo e layout exigem homologação em navegador.

Arquivos de teste desta correção: novo `src/test/reservation-schema.test.ts`; alterações em `src/test/reservations-postgres.test.ts` e `src/test/mars-ai-catalog.test.ts`. Documentação atualizada aqui e no trecho de disponibilidade de `docs/mars-ai.md`. Os demais arquivos citados acima são os arquivos de implementação alterados nesta correção.

Para habilitar reservas no banco permanente: faça backup, confirme banco/schema e pré-requisitos da migração de autenticação, revise o arquivo `migrations/20261111_002_reservations.sql` e execute-o manualmente pelo pgAdmin ou pelo comando psql já apresentado neste documento. Execute uma única vez com erro interrompendo a aplicação (`ON_ERROR_STOP=1`); o arquivo usa transação. Confira FKs/índices e teste reserva/cancelamento. A detecção ocorre na próxima consulta, sem reiniciar para limpar cache. **Essa aplicação permanente continua pendente e não foi executada pelo agente.**

Não houve exclusão de dados existentes, alteração de `.env`/credenciais, commit, push ou merge.
