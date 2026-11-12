# Mars Estate

Mars Estate é um projeto de portfólio que simula a descoberta e a comparação de terrenos fictícios em Marte. A experiência combina um globo interativo, informações sobre regiões marcianas e um catálogo imobiliário conceitual, com interface em português brasileiro.

**Não há comercialização de terrenos, pagamentos ou reservas reais.** Lotes, preços, áreas e disponibilidade fazem parte da simulação. As imagens são ilustrativas, e os conteúdos científicos apresentados na interface incluem referências externas.

## Funcionalidades implementadas

- Exploração de Marte em um globo 3D texturizado, com seleção de regiões, rotação, zoom e controles de pausa e restauração da visão.
- Carregamento do módulo 3D sob demanda, apenas no navegador, com representação alternativa em caso de falha e botões de seleção de regiões acessíveis por teclado.
- Catálogo com busca por nome e filtros combináveis por região, disponibilidade, preço máximo e área mínima.
- Ordenação por preço, área e nome, além de comparação de até três terrenos.
- Página de detalhes com galeria de imagens, descrição, características, área, preço demonstrativo, status e informações da região associada.
- Carrossel de terrenos disponíveis na página inicial, usando componentes baseados em Embla.
- Formulário demonstrativo de interesse, com campos obrigatórios e validação nativa de e-mail. A confirmação ocorre somente na interface: nenhum dado é enviado ou armazenado.
- Páginas sobre o projeto e sobre o funcionamento da simulação.
- Consulta de terrenos e regiões no PostgreSQL por funções executadas no servidor.
- Estados de carregamento, ausência de resultados e terreno não encontrado; o catálogo também oferece uma tela de erro com opção de tentar novamente.

## Tecnologias utilizadas

| Área | Tecnologias e uso no projeto |
| --- | --- |
| Interface | React 19 e TypeScript |
| Aplicação e navegação | TanStack Start e TanStack Router, com rotas baseadas em arquivos, loaders e renderização no servidor |
| Contexto de consultas | TanStack Query, com `QueryClient` e provider configurados; os dados principais são carregados pelos loaders das rotas |
| Estilização e componentes | Tailwind CSS 4, componentes em `src/components/ui` baseados em Radix UI, ícones Lucide React e utilitários de classes |
| Exploração 3D | Three.js, React Three Fiber e Drei |
| Carrossel | Embla Carousel |
| Backend e banco | Funções de servidor do TanStack Start, PostgreSQL e driver `pg`, com pool de conexões |
| Validação | Zod na entrada da consulta de terreno por identificador |
| Desenvolvimento e build | Vite 8, configuração integrada do Lovable e Nitro no build |
| Testes e qualidade | Vitest, jsdom, Testing Library no ambiente de testes, ESLint e Prettier |

O projeto foi iniciado com Lovable. A preparação para Vercel, variáveis de ambiente, PostgreSQL gerenciado, evidências locais e etapas de homologação estão no [guia de publicação](docs/publicacao-vercel.md). Nenhum deploy foi realizado nesta preparação.

## Arquitetura e organização

Frontend e backend pertencem à mesma aplicação TanStack Start. Não há um serviço de API separado: os loaders das páginas chamam funções de servidor, que consultam o PostgreSQL e devolvem os dados à interface.

```text
src/
├── assets/                  # Imagens importadas pela aplicação
├── components/
│   ├── exploration/         # Globo 3D, exploração e painel regional
│   ├── site/                # Layout, cards, carrossel e formulário de interesse
│   └── ui/                  # Componentes reutilizáveis de interface
├── data/                    # Tipos, dados simulados, filtros, ordenação e comparação
├── functions/               # Funções de servidor usadas pelas rotas para consultar o banco
├── hooks/                   # Hooks de interface e preferência de movimento reduzido
├── lib/                     # Utilitários e tratamento de erros
├── routes/                  # Páginas, loaders e metadados
├── server/
│   ├── db.ts                # Pool de conexões PostgreSQL
│   └── terrenos.ts          # Implementação adicional de listagem de terrenos
├── test/                    # Testes automatizados e preparação do ambiente
├── router.tsx               # Configuração do roteador e QueryClient
├── routeTree.gen.ts         # Árvore de rotas gerada
├── server.ts                # Entrada do servidor e tratamento de falhas de SSR
├── start.ts                 # Middlewares de erro e proteção contra requisições entre sites
└── styles.css               # Estilos globais
public/images/               # Imagens referenciadas por caminho público
testar-banco.mjs             # Verificação manual de conexão e consulta ao PostgreSQL
```

As rotas principais utilizam `src/functions/terrenos.ts` e `src/functions/regioes.ts`. Os arquivos de `src/data/` continuam contendo dados simulados e funções assíncronas de consulta em memória, além das regras compartilhadas de filtragem e comparação. Esses dados são usados nos testes e **não funcionam como fallback automático** das páginas quando o banco está indisponível.

### Rotas disponíveis

| Rota | Finalidade |
| --- | --- |
| `/` | Apresentação, exploração de regiões e terrenos disponíveis |
| `/terrenos` | Catálogo, exploração, filtros, ordenação e comparação |
| `/terrenos/$id` | Detalhes; substitua `$id` por um identificador existente |
| `/sobre` | Apresentação do projeto e marcos da exploração de Marte |
| `/como-funciona` | Explicação da jornada da simulação |
| `/teste-banco` | Diagnóstico que lista terrenos consultados no PostgreSQL |
| `/teste-regioes` | Diagnóstico que lista regiões consultadas no PostgreSQL |

As duas rotas de diagnóstico são páginas da aplicação, não testes automatizados.

## Integração com PostgreSQL

O arquivo `src/server/db.ts` cria um `Pool` do driver `pg`, com até dez conexões, a partir de variáveis de ambiente do servidor. As funções em `src/functions/` importam esse módulo dentro dos handlers para manter o acesso ao banco no servidor.

As consultas leem terrenos e regiões, relacionam os registros por `region_id` e agregam imagens e características. A busca de um terreno valida o identificador com Zod e utiliza parâmetro SQL (`$1`).

As consultas esperam as seguintes tabelas e colunas:

| Tabela | Colunas utilizadas |
| --- | --- |
| `regions` | `id`, `name`, `type`, `description`, `latitude`, `longitude`, `image_url`, `fact`, `source`, `source_url` |
| `plots` | `id`, `name`, `region_id`, `area`, `price`, `status`, `description` |
| `plot_images` | `plot_id`, `image_url`, `position` |
| `plot_characteristics` | `id`, `plot_id`, `name` |

Essa relação descreve o contrato observado nas consultas, não um script de criação do banco. Os status utilizados pela interface são `disponivel`, `reservado` e `vendido`; os identificadores de região dos terrenos devem corresponder aos de `regions`. Os caminhos de imagens devem apontar para recursos disponíveis na aplicação ou URLs acessíveis.

Há migrações de autenticação e reservas em `migrations/`, mas não há seed ou provisionamento completo do catálogo. Para reproduzir o catálogo atual, prepare uma base compatível com as consultas e dados sanitizados, fora do repositório. Instalar as dependências ou iniciar a aplicação não cria essas tabelas nem importa os dados simulados. Consulte o [guia de publicação](docs/publicacao-vercel.md) antes de conectar um banco gerenciado.

**O banco PostgreSQL local não é enviado automaticamente ao GitHub.** O Git versiona os arquivos adicionados ao repositório, não o serviço PostgreSQL nem seus registros. Clonar o projeto não copia o banco de outra máquina; uma transferência exige exportação e importação separadas. O arquivo `.env` também é ignorado pelo Git e não deve ser publicado com credenciais.

## Execução local

### 1. Pré-requisitos

- Node.js 24.x, com npm, para o build e runtime alinhados à Vercel.
- PostgreSQL em execução e um banco acessível, com as tabelas e os dados descritos na seção anterior.
- Navegador com WebGL para a experiência 3D. A interface dispõe de representação alternativa e controles de região fora do canvas.

Não há versão de PostgreSQL fixada no repositório. O projeto inclui `package-lock.json` e `bun.lock`; as instruções abaixo utilizam npm.

### 2. Instalar dependências

No terminal, dentro da pasta do projeto:

```sh
npm ci
```

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto e preencha os valores da sua instalação local. Não há `.env.example` versionado; o bloco abaixo é apenas um modelo:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mars_estate
DATABASE_USER=seu_usuario
DATABASE_PASSWORD=sua_senha
```

| Variável | Finalidade |
| --- | --- |
| `DATABASE_HOST` | Endereço do servidor PostgreSQL |
| `DATABASE_PORT` | Porta de conexão; o código usa `5432` quando não informada |
| `DATABASE_NAME` | Nome do banco já criado |
| `DATABASE_USER` | Usuário com permissão de leitura das tabelas utilizadas |
| `DATABASE_PASSWORD` | Senha desse usuário |

O nome `mars_estate` é ilustrativo e deve corresponder a um banco existente. As credenciais são lidas via `process.env` no servidor: não acrescente o prefixo `VITE_` a elas.

### 4. Verificar o banco e iniciar a aplicação

O script de diagnóstico carrega o `.env` explicitamente, tenta conectar ao PostgreSQL e consulta os terrenos com suas regiões e contagens de imagens e características:

```sh
node testar-banco.mjs
```

Ele não cria estruturas nem insere dados. Falhas de conexão ou de consulta são exibidas no terminal.

Para iniciar o Vite garantindo que as variáveis do `.env` estejam disponíveis em `process.env`, execute:

```sh
node --env-file=.env ./node_modules/vite/bin/vite.js dev
```

Se as variáveis `DATABASE_*` já estiverem exportadas no ambiente do terminal, também é possível usar o script existente:

```sh
npm run dev
```

Abra o endereço local informado pelo Vite no terminal. A página inicial, o catálogo, os detalhes e as páginas de diagnóstico dependem da conexão com o banco e de seu esquema. Se houver erro, verifique o serviço PostgreSQL, as credenciais, as permissões e a existência das tabelas.

### Outros comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run build` | Gerar o artefato Nitro/Vercel em `.vercel/output` |
| `npm run build:local` | Gerar o servidor Nitro Node em `.output` para preview local |
| `npm run build:dev` | Gerar o build em modo de desenvolvimento |
| `npm run preview` | Executar o bundle de produção após `npm run build:local` |
| `npm run audit:publication` | Auditar arquivos elegíveis para Git e bundles sem imprimir segredos |
| `npm run lint` | Executar o ESLint |
| `npm run format` | Formatar o projeto com Prettier; este comando altera arquivos |

Os comandos que executam o servidor precisam das variáveis de conexão no ambiente quando acessam o banco. A prévia local não constitui uma instrução de implantação em produção.

## Testes

Os scripts automatizados existentes são:

```sh
npm test
npm run test:watch
```

O primeiro executa a suíte uma vez; o segundo mantém o Vitest em modo de observação. A configuração está em `vitest.config.ts`, com ambiente jsdom e preparação em `src/test/setup.ts`.

Os testes presentes no código verificam:

- Filtros por nome, região, disponibilidade, preço e área, usando dados simulados.
- Associação de terrenos a regiões por `region_id`.
- Presença de fatos e referências nos dados simulados, sem validar externamente seu conteúdo científico.
- Ordenação e inclusão ou remoção de terrenos na comparação, respeitando o limite de três.
- Reconhecimento da rota inicial pelo roteador, sem executar loaders nem renderizar a página.

Esses testes não comprovam a conexão com PostgreSQL, o funcionamento do globo no navegador ou o fluxo completo da aplicação. A verificação do banco é manual, por `node testar-banco.mjs` e pelas rotas de diagnóstico.

## Limitações atuais

- Não há autenticação, contas de usuário ou painel administrativo implementados.
- A integração com o banco é de leitura: não há fluxo de cadastro, edição ou exclusão de terrenos pela interface.
- O formulário de interesse não envia e-mails, não grava dados e não altera a disponibilidade dos terrenos.
- A comparação permanece no estado da interface, sem persistência em banco ou armazenamento local.
- O globo e as coordenadas representam uma exploração ilustrativa, sem precisão cartográfica de lotes reais.
- A reprodução completa do catálogo depende de um banco preparado separadamente, pois o esquema e a carga inicial não estão versionados.
- Não há testes de ponta a ponta ou testes automatizados de integração com PostgreSQL no repositório.
