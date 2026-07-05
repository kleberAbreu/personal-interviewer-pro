import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle, BarChart3, BookOpen, Bot, ClipboardList, Flame, Globe2, Info, KeyRound,
  Lightbulb, MessageSquareText, Mic2, MicOff, Pause, PhoneOff, Receipt, Rocket, Route,
  ShieldCheck, SlidersHorizontal, Sparkles, Wallet, X,
} from 'lucide-react'
import { Card } from './ui'

type SectionId =
  | 'start' | 'keys' | 'paths' | 'prepare' | 'live' | 'spectator' | 'report' | 'advanced' | 'tips'

const SECTIONS: Array<{ id: SectionId; label: string; icon: ReactNode }> = [
  { id: 'start', label: 'Como funciona', icon: <Rocket className="w-4 h-4" /> },
  { id: 'keys', label: 'Configurar chaves', icon: <KeyRound className="w-4 h-4" /> },
  { id: 'paths', label: 'Qual caminho usar', icon: <Route className="w-4 h-4" /> },
  { id: 'prepare', label: 'Preparar a entrevista', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'live', label: 'Durante a entrevista', icon: <Mic2 className="w-4 h-4" /> },
  { id: 'spectator', label: 'Modo espectador (IA)', icon: <Bot className="w-4 h-4" /> },
  { id: 'report', label: 'Seu relatório', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'advanced', label: 'Ajustes avançados', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'tips', label: 'Dicas & soluções', icon: <Lightbulb className="w-4 h-4" /> },
]

export default function ManualPanel({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<SectionId>('start')

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-8 no-print"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-5xl h-[92vh] md:h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-indigo-600/10 via-transparent to-emerald-600/10">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Guia & Manual de uso</h2>
              <p className="text-[11px] text-slate-500 leading-tight">Tudo o que você precisa para configurar e aproveitar o app</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400" title="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Navegação lateral (vira barra horizontal no mobile) */}
          <nav className="shrink-0 md:w-60 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/30 flex md:flex-col gap-1 p-2 md:p-3 overflow-x-auto md:overflow-y-auto">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors text-left ${
                  active === s.id
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className={active === s.id ? 'text-indigo-300' : 'text-slate-500'}>{s.icon}</span>
                <span className="hidden sm:inline md:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </nav>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-9 md:py-8">
            <div className="max-w-2xl mx-auto space-y-6">
              {active === 'start' && <StartSection />}
              {active === 'keys' && <KeysSection />}
              {active === 'paths' && <PathsSection />}
              {active === 'prepare' && <PrepareSection />}
              {active === 'live' && <LiveSection />}
              {active === 'spectator' && <SpectatorSection />}
              {active === 'report' && <ReportSection />}
              {active === 'advanced' && <AdvancedSection />}
              {active === 'tips' && <TipsSection />}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ───────────────────────── Blocos de apresentação reutilizáveis ───────────────────────── */

function Heading({ icon, title, lead }: { icon: ReactNode; title: string; lead?: string }) {
  return (
    <div className="mb-1">
      <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-100">
        <span className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300">{icon}</span>
        {title}
      </h3>
      {lead && <p className="text-slate-400 mt-3 text-sm leading-relaxed">{lead}</p>}
    </div>
  )
}

function Sub({ children }: { children: ReactNode }) {
  return <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 pt-2">{children}</h4>
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
}

type Tone = 'info' | 'tip' | 'warn' | 'money' | 'safe'
function Callout({ tone = 'info', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const map: Record<Tone, { box: string; text: string; icon: ReactNode }> = {
    info: { box: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-100/90', icon: <Info className="w-4 h-4 text-indigo-400" /> },
    tip: { box: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-100/90', icon: <Lightbulb className="w-4 h-4 text-emerald-400" /> },
    warn: { box: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-100/90', icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
    money: { box: 'bg-sky-500/10 border-sky-500/30', text: 'text-sky-100/90', icon: <Wallet className="w-4 h-4 text-sky-400" /> },
    safe: { box: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-100/90', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
  }
  const c = map[tone]
  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 ${c.box}`}>
      <div className="shrink-0 mt-0.5">{c.icon}</div>
      <div className={`text-sm leading-relaxed ${c.text}`}>
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-sm text-slate-300 leading-relaxed pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  )
}

function Tile({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm mb-1.5">
        <span className="text-indigo-300">{icon}</span>
        {title}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  )
}

function Em({ children }: { children: ReactNode }) {
  return <strong className="text-slate-100 font-semibold">{children}</strong>
}

function Code({ children }: { children: ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded-md bg-slate-800 text-indigo-200 text-[12px] font-mono">{children}</code>
}

/* ───────────────────────────────── Seções ───────────────────────────────── */

function StartSection() {
  return (
    <>
      <Heading
        icon={<Rocket className="w-5 h-5" />}
        title="Como funciona"
        lead="É como ter um entrevistador profissional só para você treinar. Você conversa por voz com uma IA — igual a uma entrevista de verdade — e no final recebe um relatório sincero com nota, pontos a melhorar e um plano de treino."
      />
      <Callout tone="tip" title="Em uma frase">
        Cole a descrição da vaga, converse por voz com o entrevistador virtual e receba um feedback detalhado para arrasar na entrevista real.
      </Callout>

      <Sub>Em 4 passos</Sub>
      <Steps
        items={[
          <><Em>Configure uma chave</Em> de acesso (basta a do Google Gemini para começar) — explicado na próxima seção.</>,
          <><Em>Cole a descrição da vaga</Em> dos seus sonhos no formulário inicial.</>,
          <><Em>Converse por voz</Em> com o entrevistador, como numa entrevista real.</>,
          <><Em>Leia seu relatório</Em>, treine os pontos fracos e repita.</>,
        ]}
      />

      <Sub>A equipe de IA que trabalha por você</Sub>
      <P>Nos bastidores, quatro assistentes agem sozinhos — você não precisa fazer nada, mas entender o papel de cada um ajuda a aproveitar melhor:</P>
      <div className="grid sm:grid-cols-2 gap-3">
        <Tile icon={<Sparkles className="w-4 h-4" />} title="🔍 Pesquisador">Lê a vaga (e seu CV) e descobre a cultura, os valores e o estilo de entrevista daquela empresa.</Tile>
        <Tile icon={<ClipboardList className="w-4 h-4" />} title="🗺️ Planejador">Monta um roteiro sob medida, em blocos cronometrados, ajustado ao nível da vaga.</Tile>
        <Tile icon={<Mic2 className="w-4 h-4" />} title="🎙️ Entrevistador">É com quem você conversa por voz, em tempo real, com perguntas de aprofundamento.</Tile>
        <Tile icon={<BarChart3 className="w-4 h-4" />} title="📊 Analista">Relê tudo o que foi dito e escreve seu relatório de desempenho com evidências.</Tile>
      </div>
    </>
  )
}

function KeysSection() {
  const providers: Array<{ name: string; url: string; what: string }> = [
    { name: 'Google Gemini', url: 'aistudio.google.com/apikey', what: 'Faz a entrevista por voz ao vivo, com barge-in e transcrição dos dois lados.' },
    { name: 'OpenRouter', url: 'openrouter.ai/keys', what: 'Roda Pesquisador, Planejador e Analista com Claude, GPT, Gemini, DeepSeek e mais.' },
  ]
  return (
    <>
      <Heading
        icon={<KeyRound className="w-5 h-5" />}
        title="Configurar chaves"
        lead="Esta é a única parte que exige um pouco de preparação — e é mais simples do que parece."
      />
      <P>
        O app não tem “cérebro” próprio: ele usa o Google Gemini para a voz ao vivo e o OpenRouter para acessar modelos de texto
        como Claude, GPT, Gemini e DeepSeek. Para usá-los em seu nome, você precisa de uma <Em>chave de acesso</Em> — uma espécie
        de senha pessoal da sua conta em cada serviço. Você cria a conta no site oficial, copia a chave e cola no app. Só isso.
      </P>

      <Callout tone="money" title="Tem custo?">
        O app é gratuito, mas essas IAs cobram pelo uso — em geral de <Em>centavos a poucos reais por entrevista</Em>. Você paga direto
        ao provedor, nunca ao app. E fique tranquilo(a): o <Em>custo estimado em reais</Em> aparece em tempo real em todas as telas.
      </Callout>

      <Sub>Como colocar a chave no app</Sub>
      <Steps
        items={[
          <>Clique no ícone de <Em>engrenagem ⚙</Em> no canto superior direito.</>,
          <>Abra a aba <Em>“Chaves de API”</Em>.</>,
          <>Cole a chave no campo do provedor correspondente.</>,
          <>Pronto — pode fechar. São só duas chaves: Gemini para voz e OpenRouter para texto.</>,
        ]}
      />

      <Sub>Onde pegar cada chave</Sub>
      <div className="space-y-2.5">
        {providers.map((p) => (
          <div key={p.name} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-100 text-sm">{p.name}</span>
              <Code>{p.url}</Code>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mt-1.5">{p.what}</p>
          </div>
        ))}
      </div>

      <Callout tone="safe" title="Privacidade">
        Suas chaves ficam salvas <Em>apenas neste navegador</Em> (no armazenamento local) e vão direto aos provedores oficiais — nunca
        passam por um servidor do app. Nunca compartilhe suas chaves: quem as tiver pode gerar custos em seu nome.
      </Callout>
    </>
  )
}

function PathsSection() {
  return (
    <>
      <Heading
        icon={<Route className="w-5 h-5" />}
        title="Qual caminho usar"
        lead="A configuração principal usa duas chaves: Gemini para voz ao vivo e OpenRouter para texto."
      />

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-emerald-300">🟢 Voz ao vivo — Google Gemini</div>
        <P>O <Em>Gemini</Em> cuida da conversa por voz em tempo real, com interrupções naturais, pausa/retomada e transcrição dos dois lados.</P>
      </div>

      <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-sky-300">🔵 Texto e análise — OpenRouter</div>
        <P>O <Em>OpenRouter</Em> roda o preparo e o relatório usando modelos como Claude, GPT, Gemini e DeepSeek, sem chaves diretas desses provedores.</P>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-slate-200">⚪ Modelos por função</div>
        <P>Em <Em>Configurações → Modelos</Em>, você escolhe qual modelo OpenRouter cada agente de texto usa. A voz continua no Gemini Live.</P>
      </div>

      <Callout tone="warn" title="Atenção à voz">
        A conversa por voz funciona com a chave do <Em>Google Gemini</Em>. O OpenRouter fica responsável pelo preparo e pela análise.
      </Callout>
    </>
  )
}

function PrepareSection() {
  return (
    <>
      <Heading
        icon={<ClipboardList className="w-5 h-5" />}
        title="Preparar a entrevista"
        lead="Com as chaves prontas, você preenche um formulário rápido na tela inicial. Vamos campo a campo."
      />

      <Sub>Vaga e contexto</Sub>
      <ul className="space-y-2 text-sm text-slate-300 leading-relaxed list-none">
        <li>• <Em>Área</Em> e <Em>Tipo de entrevista</Em> (RH, Técnica, Case ou Mista). Se a sua área não estiver na lista, escolha “Outra”.</li>
        <li>• <Em>Descrição da vaga (JD)</Em> — o campo mais importante e obrigatório.</li>
        <li>• <Em>Seu currículo (opcional)</Em> — usado como contexto; nunca te penaliza por algo que você não falou.</li>
      </ul>
      <Callout tone="tip" title="O ingrediente secreto: a vaga (JD)">
        Cole o anúncio <Em>completo</Em> — responsabilidades, requisitos, sobre a empresa. Quanto mais contexto, mais realista e sob
        medida fica a entrevista.
      </Callout>

      <Sub>Idioma e voz</Sub>
      <div className="grid sm:grid-cols-2 gap-3">
        <Tile icon={<Globe2 className="w-4 h-4" />} title="Idiomas independentes">Treine em 🇧🇷 português ou 🇺🇸 inglês — e receba o relatório no idioma que preferir (ex.: entrevista em inglês, feedback em português).</Tile>
        <Tile icon={<Mic2 className="w-4 h-4" />} title="Voz & Duração">Escolha a voz do entrevistador e a duração (15, 30 ou 45 min). Comece com 30 para uma simulação completa.</Tile>
      </div>
      <Callout tone="info" title="Modo stress 🔥">
        Ligado, o entrevistador fica mais cético e pressiona por justificativas — ótimo para treinar firmeza. Deixe desligado na sua primeira vez.
      </Callout>

      <Sub>Pesos da avaliação</Sub>
      <P>
        Aqui você diz <Em>o que mais importa</Em> para a sua vaga, e o relatório dá mais peso a isso na nota final: Comunicação,
        Técnico, Culture Fit, Estrutura (STAR) e Profundidade. Arraste as barrinhas — não precisa somar 100%, é só importância relativa.
      </P>

      <Callout tone="safe" title="Seu rascunho fica salvo">
        O formulário é salvo automaticamente neste navegador. Se você fechar e voltar depois, continua tudo preenchido.
      </Callout>
    </>
  )
}

function LiveSection() {
  return (
    <>
      <Heading
        icon={<Mic2 className="w-5 h-5" />}
        title="Durante a entrevista"
        lead="A parte principal: a conversa por voz, em tempo real."
      />
      <ul className="space-y-2 text-sm text-slate-300 leading-relaxed list-none">
        <li>🟣 A <Em>bolinha (orbe)</Em> no centro pulsa enquanto a conversa acontece.</li>
        <li>🎤 <Em>Fale naturalmente</Em>, como falaria com uma pessoa — o app capta sua voz e o entrevistador responde em voz alta.</li>
        <li>💬 Você pode <Em>interromper o entrevistador</Em> falando por cima dele — ele para e te escuta.</li>
        <li>📝 A <Em>transcrição aparece ao vivo</Em>, e o <Em>tempo e o custo estimado</Em> ficam visíveis no topo.</li>
      </ul>

      <Sub>Os botões</Sub>
      <div className="space-y-2.5">
        <Tile icon={<MicOff className="w-4 h-4" />} title="Microfone">Silencia/reativa o seu microfone. Útil para tossir ou atender alguém.</Tile>
        <Tile icon={<Pause className="w-4 h-4" />} title="Pausar / Retomar">Congela a entrevista para você fazer anotações com calma (veja abaixo).</Tile>
        <Tile icon={<PhoneOff className="w-4 h-4" />} title="Encerrar entrevista">Termina a conversa e gera o relatório. O entrevistador também se despede sozinho ao fim do roteiro.</Tile>
      </div>

      <Callout tone="tip" title="O botão de pausa ⏸️">
        Ao pausar: o microfone para e o entrevistador <Em>não te ouve nem fala</Em>; o <Em>tempo e o custo congelam</Em> (você não gasta
        minutos nem dinheiro parado); abre um <Em>bloco de anotações</Em>; e <Em>nada do contexto é perdido</Em> — ao retomar, a conversa
        volta exatamente de onde parou.
      </Callout>
    </>
  )
}

function SpectatorSection() {
  return (
    <>
      <Heading
        icon={<Bot className="w-5 h-5" />}
        title="Modo espectador: uma IA responde por você"
        lead="Ouça duas IAs conversando — o entrevistador de sempre e uma IA candidata que assume o SEU currículo e responde com maestria. Perfeito para aprender como seriam as respostas ideais."
      />
      <Sub>Como usar</Sub>
      <Steps
        items={[
          <>Na tela inicial, em <Em>&quot;Quem responde às perguntas&quot;</Em>, escolha <Em>IA candidata (espectador)</Em>.</>,
          <>Cole o seu <Em>CV</Em> — neste modo ele é obrigatório: é a identidade que a candidata assume.</>,
          <>Prepare a entrevista normalmente e aperte <Em>Começar</Em>.</>,
          <>Apenas ouça: cada IA tem a sua voz, e a transcrição aparece ao vivo. No final, o relatório avalia a performance da candidata.</>,
        ]}
      />
      <Sub>Para que serve</Sub>
      <div className="grid sm:grid-cols-2 gap-3">
        <Tile icon={<Lightbulb className="w-4 h-4" />} title="Aprender o padrão-ouro">
          Respostas com estrutura STAR, métricas e ownership — ouça o que separa uma resposta comum de uma excelente.
        </Tile>
        <Tile icon={<BarChart3 className="w-4 h-4" />} title="Comparar com você">
          Rode a mesma vaga no modo normal e no espectador e compare os dois relatórios.
        </Tile>
      </div>
      <Callout tone="tip" title="Personalize a candidata">
        Em ⚙ Configurações → Modelos → <Em>IA Candidata</Em> você escolhe o modelo que pensa as respostas,
        a voz e a engine. A padrão (texto + voz TTS) é a recomendada; a &quot;dupla sessão Gemini Live&quot; é experimental.
      </Callout>
      <Callout tone="warn" title="Se a resposta falhar">
        Instabilidades do provedor acontecem. Aparece um botão <Em>Re-tentar resposta</Em> — a entrevista não é perdida.
        E o modo tem teto de tempo: encerra sozinho alguns minutos após o previsto.
      </Callout>
    </>
  )
}

function ReportSection() {
  return (
    <>
      <Heading
        icon={<BarChart3 className="w-5 h-5" />}
        title="Seu relatório de desempenho"
        lead="Quando a entrevista acaba, o Analista estuda tudo o que foi dito e monta um relatório completo."
      />
      <ul className="space-y-2 text-sm text-slate-300 leading-relaxed list-none">
        <li>• <Em>Nota geral (0 a 5)</Em>, já com os pesos que você definiu. O anel fica 🟢 verde, 🟡 amarelo ou 🔴 vermelho.</li>
        <li>• <Em>Resumo executivo</Em> com a visão geral do desempenho.</li>
        <li>• <Em>Pontos fortes ✅ e gaps ⚠️</Em>, com <Em>as suas próprias frases citadas</Em> como evidência.</li>
        <li>• <Em>Momentos-chave</Em>: uma linha do tempo dos instantes mais marcantes.</li>
        <li>• <Em>Competências</Em>: notas separadas por habilidade.</li>
        <li>• <Em>Feedback por pergunta</Em>: clique para expandir e ver até um exemplo de resposta melhorada.</li>
        <li>• <Em>Plano de treino de 2 semanas</Em>: metas práticas, semana a semana.</li>
      </ul>
      <P>No topo você pode <Em>🖨️ Imprimir / salvar em PDF</Em> para estudar depois, e iniciar uma <Em>🔄 Nova entrevista</Em> quando quiser.</P>

      <Callout tone="safe" title="Tranquilidade garantida">
        Se algo der errado ao gerar o relatório, a entrevista <Em>não é perdida</Em>: o app guarda a transcrição e oferece tentar de novo
        ou copiar a conversa.
      </Callout>
    </>
  )
}

function AdvancedSection() {
  return (
    <>
      <Heading
        icon={<SlidersHorizontal className="w-5 h-5" />}
        title="Ajustes avançados (opcional)"
        lead="O app já funciona muito bem com o padrão de fábrica. Mexa aqui só se tiver curiosidade. Tudo fica na engrenagem ⚙."
      />
      <Tile icon={<Sparkles className="w-4 h-4" />} title="Aba “Modelos”">
        Escolha qual inteligência cada assistente usa. A lógica das sugestões é gastar onde faz diferença (o Analista usa o modelo mais
        inteligente) e economizar onde não faz (a pesquisa inicial). Um selo mostra se você está no “recomendado” ou em um “customizado”,
        e o botão “Usar recomendado” volta atrás a qualquer momento.
      </Tile>
      <Tile icon={<MessageSquareText className="w-4 h-4" />} title="Aba “Prompt do Entrevistador”">
        Dê instruções específicas de duas formas: o atalho rápido <Em>“Instruções adicionais”</Em> (ex.: “Foque em liderança”) ou o
        <Em> template completo</Em>, para reescrever tudo. O botão “Restaurar template padrão” devolve o original.
      </Tile>
      <Tile icon={<Receipt className="w-4 h-4" />} title="Aba “Custos”">
        Ajuste a <Em>cotação do dólar (USD → BRL)</Em> para os valores em reais ficarem certos. Custos de texto usam a contagem real de
        uso; os de voz são estimados pela duração da conversa.
      </Tile>
      <Callout tone="money" title="Quer gastar menos?">
        Troque os modelos para opções mais econômicas na aba “Modelos” — por exemplo, deixando tudo no Gemini.
      </Callout>
    </>
  )
}

function TipsSection() {
  const tips: ReactNode[] = [
    <><Em>Capriche na descrição da vaga.</Em> É o ingrediente mais importante.</>,
    <><Em>Cole seu currículo</Em> para perguntas personalizadas à sua trajetória.</>,
    <><Em>Fale em voz alta e com naturalidade</Em> — treine a fala, não a resposta “perfeita” escrita na cabeça.</>,
    <><Em>Repita a simulação.</Em> A evolução entre uma tentativa e outra é onde está o ouro.</>,
    <><Em>Ajuste os pesos</Em> para o que aquela vaga valoriza.</>,
    <><Em>Use o modo stress</Em> quando já estiver confortável.</>,
    <><Em>Use fone com microfone</Em> num ambiente silencioso.</>,
  ]
  const faqs: Array<{ q: string; a: ReactNode }> = [
    { q: 'Falo e nada acontece / não ouço o entrevistador.', a: <>Confira: (1) você <Em>autorizou o microfone</Em> no navegador; (2) o <Em>volume</Em> está ligado; (3) a <Em>chave Google Gemini</Em> está preenchida. Recarregar a página costuma resolver.</> },
    { q: 'Apareceu “chave não configurada”.', a: <>Falta colar a chave daquele provedor. Vá na engrenagem ⚙ → “Chaves de API”.</> },
    { q: 'A entrevista por voz exige qual chave?', a: <>A do <Em>Google Gemini</Em>. O OpenRouter cuida dos agentes de texto, mas a parte falada ao vivo depende do Gemini Live.</> },
    { q: 'Quanto vou gastar?', a: <>Geralmente de centavos a poucos reais por entrevista. O valor estimado em reais aparece em tempo real no topo. Para gastar menos, use modelos econômicos.</> },
    { q: 'Pausei por muito tempo, vou perder a conversa?', a: <>Não. Ao retomar, o entrevistador lembra de tudo; em pausas longas o app reconecta sozinho preservando o contexto.</> },
    { q: 'Preciso instalar alguma coisa?', a: <>Não. O app roda no navegador. Você só precisa de internet, um microfone e as chaves configuradas.</> },
  ]
  return (
    <>
      <Heading icon={<Lightbulb className="w-5 h-5" />} title="Dicas & soluções" lead="Pequenos hábitos que fazem grande diferença — e respostas para os tropeços mais comuns." />

      <Sub>Para tirar o máximo proveito</Sub>
      <ul className="space-y-2 text-sm text-slate-300 leading-relaxed list-none">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-2.5">
            <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <Sub>Perguntas frequentes</Sub>
      <div className="space-y-2.5">
        {faqs.map((f, i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="font-semibold text-slate-100 text-sm mb-1">❓ {f.q}</div>
            <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>

      <Callout tone="tip" title="Pronto para começar? 🚀">
        Configure ao menos uma chave (o Gemini já basta), cole a vaga dos seus sonhos, converse por voz e leia seu relatório. Repita até se
        sentir confiante. Boa sorte na entrevista de verdade! 💪
      </Callout>
    </>
  )
}
