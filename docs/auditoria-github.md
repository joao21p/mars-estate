# Auditoria para publicação no GitHub

Data: **12/11/2026**. Branch conferida: **feature/autenticacao**. Resultado: nenhum segredo ou dado privado identificado nos arquivos propostos para commit, no índice ou no histórico local examinado. Não foram executados `git add`, commit, push, merge, fetch, rebase ou alterações de histórico. Nenhum banco foi acessado por esta auditoria; `.env` foi somente lido em memória, sem impressão de valores.

## Alcance e evidências

- Varredura de todos os arquivos rastreados e não rastreados elegíveis para Git, incluindo todos os modificados/novos: texto e bytes de assets, com inventário e SHA-256 por arquivo alterado.
- O conteúdo armazenado no índice também é lido diretamente por `git cat-file`, independentemente do arquivo atual e de `.gitignore`. Não há arquivos privados rastreados nem conflitos de merge.
- Histórico: **5 commits**, **363 objetos alcançáveis**, **271 blobs** e **216 caminhos históricos distintos**, alcançados pelas **12 referências locais** existentes na execução. Repositório não shallow. Foram incluídas branches locais, `origin/main` local e referências de checkpoints/capturas existentes. Mensagens de commits/tags também entram na busca por segredos.
- Nenhum match de valores privados conhecidos, chaves Gemini, tokens GitHub/Slack/AWS, chaves privadas, JWTs, URLs de banco com senha ou atribuições literais de credenciais de alta confiança. Nenhum caminho de `.env`, export ou backup encontrado nos trees históricos examinados.
- Auditoria de publicação também aprovada: conteúdo público e bundles de servidor verificados; sem credenciais conhecidas ou identificadores de implementação privada no cliente.
- `.env.example` revisado e validado: campos de conexão, senha, chave Gemini e CA vazios; origem fictícia no domínio `.invalid`. Valores não secretos, como porta, TLS e limite do Pool, são configurações de exemplo.
- Configurações Nitro/Vercel, package-lock, aliases/SSR e as duas migrações SQL foram preservados. Migrações são DDL, não dumps de usuários ou reservas.
- Testes e fixtures contêm contas, senhas, tokens e identificadores construídos para testes, sem export de contas reais. O alerta de CPF/telefone em `mars-ai-conversation.test.ts` é uma entrada sintética usada para testar sua remoção antes do Gemini. Um endereço de teste em domínio arbitrário foi substituído por `.test` em `auth.test.ts`.
- Assets de marca não contêm os segredos conhecidos; os três PNGs novos foram verificados quanto a chunks textuais/EXIF, ausentes. A imagem social foi conferida visualmente. Não houve OCR ou análise de esteganografia.

As evidências detalhadas ficam em **`exports/github-audit-2026-11-12/report.json`**, ignorado pelo Git. Ele registra paths, tamanhos, hashes, escopo e achados, sem linhas ou valores de credenciais. O resultado vale para a árvore auditada; qualquer alteração posterior exige nova revisão.

**Limites do histórico:** não houve fetch. Não foram examinados reflogs, objetos órfãos/inacessíveis, clones externos, forks ou referências remotas ausentes deste checkout. Identidades de autor/committer são metadados normais do Git e não foram tratadas como registros de usuários da aplicação. Não se afirma ausência de segredos no histórico remoto inteiro. A busca usa padrões e valores privados atualmente conhecidos no `.env`, com comparação literal de valores a partir de seis caracteres; valores antigos desconhecidos ou formatos não reconhecidos podem escapar. Não é uma auditoria de CVEs de dependências nem um pentest completo.

## Exclusões e alterações desta auditoria

`.gitignore` e `.vercelignore` protegem `.env*` (exceto `.env.example`), `exports/`, backups, dumps e chaves/certificados privados. Foram acrescentados `backup/`, `.bak`, `.dmp`, `.pgdump`, `.dump.gz`, `.backup.gz` e `.pg_service.conf`. As regras para build artifacts e para o diretório `.vercel` continuam válidas. `migrations/*.sql` continua elegível para Git; os arquivos não são necessários dentro do bundle em execução, pois não há migração no startup.

Foi conferido explicitamente que `.env` e `exports/neon-public-2026-11-12/` não estão rastreados. As regras para `.env.local` e outros exemplos de nomes de dumps/backups também foram testadas sem criar esses arquivos. `.gitignore` não remove arquivos já rastreados; por isso o índice e o histórico foram examinados separadamente. Um `git add -f` ainda pode contornar exclusões: não o utilize para arquivos privados.

Arquivos acrescentados por esta auditoria: `scripts/audit-github.mjs`, este relatório e `docs/arquivos-para-commit.txt`; script `audit:github` em `package.json`. O auditor usa operações Git somente leitura e salva evidências em `exports/`. A única alteração em teste é o domínio fictício do e-mail. Nenhuma regra de autenticação, reserva ou Gemini foi modificada.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `npm.cmd test` | 105 passaram, 4 ignorados; 15 arquivos executados, 3 ignorados. Flags de PostgreSQL/Gemini opt-in desabilitadas. |
| `npx.cmd tsc --noEmit` | Aprovado. |
| `npm.cmd run build` | Aprovado; preset Nitro `vercel`, função Node 24. Sem deploy. |
| `npm.cmd run audit:publication` | Aprovado para fontes e bundles presentes. |
| `npm.cmd run audit:github` | Sem matches de segredos ou arquivos privados rastreados no escopo descrito. O alerta de PII sintética foi revisado manualmente. |
| `git diff --check` | Código **0**, sem erros de whitespace. |

O build precisou do mesmo acesso autorizado fora do sandbox Windows já usado anteriormente, pois o tracer Nitro resolve caminhos ancestrais. Não houve patch para contornar erros. Os avisos existentes de chunk grande do globo e `vite-tsconfig-paths` permanecem.

**LF/CRLF:** `core.autocrlf=true` está ativo. As mensagens “LF will be replaced by CRLF” avisam sobre conversão futura de finais de linha; não indicam credenciais, falha de teste ou whitespace inválido. No PowerShell, stderr de um programa nativo pode aparecer como `NativeCommandError` na captura de log mesmo com exit code 0. A decisão foi tomada pelo exit code e pelo conteúdo de `git diff --check`. Não foi alterada a configuração global de Git nem feita renormalização em massa. Arquivos novos foram adicionalmente conferidos por comparação `--no-index` com arquivo vazio, pois `git diff --check` sozinho não cobre untracked.

## Arquivos seguros para o commit

A lista exata está em **[arquivos-para-commit.txt](arquivos-para-commit.txt)**. Inclui os arquivos modificados e novos auditados: `.env.example`, exclusões, README/docs, package/lockfile, configurações Nitro/Vercel/Vite/TypeScript, migrações, scripts, assets de marca, componentes, rotas, server functions, módulos de servidor, tipos e testes/fixtures. Os demais arquivos já versionados não precisam ser adicionados novamente.

Não adicionar `.env`, `.env.local`, `.vercel/`, `.output/`, `exports/`, dumps, backups, certificados/chaves privados ou logs. A lista contém paths de arquivos, não diretórios amplos. Ela evita também que o PowerShell interprete o `$id` no nome de uma rota.

Scripts de integração são código seguro para versionar, mas alguns criam/removem schemas descartáveis ou fazem requisições de escrita se executados manualmente. Não os rode contra o Neon de produção. Nenhum deles foi executado nesta auditoria.

## Comandos recomendados — não executados

Execute na raiz do projeto. Estes passos publicam somente a branch; não há `--force`, merge, rebase ou amend.

```powershell
# Conferir a branch: deve mostrar feature/autenticacao.
git branch --show-current
git status --short

# Repetir a auditoria antes de adicionar arquivos.
npm.cmd run audit:github
if ($LASTEXITCODE -ne 0) { throw 'Auditoria encontrou um bloqueio. Pare e revise.' }
npm.cmd run audit:publication
if ($LASTEXITCODE -ne 0) { throw 'Auditoria de publicação falhou. Pare e revise.' }
Get-Content docs/arquivos-para-commit.txt

# Somente após revisar a lista: adicionar os paths exatos auditados.
git --literal-pathspecs add --pathspec-from-file=docs/arquivos-para-commit.txt
if ($LASTEXITCODE -ne 0) { throw 'Falha no git add. Revise antes de continuar.' }

# Verificar também os blobs realmente adicionados ao índice.
npm.cmd run audit:github
if ($LASTEXITCODE -ne 0) { throw 'Auditoria do índice falhou. Não commitar.' }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Há erros de whitespace no índice.' }
git diff --cached --name-only
git diff --cached --stat
git diff --cached

# Após revisar o diff completo:
git commit -m "feat: integrar autenticação, reservas, Mars AI e preparação Vercel"
if ($LASTEXITCODE -ne 0) { throw 'Commit falhou. Não enviar.' }
git show --stat --oneline HEAD
git push --set-upstream origin feature/autenticacao
```

Antes de enviar, confira que `origin` é o repositório GitHub pretendido nas configurações locais; não publique URLs de remote que incluam credenciais. Não use `git push --all` ou `--mirror`, pois existem referências internas locais que não fazem parte da publicação desta branch. Se a árvore mudar, repita a auditoria e atualize a lista de paths; a lista não aprova automaticamente conteúdo futuro com o mesmo nome.

## Riscos restantes

**Nenhum bloqueio identificado para publicar o código auditado no GitHub.** Isso não homologa a aplicação em produção. A limitação Gemini continua por processo, sem cota global entre instâncias; revisão de logs em runtime, HTTPS/CSRF/cookies, permissões e TLS do Neon e controle de custo devem ser validados antes de abrir o serviço público. Os documentos anteriores contêm resultados históricos datados; os resultados atuais desta auditoria estão acima.

Se aparecer credencial em uma futura varredura: pare antes de commitar/enviar, remova a credencial do conteúdo elegível e revogue/rotacione-a pelo procedimento apropriado. Não reescreva o histórico publicado conectado ao Lovable como parte desta preparação.
