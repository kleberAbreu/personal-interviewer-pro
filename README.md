# Personal Interviewer Pro

Simulador de entrevistas de emprego **por voz** com IA — evolução do projeto [personal-interviewer](https://github.com/kleberAbreu/Personal-Interviewer), reescrito do zero com arquitetura multi-provider, entrevista em **português ou inglês** e relatório crítico baseado em evidências.

> 👋 **É a primeira vez aqui ou não é da área de tecnologia?** Leia o
> **[📖 Manual do Usuário](MANUAL.md)** — um guia amigável, sem termos técnicos,
> que explica como configurar, usar e tirar o máximo do app para se preparar para
> entrevistas de emprego.

## Como funciona

```
Setup (vaga + CV + idioma + pesos)
   │
   ▼
🔍 Pesquisador  ──► Company Brief (cultura, valores, estilo de entrevista)
   │
   ▼
🗺️ Planejador   ──► Roteiro adaptativo em blocos cronometrados + rubrica
   │
   ▼
🎙️ Entrevistador ──► Conversa por VOZ em tempo real (Gemini Live ou OpenAI Realtime)
   │                  follow-ups dinâmicos, modo stress, encerramento automático via tool call
   ▼
📊 Analista     ──► Relatório: nota ponderada, forças/gaps com citações literais,
                    momentos-chave, feedback por pergunta, plano de treino de 2 semanas
```

## Diferenciais sobre o projeto original

- **Multi-provider**: cada função (Pesquisador, Planejador, Entrevistador, Analista) pode usar um modelo diferente — **Google Gemini, OpenAI, Anthropic** ou **OpenRouter** (uma chave única que dá acesso a todos os modelos, incluindo fallbacks econômicos como DeepSeek).
- **Painel de Modelos com sugestões**: para cada função, o app recomenda o modelo com melhor custo/qualidade e explica o porquê (ex.: Claude Opus 4.8 no Analista, onde a inteligência importa; modelos baratos no Pesquisador, onde não importa).
- **Entrevista em inglês** 🇺🇸: o entrevistador conduz toda a sessão em inglês nativo — ideal para treinar processos internacionais. O relatório pode continuar em português.
- **Transcrição dos dois lados**: o app original só transcrevia o entrevistador (o Analista avaliava uma entrevista quase vazia). Aqui a fala do candidato é transcrita (input transcription no Gemini Live / Whisper no OpenAI Realtime) — o relatório avalia o que você realmente disse.
- **Prompt do entrevistador 100% customizável**: edite o template completo (com placeholders) ou apenas anexe instruções extras, direto na UI.
- **Custo real por tokens**: usa os contadores oficiais de cada API (não estimativa por caracteres) + estimativa de áudio por duração, exibido em R$ em todas as telas.
- **Voz com barge-in**: interrompa o entrevistador falando por cima, como numa conversa real.

## Rodando localmente

Pré-requisito: Node.js 20+

```bash
npm install
npm run dev
```

Abra o app, clique em **⚙ Configurações → Chaves de API** e cole as chaves dos provedores que for usar (ficam só no `localStorage` do navegador):

| Provedor   | Para quê                                        | Onde obter                       |
|------------|--------------------------------------------------|----------------------------------|
| Gemini     | Voz (Gemini Live) + agentes de texto             | aistudio.google.com/apikey       |
| OpenAI     | Voz em inglês (Realtime API) + GPT               | platform.openai.com/api-keys     |
| Anthropic  | Analista de alta qualidade (Claude Opus/Fable)   | console.anthropic.com            |
| OpenRouter | Chave única para Claude/GPT/Gemini/DeepSeek      | openrouter.ai/keys               |

O padrão de fábrica prioriza **qualidade máxima** por função: Claude Opus 4.8 (Pesquisador e Planejador), Claude Fable 5 (Analista) e Gemini Live (voz) — ou seja, requer as chaves **Anthropic + Gemini**. Alternativas mais econômicas (ou tudo-Gemini com uma chave só) estão a um clique em **Configurações → Modelos**.

## Estrutura

```
src/
├── agents/agents.ts        # Pesquisador, Planejador, Analista
├── providers/llm.ts        # Abstração Gemini/OpenAI/Anthropic/OpenRouter
├── voice/
│   ├── geminiLive.ts       # Sessão de voz via Gemini Live API
│   ├── openaiRealtime.ts   # Sessão de voz via OpenAI Realtime API (WebSocket)
│   └── audio.ts            # Captura de mic PCM16 + player com fila e barge-in
├── config/
│   ├── models.ts           # Catálogo de modelos, preços e sugestões por função
│   └── prompts.ts          # Prompts dos agentes + template editável do entrevistador
├── components/             # SetupForm, LiveInterview, ReportView, SettingsPanel
├── services/cost.ts        # Custo por tokens reais + estimativa de áudio
└── store.ts                # Settings persistidas (zustand)
```

## Avisos

- As chamadas saem direto do navegador (chaves no cliente). Adequado para uso pessoal; para publicar na internet, mova as chamadas para um backend/proxy.
- A autenticação da OpenAI Realtime usa o subprotocolo `openai-insecure-api-key` (modo dev). Em produção, gere tokens efêmeros num backend.
- Preços dos modelos em `src/config/models.ts` — Anthropic oficiais (jun/2026), demais estimados; ajuste quando mudarem.
