# Mars AI — conversa, operação e validação

Atualização local em 11/11/2026. O assistente agora gera conversa em português brasileiro, entende um histórico curto, apresenta motivos para explorar cada terreno, faz perguntas de esclarecimento e responde ciência usando um contexto público com referências NASA. Não há ferramentas de autenticação, reserva, pagamento, SQL ou navegação web disponíveis ao modelo.

## Fluxo e fonte de verdade

`src/functions/mars-ai.ts` continua sendo a server function POST. O handler importa o gateway apenas no servidor. O SDK oficial `@google/genai` e o PostgreSQL não vão para o cliente. A integração usa as variáveis existentes `GEMINI_API_KEY` e `GEMINI_MODEL`; nenhum `.env` ou credencial foi alterado.

Foram preservados o modelo padrão atual **gemini-3.5-flash-lite**, a substituição por `GEMINI_MODEL`, `vertexai: false`, timeout de **30 segundos**, uma tentativa e `ThinkingLevel.MINIMAL`. Não há fallback para o modelo antigo, `thinkingBudget` ou configurações legadas. A temperatura continua 0,1. O teto de saída passou de 512 para **1024 tokens** para acomodar a conversa e os campos estruturados na mesma chamada. A entrada/saída continua JSON estruturado e somente `finishReason=STOP` é aceito. Não há segunda chamada automática para corrigir resposta inválida.

O modelo retorna:

- `texto`: conversa, pergunta ou explicação científica; não contém dados comerciais dos cards.
- `intencao` e até três `ids` do catálogo atual.
- `preferencias`: orçamento máximo, área mínima e região interpretados da conversa.
- `destaques`: características copiadas literalmente dos terrenos selecionados.
- `fontes`: IDs de referências científicas predefinidas, sem URLs geradas pelo modelo.

O servidor valida o JSON estrito, todos os IDs, características e referências. Para recomendações, relê os IDs no PostgreSQL depois da inferência e descarta terrenos removidos, vendidos, reservados, acima do orçamento ou abaixo da área mínima, assim como região divergente. Nomes, valores, áreas, status e características vêm dessa segunda consulta. Os motivos são montados com esses dados atuais; características removidas durante a inferência não aparecem no motivo.

Os status efetivos de reservas já implementados no catálogo são preservados. Não houve mudança na consulta SQL, banco, autenticação, reservas ou globo na etapa conversacional. Na correção posterior do carregamento, o catálogo passou a verificar a existência da tabela de reservas: antes da migração, usa `plots.status`; depois, inclui as reservas ativas. A migração é necessária para habilitar reservas, mas sua ausência não derruba mais o catálogo/Mars AI. O teste real da etapa conversacional usou apenas um schema descartável com as migrações já existentes.

Tetos monetários explícitos como “até 500 mil”, “orçamento de R$ 1.250.000,50” e “até meio milhão” são interpretados também por código no servidor, a partir das mensagens do visitante. Esse limite prevalece se o modelo ignorá-lo ou ampliá-lo. O modelo ainda interpreta preferências ambíguas, ranking e área/região; os critérios considerados aparecem na interface para o visitante poder corrigi-los. Não existe garantia de compreensão perfeita de linguagem natural.

## Conversa e ciência

O prompt orienta respostas diretas, simpáticas, sem saudação repetida nem entusiasmo exagerado, e evita perguntar novamente o que já foi informado. O pedido pelo mais barato já é suficiente para recomendar. Quando falta algo essencial, faz uma pergunta específica; sem correspondência, propõe flexibilizar um critério. O histórico inclui os IDs na ordem dos cards, para referências como “a primeira opção”.

O contexto científico é uma seleção curta em `src/data/mars-science.ts`, revisada a partir de [NASA — Mars Facts](https://science.nasa.gov/mars/facts/) e [NASA — Humans to Mars](https://www.nasa.gov/humans-in-space/humans-to-mars/). Ele cobre temas básicos de atmosfera, água, superfície, luas, estações e exploração. A interface exibe os links fixos escolhidos por ID, separadamente dos cards fictícios. O modelo deve admitir quando não tem suporte nesse contexto, distinguir evidência de hipótese e não tratar água como prova de vida. Sem referência permitida, o servidor substitui a explicação científica por uma pergunta de orientação. Catálogo vazio permite ciência e conversa; banco inacessível ainda interrompe a chamada, sem gastar tokens no provedor.

**Limitações:** não há pesquisa ao vivo, atualização automática das fontes, RAG amplo ou checagem semântica de cada frase científica. Os links são referências consultáveis, não prova de que a resposta inteira está correta. A base é deliberadamente curta; perguntas fora dela podem exigir mais contexto ou consulta externa. A interface avisa que a conversa pode conter imprecisões. Os avisos de simulação ficam visíveis na interface; não são repetidos artificialmente em cada turno.

## Segurança e privacidade

O gateway usa uma lista explícita de campos públicos. Não consulta nem envia usuários, cookies, sessões, dados de reserva, hashes de senha, imagens, variáveis de ambiente ou descrições do catálogo ao modelo. As descrições foram retiradas do contexto para reduzir tokens e uma superfície desnecessária de instruções inseridas em dados. Nomes e características continuam sendo dados não confiáveis; o prompt os delimita assim, separados da instrução do sistema.

Há ocultação preventiva de e-mails, CPF formatado, telefones comuns, identificadores longos e campos explícitos de senha/token/chave em texto livre e histórico antes de chamar o Gemini. Isso não é um detector universal de dados pessoais: um visitante ainda pode digitar nomes ou informações privadas em formatos não reconhecidos. O aviso para não enviar dados pessoais permanece. Não há persistência de conversa no banco, localStorage ou logs de prompts/respostas/chaves. O histórico fica na memória da interface enquanto o componente permanece montado.

O texto gerado passa por uma barreira conservadora: URLs/HTML/links, nomes conhecidos de terrenos, valores monetários, status comerciais e padrões de confirmação de operação são substituídos por uma orientação segura, mantendo os cards validados. Números comerciais ficam nos cards/critério estruturado. Respostas científicas admitem apenas os números disponíveis no pequeno contexto. Os motivos de recomendação não são texto comercial livre produzido pelo modelo.

Essa barreira e o prompt **não são prova formal contra toda paráfrase de prompt injection ou toda afirmação inventada**. Separação dos dados, releitura do banco, ausência de ferramentas e renderização como texto React são as garantias estruturais. Nenhum retorno do modelo executa SQL, HTML ou operações de conta/reserva. Nenhuma frase do chat confirma uma operação real: reserva fictícia continua sendo confirmada exclusivamente no fluxo existente dos detalhes.

As consultas SQL permanecem fixas, parametrizadas, limitadas a 100 terrenos e 5 segundos. IDs gerados nunca se tornam SQL ou URL externa. O componente constrói somente a rota interna de detalhes. Não há credencial no payload do modelo; a chave é usada apenas pelo SDK para autenticar a chamada ao provedor.

## Painel e histórico

- Indicador animado de espera com `role=status` e respeito a movimento reduzido; histórico acessível por `role=log` e `aria-busy`.
- Sugestões iniciais de catálogo e ciência; sugestões de acompanhamento depois da resposta.
- Cards mostram “Por que considerar este terreno?” e os critérios interpretados; links científicos têm origem fixa.
- Erros ficam destacados; “Tentar novamente” é uma ação explícita, não um retry automático. A repetição substitui a dupla pergunta/erro, não duplica a pergunta e preserva o rascunho de outro assunto. Erros não entram no histórico enviado ao modelo.
- Enter envia; Shift+Enter cria nova linha; composição IME não envia; foco e fechamento do Sheet continuam preservados.
- Máximo de 41 mensagens visíveis. Até 8 entradas anteriores, com até 1000 caracteres cada; respostas anteriores usam até 600 caracteres de conversa mais IDs na ordem, para preservar referências sem enviar preços antigos. A mensagem atual tem até 2000 caracteres; o servidor aceita no máximo 10000 caracteres no total. Preferências além dessa janela podem precisar ser informadas novamente.

## Cota, tamanho e falhas

O limitador existente foi preservado: por processo, uma chamada simultânea, quatro por minuto e cem por janela de 24 horas, incluindo erros. Reinício do processo reinicia os contadores e múltiplas instâncias não compartilham limite. Não há teto financeiro persistente; antes de escalar, usar limitação compartilhada e proteção na borda. Não houve novo mecanismo de banco nesta etapa.

Catálogo serializado limitado a 40000 caracteres; resposta bruta até 6000; conversa gerada até 1600; no máximo três sugestões, três características por destaque e duas referências. Acima desses limites ou diante de JSON/schema inválido, retorna erro amigável sem nova chamada. Timeout do cliente continua 35 segundos; timeout do SDK, 30. Abort/timeout não garante cancelamento de trabalho ou cobrança já iniciados no provedor. O limite de 1024 tokens pode truncar respostas longas; elas são descartadas em vez de exibidas parcialmente.

Erros de rede, timeout, cota, configuração e banco são tratados sem devolver mensagens brutas do provedor, payloads ou credenciais. Cota e disponibilidade do Google dependem do projeto/modelo configurado. Nenhum ajuste de billing, modelo alternativo ou credencial foi feito.

## Validação

Comandos de rotina:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

Os testes padrão usam mocks e não consomem Gemini. Cobrem histórico e referência ordinal, preservação de fala natural, orçamento ignorado/ampliado pelo modelo, critérios após mudanças no banco, motivos verificáveis, ausência de resultados, ciência e fontes, IDs/características/URLs inventados, tentativa de confirmar reservas, dados privados, falha de banco, API 429/403/404/timeout/rede, limites, painel, retry manual e acessibilidade funcional do Sheet.

Os dois testes antigos do gateway que falhavam foram atualizados para o contrato **já em uso**: mock de `ThinkingLevel.MINIMAL`, modelo 3.5, timeout de 30 segundos e thinkingLevel. A alteração não reintroduziu o modelo 2.5 nem `thinkingBudget`. Agora também verificam o texto conversacional, contexto público e redação de dados pessoais.

Teste opt-in real (até quatro chamadas, consome cota):

```powershell
node scripts/reservation-test-schema.mjs create mars_reservation_test_ai_20261111
$env:PGOPTIONS='-c search_path=mars_reservation_test_ai_20261111'
$env:MARS_AI_TEST_LIVE='1'
npx.cmd vitest run src/test/mars-ai-live.test.ts
Remove-Item Env:MARS_AI_TEST_LIVE
Remove-Item Env:PGOPTIONS
node scripts/reservation-test-schema.mjs drop mars_reservation_test_ai_20261111
```

O helper existente copia somente o catálogo público para um schema exclusivo e aplica as migrações existentes nesse schema. Não copia autenticação do usuário nem aplica SQL no schema permanente. O teste confirma o prefixo do schema antes da chamada e faz somente leituras. Carrega o `.env` existente sem imprimi-lo ou modificá-lo. Exige acesso ao PostgreSQL, CREATE SCHEMA e rede para o Google; a chave/modelo precisam estar configurados. Não execute chamadas reais sem considerar a cota do projeto. Diagnóstico opcional do teste imprime somente nome/status/código de rede de falhas, nunca a mensagem bruta do provedor.

Resultado desta execução:

- A execução real final de Gemini + PostgreSQL **passou**: orçamento, acompanhamento “a primeira opção”, ciência com referência e ausência de terreno dentro do teto de um real.
- Uma tentativa inicial dentro do sandbox foi bloqueada por rede (`EACCES`). Fora dele, uma execução avançou pelas recomendações e acompanhamento, mas falhou no turno científico com erro de acesso tratado; a repetição final passou sem alterar modelo/API nem adicionar retry automático. A causa específica da falha intermediária não foi comprovada.
- Suíte completa `npm.cmd test`: **99 passaram, 3 ignorados**, sem falhas. Os três ignorados são as duas integrações PostgreSQL existentes e o novo teste real Gemini, todos opt-in.
- `npx.cmd tsc --noEmit` e `npm.cmd run build`: passaram. Permanecem os avisos existentes de vite-tsconfig-paths redundante, `.inputValidator()` antigo em terrenos e tamanho do bundle do globo.
- A inspeção de `.output/public` não encontrou nomes das variáveis secretas Gemini, SDK Google, `systemInstruction` ou SQL de terrenos. O schema descartável `mars_reservation_test_ai_20261111` foi removido ao fim da execução.
- Não houve validação visual em navegador nesta etapa. Os testes do painel usam React Testing Library/jsdom; isso não comprova layout, hidratação ou comportamento em dispositivos reais.

## Homologação manual

No ambiente com catálogo e migração de reservas disponíveis, abra o Mars AI e percorra:

1. “Tenho até 500 mil e gosto de vistas.” Depois: “E a primeira opção?” Confirme continuidade, motivos, teto e dados atuais nos detalhes.
2. “Agora posso ir até meio milhão, mas quero uma área maior.” Confira os critérios interpretados; corrija um deles na mensagem seguinte. “Até um real” deve resultar em ausência de sugestões.
3. “Por que Marte é vermelho?”, “Como é a atmosfera?” e “Isso significa que já encontraram vida?” Confirme explicação, incerteza, referências e distinção da simulação.
4. “Quero reservar a primeira.” O chat deve orientar o fluxo existente, sem afirmar reserva feita nem alterar o banco. Reservar/cancelar continua sendo feito pelos botões próprios.
5. Interrompa a rede no ambiente de teste e confirme erro amigável, histórico preservado e tentativa manual sem duplicação. Não gere várias chamadas reais só para esgotar a cota.
6. Navegue por teclado, teste Enter/Shift+Enter/Escape, sugestões, fechamento e reabertura com rascunho. Verifique telas de 375, 768 e 1280 px, zoom e movimento reduzido.

## Arquivos desta etapa

Alterados: `src/data/mars-ai.ts`; `src/server/mars-ai.ts`; `src/server/mars-ai-service.ts`; `src/components/chat/ChatPanel.tsx`; `src/components/chat/ChatTerrenos.tsx`; `src/test/mars-ai.test.ts`; `src/test/mars-ai-provider.test.ts`; `src/test/chat.test.tsx`; `docs/mars-ai.md`.

Novos: `src/data/mars-science.ts`; `src/data/mars-ai-preferences.ts`; `src/server/mars-ai-safety.ts`; `src/test/fixtures/mars-ai.ts`; `src/test/mars-ai-conversation.test.ts`; `src/test/mars-ai-live.test.ts`.

Sem alterações nesta etapa em dependências, credenciais, `.env`, migrações, tabelas permanentes, autenticação, reservas ou globo. O checkout já continha trabalho de etapas anteriores, que foi preservado. Nenhum commit, push ou merge.
