# Personal Interviewer Pro

Simulador de entrevistas de emprego **por voz ao vivo** com IA — evolução do projeto [personal-interviewer](https://github.com/kleberAbreu/Personal-Interviewer), com entrevista em **português ou inglês** e relatório crítico baseado em evidências.

> 👋 **É a primeira vez aqui ou não é da área de tecnologia?** Leia o
> **[📖 Manual do Usuário](MANUAL.md)** — um guia amigável, sem termos técnicos,
> que explica como configurar, usar e tirar o máximo do app para se preparar para
> entrevistas de emprego.

## Como funciona

```text
Setup (vaga + CV + idioma + pesos)
   |
   v
🔍 Pesquisador  -> Company Brief (cultura, valores, estilo de entrevista)
   |
   v
🗺️ Planejador   -> Roteiro adaptativo em blocos cronometrados + rubrica
   |
   v
🎙️ Entrevistador -> Conversa por VOZ em tempo real via Gemini Live
   |                follow-ups dinâmicos, modo stress, barge-in e encerramento automático
   v
📊 Analista     -> Relatório: nota ponderada, forças/gaps com citações literais,
                  momentos-chave, feedback por pergunta, plano de treino de 2 semanas
```

## Diferenciais

- **Duas APIs na experiência principal**: Google Gemini para voz ao vivo e OpenRouter para todos os agentes de texto.
- **Modelos por função via OpenRouter**: Pesquisador, Planejador e Analista podem usar Claude, GPT, Gemini, DeepSeek e outros sem chaves diretas desses provedores.
- **Voz full-duplex com Gemini Live**: conversa natural, barge-in/interrupção, pausa/retomada e transcrição dos dois lados.
- **Entrevista em inglês** 🇺🇸: o entrevistador conduz a sessão no idioma escolhido; o relatório pode continuar em português.
- **Prompt do entrevistador customizável**: edite o template completo ou anexe instruções extras pela UI.
- **Custo em R$**: texto usa tokens reportados pelo OpenRouter; voz usa estimativa por duração do áudio Gemini Live.

## Instalação rápida

Pré-requisitos: Git, npm e Node.js 20+.

```bash
curl -fsSL https://raw.githubusercontent.com/kleberAbreu/personal-interviewer-pro/main/scripts/install.sh | bash
```

Depois de instalar, abra o app com:

```bash
interview-pro
```

O comando inicia um servidor local, abre o navegador e mostra a URL no terminal. Para atualizar, execute novamente a linha de instalação.

## Rodando localmente

Pré-requisito: Node.js 20+

```bash
npm install
npm run dev
```

Abra o app, clique em **⚙ Configurações → Chaves de API** e cole:

| Provedor | Para quê | Onde obter |
| --- | --- | --- |
| Google Gemini | Entrevista por voz ao vivo via Gemini Live | aistudio.google.com/apikey |
| OpenRouter | Pesquisador, Planejador e Analista | openrouter.ai/keys |

O padrão de fábrica usa **Gemini Live** para o entrevistador e **OpenRouter** para os modelos de texto recomendados por função.

## Estrutura

```text
src/
├── agents/agents.ts        # Pesquisador, Planejador, Analista
├── providers/llm.ts        # Cliente OpenRouter para agentes de texto
├── voice/
│   ├── geminiLive.ts       # Sessão de voz via Gemini Live API
│   └── audio.ts            # Captura de mic PCM16 + player com fila e barge-in
├── config/
│   ├── models.ts           # Catálogo Gemini Live + OpenRouter
│   └── prompts.ts          # Prompts dos agentes + template editável do entrevistador
├── components/             # SetupForm, LiveInterview, ReportView, SettingsPanel
├── services/cost.ts        # Custo por tokens + estimativa de áudio
└── store.ts                # Settings persistidas (zustand)
```

## Avisos

- As chamadas saem direto do navegador (chaves no cliente). Adequado para uso pessoal; para publicar na internet, mova as chamadas para um backend/proxy.
- Para produção pública, use tokens efêmeros ou um backend para proteger a chave Gemini usada na voz ao vivo.
- Modelos como `anthropic/...` ou `openai/...` no catálogo são IDs do OpenRouter, não chaves diretas desses provedores.
