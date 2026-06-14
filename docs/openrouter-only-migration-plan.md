# Plano: Consolidar o Personal Interviewer Pro em uma unica chave OpenRouter

## Resumo

Migrar o app para usar apenas a API do OpenRouter, mantendo a chave no `localStorage` como hoje, mas reduzindo a configuracao para uma unica chave. Os agentes de texto continuarao podendo usar modelos diferentes por funcao via OpenRouter. A entrevista por voz deixara de usar Gemini Live/OpenAI Realtime e passara para um fluxo assincrono em turnos: grava fala do candidato -> OpenRouter STT -> OpenRouter Chat -> OpenRouter TTS -> toca resposta.

Referencias usadas: OpenRouter Chat Completions, Speech/TTS e Transcriptions/STT documentam uma API compativel com Chat, sintese de fala e transcricao, mas nao substituem diretamente o WebSocket realtime full-duplex atual.

## Mudancas Principais

- Simplificar credenciais:
  - Trocar `ApiKeys` para conter so `openrouter`.
  - Atualizar `SettingsPanel` para exibir apenas "Chave OpenRouter".
  - Criar migracao `persist` versao 5: preservar `keys.openrouter`, remover dependencia funcional de `gemini`, `openai`, `anthropic`.
- Simplificar provedores:
  - Transformar `providers/llm.ts` em cliente unico OpenRouter para `/api/v1/chat/completions`.
  - Remover chamadas diretas a Gemini, OpenAI e Anthropic nos agentes de texto.
  - Usar `response_format: { type: "json_object" }` nos agentes que exigem JSON, mantendo `extractJson` como tolerancia de parse.
- Manter modelos por funcao, todos via OpenRouter:
  - Researcher, Planner, Interviewer e Analyst continuam configuraveis separadamente.
  - Catalogo passa a listar apenas IDs OpenRouter, por exemplo `anthropic/...`, `openai/...`, `google/...`, `deepseek/...`, `openrouter/auto`.
  - Defaults recomendados ficam todos com `provider: "openrouter"`; se o tipo `Provider` for mantido, ele deve aceitar somente `"openrouter"` no fluxo final.
- Substituir voz realtime por voz assincrona:
  - Remover `geminiLive.ts` e `openaiRealtime.ts` do fluxo ativo.
  - Criar um servico OpenRouter de audio com:
    - STT: `POST /api/v1/audio/transcriptions`.
    - Chat do entrevistador: `POST /api/v1/chat/completions`.
    - TTS: `POST /api/v1/audio/speech`.
  - `LiveInterview` vira uma entrevista por turnos: gravar resposta, transcrever, adicionar a transcricao, gerar proxima pergunta/follow-up, sintetizar audio e tocar.
  - Encerramento deixa de depender de tool call realtime; o chat do entrevistador deve retornar JSON ou marcador estruturado indicando `continue` ou `end_interview`.

## Interface e Comportamento

- Configuracoes:
  - Remover abas/inputs de Gemini, OpenAI e Anthropic.
  - Em "Modelos", manter selecao por funcao, mas todos os selects usam catalogo OpenRouter.
  - Em "Voz", substituir listas Gemini/OpenAI por vozes compativeis com o modelo TTS escolhido.
- Entrevista:
  - Mostrar estado claro por turno: `Gravando`, `Transcrevendo`, `Pensando`, `Gerando audio`, `Tocando`.
  - Botao principal alterna entre iniciar/parar gravacao da resposta do candidato.
  - Barge-in realtime deixa de existir na v1; interrupcao deve apenas parar a reproducao atual.
- Custos:
  - Texto usa `usage` retornado pelo OpenRouter Chat.
  - STT usa `usage.cost`/segundos quando disponivel.
  - TTS deve usar custo informado quando disponivel; caso nao venha, exibir custo de voz como estimado/indisponivel com texto explicito.

## Testes e Validacao

- Unitarios/estaticos:
  - Validar migracao de settings v4 -> v5 preservando `openrouter`.
  - Validar que nenhum fluxo exige `keys.gemini`, `keys.openai` ou `keys.anthropic`.
  - Validar montagem dos payloads OpenRouter para Chat, STT e TTS.
- Build/checks:
  - `npm run build`.
  - `npm run lint`, registrando ou corrigindo os problemas ja existentes antes de considerar a migracao limpa.
- Teste manual minimo:
  - Sem chave OpenRouter: app mostra erro unico e acionavel.
  - Com chave: Researcher e Planner geram preparacao.
  - Entrevista: grava um turno, transcreve, gera resposta, toca audio e registra transcricao dos dois lados.
  - Encerramento: fluxo vai para Analyst e relatorio e gerado so com a transcricao real.

## Assumptions

- Manter chave no `localStorage`, conforme escolhido, aceitando o mesmo perfil de risco atual para uso pessoal/publicado.
- Preservar selecao de modelos por funcao, mas todos roteados por OpenRouter.
- Aceitar perda de conversa realtime full-duplex na primeira versao OpenRouter-only.
- Nao introduzir backend/proxy nesta migracao.
