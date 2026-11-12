# Identidade visual — Mars Estate

Acabamento local em 11/11/2026, sem reconstrução de frontend ou hospedagem. Mantidos o fundo escuro, cobre, tipografia existente, catálogo, globo 3D, comparação, Mars AI, autenticação e reservas. Nenhuma alteração de banco, migração, `.env`, credencial ou dependência nesta etapa. Sem commit, push ou merge.

## Marca e arquivos gráficos

Símbolo original desenhado em código: planeta em cobre, duas marcas de relevo e uma órbita inclinada, com fundo `#111014`. O anel é um recurso gráfico da identidade, não uma afirmação científica de que Marte possui anéis. O mesmo desenho aparece no cabeçalho, no rodapé e nos ícones.

| Arquivo | Uso |
| --- | --- |
| `public/favicon.svg` | Ícone vetorial principal, viewBox 64×64, sem recursos externos |
| `public/favicon.ico` | Fallback ICO com entradas DIB de 16, 32 e 48 px |
| `public/favicon-32x32.png` | Fallback PNG de 32×32 px |
| `public/apple-touch-icon.png` | Ícone de 180×180 px para atalhos Apple |
| `public/social/mars-estate.png` | Open Graph e Twitter, PNG de 1200×630 px |
| `public/social/mars-estate.svg` | Fonte vetorial editável da capa social |

A capa usa geometria e tipografia, com o título “Explore o impossível” e identificação explícita de projeto fictício de portfólio. Não utiliza fotografias do catálogo, imagens de terceiros, marcas NASA/Lovable ou downloads externos. Arial é usada na rasterização a partir da fonte já instalada no Windows; nenhum arquivo de fonte é redistribuído. A tipografia do site (Syne/Manrope) permanece como estava, incluindo suas referências Google Fonts.

`scripts/build-brand-assets.ps1` contém a fonte do desenho e gera todos os arquivos com System.Drawing, disponível no Windows. O script é UTF-8 com BOM para preservar acentos no Windows PowerShell. Revisão e execução local, sem alterar política global:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-brand-assets.ps1
```

A exceção de execução vale somente para esse processo. Nesta sessão, a primeira tentativa direta do `.ps1` foi bloqueada pela política do Windows; a execução do comando acima foi autorizada antes de gerar os arquivos. Não houve alteração persistente das configurações do sistema. Os SVGs podem também ser editados como texto; para manter PNG/ICO sincronizados, regenere os arquivos a partir do script. A estrutura vetorial e os primitivos da rasterização estão no mesmo gerador. Os arquivos gerados ficam no repositório; `npm run build` não executa PowerShell nem depende de System.Drawing.

O ICO antigo foi substituído no mesmo caminho, inclusive para leitores que solicitam `/favicon.ico` automaticamente. O link explícito usa `?v=mars-estate-1` para renovar o favicon herdado em cache; PNG e SVG têm caminhos novos. Mudanças futuras nessa mesma identidade podem exigir incrementar a versão ou limpar o cache do navegador.

## Títulos e metadados

`src/lib/site-metadata.ts` centraliza título, descrição, Open Graph e Twitter. Home e metadados padrão usam exatamente:

> Mars Estate | Explore o impossível

Descrição:

> Explore Marte em uma plataforma fictícia de portfólio: descubra regiões, compare terrenos e simule reservas. Sem compra ou propriedade real.

Cada página pública principal e os detalhes substituem os títulos/descrições correspondentes em HTML, Open Graph e Twitter, sem deixar a imagem de compartilhamento ausente ou o título da home herdado nas outras páginas. Os detalhes declaram que o terreno é fictício; não usam texto que possa sugerir uma oferta imobiliária real.

| Página | Título |
| --- | --- |
| `/` | Mars Estate \| Explore o impossível |
| `/terrenos` | Explorar terrenos \| Mars Estate |
| `/como-funciona` | Como funciona \| Mars Estate |
| `/sobre` | Sobre o projeto \| Mars Estate |
| `/terrenos/<id>` | Nome do terreno \| Mars Estate |
| `/entrar` | Entrar \| Mars Estate |
| `/cadastro` | Criar conta \| Mars Estate |
| `/conta` | Minha conta \| Mars Estate |
| `/minhas-reservas` | Minhas reservas \| Mars Estate |

Login, cadastro, conta, reservas e páginas técnicas de teste possuem `noindex`. As rotas técnicas continuam funcionando; a mudança é somente nos metadados, sem tratá-las como páginas de portfólio a indexar. `noindex` não é controle de acesso; a proteção de conta/reservas continua nos handlers existentes.

As tags incluem `og:site_name`, `og:locale=pt_BR`, `og:type=website`, títulos, descrições, `og:url`, imagem/alt/tipo/dimensões e `twitter:card=summary_large_image`, título, descrição, imagem e alt. Há `theme-color`, `color-scheme` e `application-name` globais.

O helper usa `createIsomorphicFn`: no SSR, obtém a origem da URL da requisição pelo TanStack Start; no cliente, usa `window.location.origin`. A implementação do servidor é removida do bundle do navegador, como verificado no build. Imagens usam URLs absolutas da origem atual; `og:url` identifica o caminho da página e não inclui filtros, comparação ou parâmetros de retorno ao login. Não há domínio de produção, usuário Twitter, nome de autor ou links de portfólio inventados. Não foi configurado um canonical fixo antes de conhecer o domínio real.

Antes da publicação, conferir se o proxy entrega ao SSR a URL HTTPS pública correta. Caso contrário, configurar a origem pública no processo de hospedagem escolhido; isso não foi implementado nesta tarefa. Até existir um endereço público acessível aos crawlers, não é possível validar o card nas plataformas sociais.

## Rodapé e referências Lovable

O rodapé apresenta a proposta “Ciência, design e tecnologia em um projeto demonstrativo de portfólio” e explicita que o mercado é imaginário: sem cobrança, compra ou direito de propriedade sobre Marte. Navegação e avisos de simulação foram preservados. Não foi atribuído o projeto a uma pessoa/empresa sem informação fornecida pelo autor.

Inspeção em `src`, `public`, README, configuração e instruções:

- O favicon binário herdado do projeto inicial foi substituído. Não havia texto “Lovable”, badge Lovable ou metadados textuais “Lovable” nos componentes públicos de cabeçalho/rodapé ou nos títulos e OG existentes. A marca do cabeçalho era um círculo genérico; agora compartilha o símbolo orbital.
- `package.json`, `package-lock.json` e `vite.config.ts` mantêm `@lovable.dev/vite-tanstack-config`, necessário à configuração de build atual. Não foi removida infraestrutura para ocultar a origem do projeto.
- `src/lib/lovable-error-reporting.ts` e sua chamada no root mantêm integração técnica de diagnóstico. Não exibem marca no rodapé; não foram alterados.
- `.lovable/project.json` mantém metadados técnicos do template. README mantém a informação histórica de que o projeto começou no Lovable. `AGENTS.md` mantém as instruções e o aviso sobre sincronização/histórico Git.
- Nenhum arquivo de licença/NOTICE ou atribuição foi removido. As referências e fontes científicas existentes permanecem. A origem Lovable não foi apagada da documentação histórica.

## Validação e limites

- `npm.cmd test`: **103 passaram; 4 integrações opt-in ignoradas**, sem falhas. Nenhuma chamada real ao Gemini ou teste com escrita de banco foi executado nesta etapa.
- `npx.cmd tsc --noEmit`: passou.
- `npm.cmd run build`: passou. Permanecem os avisos existentes de vite-tsconfig-paths redundante e bundle grande do globo.
- `node scripts/verify-brand.mjs http://127.0.0.1:3016`: passou contra o servidor de desenvolvimento, após o build. Confere sete páginas em duas requisições de documento independentes cada, título único, metadados únicos, substituição por página, URLs absolutas, imagem, dimensões, ícones, rodapé e `noindex` em login/cadastro. Essa verificação HTTP não executa JavaScript de navegador.
- O mesmo script compara SHA-256 dos seis arquivos gráficos entre `public/`, `.output/public/` e os bytes realmente servidos. MIME e dimensões PNG/entradas ICO foram verificados. O decoder nativo System.Drawing abriu o ICO com sucesso. A capa PNG e o ícone Apple foram inspecionados visualmente.
- O bundle cliente de metadados contém somente a implementação `window.location.origin`, sem `getRequest` ou dependência de request do servidor.
- **Limitação do preview de produção existente:** `npm.cmd run preview -- --host 127.0.0.1 --port 3017` iniciou, mas retornou 500 porque o plugin TanStack tenta importar `dist/server/server.js`, que não existe. O build atual do projeto produz `.output/server/index.mjs` com preset Nitro `cloudflare-module`. Esse erro ocorre antes de executar os metadados da aplicação. Não foi alterada configuração de runtime, dependências ou hospedagem para contornar essa divergência. A inicialização do bundle de produção permanece para validação na configuração final de publicação; os assets produzidos foram verificados byte a byte.
- Não houve validação interativa em navegador ou em crawlers sociais. Permanecem pendentes: favicon em abas claras/escuras e cache antigo, fallback em Safari/Edge, atalhos Apple, foco/rodapé em telas de 375/768/1280 px, atualização do head em navegação SPA, páginas privadas com sessão e cards em uma URL pública HTTPS. Os dois servidores locais usados para QA foram encerrados ao fim da tarefa.

Para repetir a checagem local:

```powershell
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1 --port 3016
# Em outro terminal, no mesmo checkout:
node scripts/verify-brand.mjs http://127.0.0.1:3016
```

## Arquivos desta etapa

- Novos: `src/lib/site-metadata.ts`; `scripts/build-brand-assets.ps1`; `scripts/verify-brand.mjs`; `public/favicon.svg`; `public/favicon-32x32.png`; `public/apple-touch-icon.png`; `public/social/mars-estate.svg`; `public/social/mars-estate.png`; `docs/identidade-visual.md`.
- Substituído: `public/favicon.ico`.
- Componentes alterados: `src/components/site/Header.tsx`, `Footer.tsx`.
- Somente metadados/links de head nas rotas: `src/routes/__root.tsx`, `index.tsx`, `terrenos.index.tsx`, `terrenos.$id.tsx`, `como-funciona.tsx`, `sobre.tsx`, `entrar.tsx`, `cadastro.tsx`, `conta.tsx`, `minhas-reservas.tsx`, `teste-banco.tsx`, `teste-regioes.tsx`.

Os demais arquivos modificados/untracked que já estavam no checkout foram preservados. Não houve reconstrução da interface nem alteração de regras de negócio.
