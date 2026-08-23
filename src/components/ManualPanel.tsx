import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle, BarChart3, BookOpen, ClipboardList, Globe2, Info, KeyRound,
  Lightbulb, MessageSquareText, Mic2, MicOff, Pause, PhoneOff, Receipt, Rocket, Route,
  ShieldCheck, SlidersHorizontal, Sparkles, Wallet, X,
} from 'lucide-react'
import { useSettings } from '../store'
import type { UiLanguage } from '../types'
import { Card } from './ui'

type SectionId =
  | 'start' | 'keys' | 'paths' | 'prepare' | 'live' | 'report' | 'advanced' | 'tips'

type Tone = 'info' | 'tip' | 'warn' | 'money' | 'safe'

interface TileContent {
  title: string
  body: string
  icon: ReactNode
}

interface FaqContent {
  q: string
  a: string
}

interface ManualCopy {
  title: string
  subtitle: string
  labels: {
    oneSentence: string
    publicRepo: string
    cost: string
    privacy: string
    close: string
  }
  sections: Record<SectionId, string>
  start: {
    title: string
    lead: string
    oneLine: string
    publicRepo: string
    stepsTitle: string
    steps: string[]
    teamTitle: string
    teamLead: string
    team: TileContent[]
  }
  keys: {
    title: string
    lead: string
    explanation: string
    cost: string
    stepsTitle: string
    steps: string[]
    providersTitle: string
    providers: Array<{ name: string; url: string; what: string }>
    privacy: string
  }
  paths: {
    title: string
    lead: string
    easy: string
    quality: string
    optional: string
    voiceWarning: string
  }
  prepare: {
    title: string
    lead: string
    contextTitle: string
    context: string[]
    jdTip: string
    languageTitle: string
    languageTiles: TileContent[]
    stress: string
    weightsTitle: string
    weights: string
    spectator: string
    draft: string
  }
  live: {
    title: string
    lead: string
    bullets: string[]
    buttonsTitle: string
    buttons: TileContent[]
    pause: string
  }
  report: {
    title: string
    lead: string
    bullets: string[]
    actions: string
    safety: string
  }
  advanced: {
    title: string
    lead: string
    tiles: TileContent[]
    saving: string
  }
  tips: {
    title: string
    lead: string
    tipsTitle: string
    tips: string[]
    faqTitle: string
    faqs: FaqContent[]
    closing: string
  }
}

const MANUAL_COPY: Record<UiLanguage, ManualCopy> = {
  'en-US': {
    title: 'User guide and manual',
    subtitle: 'Everything you need to configure and use the app',
    labels: {
      oneSentence: 'One sentence',
      publicRepo: 'Public repository',
      cost: 'Cost',
      privacy: 'Privacy',
      close: 'Close',
    },
    sections: {
      start: 'How it works',
      keys: 'API keys',
      paths: 'Which path to use',
      prepare: 'Prepare the interview',
      live: 'During the interview',
      report: 'Your report',
      advanced: 'Advanced settings',
      tips: 'Tips and help',
    },
    start: {
      title: 'How it works',
      lead: 'Use the app as a private interview practice room: paste a role, speak with an AI interviewer, and get an evidence-based report.',
      oneLine: 'Paste the job description, run a voice interview, and use the feedback to practice before the real interview.',
      publicRepo: 'This public repository is source code for study, portfolio, and local use. There is no official hosted public demo. A hosted multi-user version needs a backend/proxy, usage limits, and temporary credentials for real-time voice.',
      stepsTitle: 'Four steps',
      steps: [
        'Add a voice key to .env.local and configure the OpenRouter browser key for text agents.',
        'Paste the job description for the role you want.',
        'Talk out loud with the interviewer, like a real interview.',
        'Read the report, practice the weak spots, and repeat.',
      ],
      teamTitle: 'The AI team behind the scenes',
      teamLead: 'Four agents work together while you only interact with the app.',
      team: [
        { icon: <Sparkles className="w-4 h-4" />, title: 'Researcher', body: 'Reads the role and resume to infer company culture, values, and interview style.' },
        { icon: <ClipboardList className="w-4 h-4" />, title: 'Planner', body: 'Builds a timed interview plan tailored to the role and seniority.' },
        { icon: <Mic2 className="w-4 h-4" />, title: 'Interviewer', body: 'Conducts the real-time voice conversation and asks adaptive follow-ups.' },
        { icon: <BarChart3 className="w-4 h-4" />, title: 'Analyst', body: 'Audits the transcript and writes the performance report with evidence.' },
      ],
    },
    keys: {
      title: 'API keys',
      lead: 'Voice and text credentials follow separate local paths.',
      explanation: 'Put GEMINI_API_KEY and/or OPENAI_API_KEY in .env.local for voice. The loopback broker exchanges them for short-lived credentials. The OpenRouter key entered in Settings remains browser-only and is used by text agents.',
      cost: 'The app is free, but providers charge for usage. The running estimate appears in the app so you can watch costs.',
      stepsTitle: 'How to add keys',
      steps: ['Create .env.local from .env.example and add the selected voice provider key.', 'Start both the app and broker with npm run dev.', 'Open Settings and add the OpenRouter key for text roles.', 'Check the local voice broker status before starting.'],
      providersTitle: 'Where to get keys',
      providers: [
        { name: 'Google Gemini', url: 'aistudio.google.com/apikey', what: 'Gemini Live and spectator TTS through .env.local.' },
        { name: 'OpenAI', url: 'platform.openai.com/api-keys', what: 'Realtime interviewer voice through .env.local.' },
        { name: 'OpenRouter', url: 'openrouter.ai/keys', what: 'Browser BYOK key for Researcher, Planner, Analyst, and AI Candidate text models.' },
      ],
      privacy: 'Full voice keys remain in .env.local and never enter localStorage. Text-agent BYOK keys remain in this browser. Job descriptions, resumes, audio, transcripts, and reports are sent to the selected providers. Do not paste confidential documents, secrets, or sensitive personal data.',
    },
    paths: {
      title: 'Which path to use',
      lead: 'You do not need every provider. Pick the setup that matches your goal.',
      easy: 'Easiest: use Google Gemini for voice through .env.local and one OpenRouter key for all text roles.',
      quality: 'Quality default: Gemini or OpenAI for voice plus stronger Claude-family models through OpenRouter for preparation and analysis.',
      optional: 'OpenAI is a premium interviewer voice option. Gemini is also required when spectator mode uses candidate TTS.',
      voiceWarning: 'Voice interviews require Gemini Live or OpenAI Realtime. OpenRouter alone does not run the voice part.',
    },
    prepare: {
      title: 'Prepare the interview',
      lead: 'The setup form defines the simulation before any provider call runs.',
      contextTitle: 'Role and context',
      context: [
        'Choose the role area and interview type.',
        'Paste the full job description. This is the most important input.',
        'Optionally paste your resume. It helps personalize questions, but the analyst only scores what you actually said.',
      ],
      jdTip: 'The more complete the job description, the more realistic the plan.',
      languageTitle: 'Language and voice',
      languageTiles: [
        { icon: <Globe2 className="w-4 h-4" />, title: 'Separate languages', body: 'The interview language and report language are independent. You can interview in English and read feedback in Portuguese.' },
        { icon: <Mic2 className="w-4 h-4" />, title: 'Voice and duration', body: 'Choose a model-specific voice, reasoning mode, delivery style, and a 15, 30, or 45 minute session.' },
      ],
      stress: 'Stress mode makes the interviewer more skeptical and presses for rationale while staying professional.',
      weightsTitle: 'Scoring weights',
      weights: 'Adjust what matters most: communication, technical depth, culture fit, STAR structure, and depth.',
      spectator: 'Spectator mode lets an AI candidate answer from your resume while you listen. Text plus Gemini TTS is recommended; dual Gemini Live remains experimental.',
      draft: 'Your setup draft is saved locally in this browser.',
    },
    live: {
      title: 'During the interview',
      lead: 'This is the real-time voice session.',
      bullets: [
        'The central orb reacts while the interview is running.',
        'Speak naturally; the interviewer listens and responds by voice.',
        'You can interrupt the interviewer by speaking over it.',
        'The live transcript, timer, and estimated cost stay visible.',
      ],
      buttonsTitle: 'Controls',
      buttons: [
        { icon: <MicOff className="w-4 h-4" />, title: 'Microphone', body: 'Mute or unmute your microphone.' },
        { icon: <Pause className="w-4 h-4" />, title: 'Pause / Resume', body: 'Pause the session to take notes without sending audio.' },
        { icon: <PhoneOff className="w-4 h-4" />, title: 'End interview', body: 'Finish the conversation and generate the report.' },
      ],
      pause: 'When paused, the microphone stops sending audio, playback is suspended, time freezes, and your notes remain available until the interview closes.',
    },
    report: {
      title: 'Your report',
      lead: 'After the interview, the Analyst reviews the transcript and generates a performance report.',
      bullets: [
        'Overall score from 0 to 5, weighted by your setup.',
        'Strengths and gaps with direct transcript evidence.',
        'Key moments where the interview was won or lost.',
        'Competency breakdown, question-level feedback, and a two-week practice plan.',
      ],
      actions: 'You can print or save the report as PDF and then start a new interview.',
      safety: 'If report generation fails, the transcript is kept so you can retry or copy it.',
    },
    advanced: {
      title: 'Advanced settings',
      lead: 'The defaults are enough to start, but you can tune the pipeline.',
      tiles: [
        { icon: <Sparkles className="w-4 h-4" />, title: 'Models', body: 'Choose Default, Expressive, Premium, Economy, or Voice quality for the interviewer and a model for each text role.' },
        { icon: <MessageSquareText className="w-4 h-4" />, title: 'Interviewer prompt', body: 'Add quick instructions or edit the full interviewer template.' },
        { icon: <Receipt className="w-4 h-4" />, title: 'Costs', body: 'Adjust the USD to BRL exchange rate used for estimated display costs.' },
      ],
      saving: 'To spend less, switch text agents to cheaper models in Settings.',
    },
    tips: {
      title: 'Tips and help',
      lead: 'Small habits make the simulation more useful.',
      tipsTitle: 'Best practices',
      tips: [
        'Paste the full job post, not just the title.',
        'Use your resume for better follow-up questions.',
        'Speak out loud instead of drafting perfect written answers.',
        'Repeat the simulation after reading the report.',
        'Use headphones and a quiet room for better transcription.',
      ],
      faqTitle: 'Frequently asked questions',
      faqs: [
        { q: 'I cannot hear the interviewer.', a: 'Check microphone permission, output volume, and the local voice broker status.' },
        { q: 'The app says a voice key is missing.', a: 'Add the selected provider key to .env.local and restart npm run dev.' },
        { q: 'Can I paste any resume or role?', a: 'Avoid confidential material, trade secrets, and sensitive personal data because providers process the session data.' },
        { q: 'Do I need to install anything?', a: 'Yes. Use Node.js 20+ with npm run dev, or use the local installer and the interview-pro command.' },
      ],
      closing: 'Configure a key, paste a role, speak with the interviewer, read the report, and repeat until you feel ready.',
    },
  },
  'pt-BR': {
    title: 'Guia e manual de uso',
    subtitle: 'Tudo o que voce precisa para configurar e usar o app',
    labels: {
      oneSentence: 'Em uma frase',
      publicRepo: 'Repositorio publico',
      cost: 'Custo',
      privacy: 'Privacidade',
      close: 'Fechar',
    },
    sections: {
      start: 'Como funciona',
      keys: 'Chaves de API',
      paths: 'Qual caminho usar',
      prepare: 'Preparar a entrevista',
      live: 'Durante a entrevista',
      report: 'Seu relatorio',
      advanced: 'Ajustes avancados',
      tips: 'Dicas e ajuda',
    },
    start: {
      title: 'Como funciona',
      lead: 'Use o app como uma sala privada de treino: cole uma vaga, converse por voz com uma IA e receba um relatorio baseado em evidencias.',
      oneLine: 'Cole a descricao da vaga, faca uma entrevista por voz e use o feedback para praticar antes da entrevista real.',
      publicRepo: 'Este repositorio publico e codigo-fonte para estudo, portfolio e uso local. Nao ha demo publica oficial hospedada. Uma versao online multiusuario precisa de backend/proxy, limites de uso e credenciais temporarias para voz em tempo real.',
      stepsTitle: 'Quatro passos',
      steps: [
        'Adicione uma chave de voz ao .env.local e a chave OpenRouter no navegador para os agentes de texto.',
        'Cole a descricao da vaga que voce quer treinar.',
        'Converse em voz alta com o entrevistador, como numa entrevista real.',
        'Leia o relatorio, treine os pontos fracos e repita.',
      ],
      teamTitle: 'A equipe de IA nos bastidores',
      teamLead: 'Quatro agentes trabalham juntos enquanto voce interage apenas com o app.',
      team: [
        { icon: <Sparkles className="w-4 h-4" />, title: 'Pesquisador', body: 'Le a vaga e o CV para inferir cultura, valores e estilo de entrevista.' },
        { icon: <ClipboardList className="w-4 h-4" />, title: 'Planejador', body: 'Cria um roteiro cronometrado ajustado a vaga e senioridade.' },
        { icon: <Mic2 className="w-4 h-4" />, title: 'Entrevistador', body: 'Conduz a conversa por voz em tempo real e faz follow-ups.' },
        { icon: <BarChart3 className="w-4 h-4" />, title: 'Analista', body: 'Audita a transcricao e escreve o relatorio com evidencias.' },
      ],
    },
    keys: {
      title: 'Chaves de API',
      lead: 'As credenciais de voz e texto seguem caminhos locais separados.',
      explanation: 'Coloque GEMINI_API_KEY e/ou OPENAI_API_KEY no .env.local para voz. O broker loopback troca essas chaves por credenciais temporarias. A chave OpenRouter inserida em Configuracoes fica no navegador e e usada pelos agentes de texto.',
      cost: 'O app e gratuito, mas os provedores cobram pelo uso. O custo estimado aparece no app para voce acompanhar.',
      stepsTitle: 'Como adicionar chaves',
      steps: ['Crie o .env.local a partir do .env.example e adicione a chave do provedor de voz.', 'Inicie app e broker com npm run dev.', 'Abra Configuracoes e adicione a chave OpenRouter para os agentes de texto.', 'Confira o status do broker local antes de comecar.'],
      providersTitle: 'Onde pegar cada chave',
      providers: [
        { name: 'Google Gemini', url: 'aistudio.google.com/apikey', what: 'Gemini Live e TTS do modo espectador via .env.local.' },
        { name: 'OpenAI', url: 'platform.openai.com/api-keys', what: 'Voz do entrevistador Realtime via .env.local.' },
        { name: 'OpenRouter', url: 'openrouter.ai/keys', what: 'Chave BYOK no navegador para Pesquisador, Planejador, Analista e texto da IA Candidata.' },
      ],
      privacy: 'As chaves completas de voz ficam no .env.local e nunca entram no localStorage. As chaves BYOK dos agentes de texto permanecem neste navegador. Vaga, CV, audio, transcricao e relatorio sao enviados aos provedores escolhidos. Nao cole documentos confidenciais, segredos ou dados pessoais sensiveis.',
    },
    paths: {
      title: 'Qual caminho usar',
      lead: 'Voce nao precisa de todos os provedores. Escolha a configuracao que combina com seu objetivo.',
      easy: 'Mais facil: use Google Gemini para voz via .env.local e uma chave OpenRouter para todos os agentes de texto.',
      quality: 'Padrao de qualidade: Gemini ou OpenAI para voz e modelos fortes da familia Claude via OpenRouter para preparo e analise.',
      optional: 'OpenAI e uma opcao premium para o entrevistador. Gemini tambem e necessario quando o modo espectador usa TTS da candidata.',
      voiceWarning: 'Entrevistas por voz exigem Gemini Live ou OpenAI Realtime. OpenRouter sozinho nao roda a parte falada.',
    },
    prepare: {
      title: 'Preparar a entrevista',
      lead: 'O formulario define a simulacao antes de qualquer chamada aos provedores.',
      contextTitle: 'Vaga e contexto',
      context: [
        'Escolha area e tipo de entrevista.',
        'Cole a descricao completa da vaga. Este e o input mais importante.',
        'Opcionalmente cole seu CV. Ele personaliza perguntas, mas o analista so pontua o que voce disse.',
      ],
      jdTip: 'Quanto mais completa a vaga, mais realista fica o roteiro.',
      languageTitle: 'Idioma e voz',
      languageTiles: [
        { icon: <Globe2 className="w-4 h-4" />, title: 'Idiomas separados', body: 'Idioma da entrevista e do relatorio sao independentes. Voce pode entrevistar em ingles e ler feedback em portugues.' },
        { icon: <Mic2 className="w-4 h-4" />, title: 'Voz e duracao', body: 'Escolha voz compativel, raciocinio, estilo de fala e uma sessao de 15, 30 ou 45 minutos.' },
      ],
      stress: 'Modo stress deixa o entrevistador mais cetico e exige justificativas mantendo o profissionalismo.',
      weightsTitle: 'Pesos de avaliacao',
      weights: 'Ajuste o que mais importa: comunicacao, tecnica, culture fit, estrutura STAR e profundidade.',
      spectator: 'O modo espectador deixa uma IA candidata responder com base no seu CV enquanto voce ouve. Texto mais Gemini TTS e o recomendado; Gemini Live duplo continua experimental.',
      draft: 'Seu rascunho fica salvo localmente neste navegador.',
    },
    live: {
      title: 'Durante a entrevista',
      lead: 'Esta e a sessao de voz em tempo real.',
      bullets: [
        'O orbe central reage enquanto a entrevista roda.',
        'Fale naturalmente; o entrevistador ouve e responde por voz.',
        'Voce pode interromper falando por cima dele.',
        'Transcricao, tempo e custo estimado ficam visiveis.',
      ],
      buttonsTitle: 'Controles',
      buttons: [
        { icon: <MicOff className="w-4 h-4" />, title: 'Microfone', body: 'Silencia ou reativa seu microfone.' },
        { icon: <Pause className="w-4 h-4" />, title: 'Pausar / Retomar', body: 'Pausa a sessao para anotar sem enviar audio.' },
        { icon: <PhoneOff className="w-4 h-4" />, title: 'Encerrar entrevista', body: 'Finaliza a conversa e gera o relatorio.' },
      ],
      pause: 'Ao pausar, o microfone para de enviar audio, a reproducao e suspensa, o tempo congela e suas anotacoes ficam disponiveis ate fechar a entrevista.',
    },
    report: {
      title: 'Seu relatorio',
      lead: 'Depois da entrevista, o Analista revisa a transcricao e gera o relatorio de performance.',
      bullets: [
        'Nota geral de 0 a 5, ponderada pelos pesos definidos.',
        'Pontos fortes e gaps com evidencias literais da transcricao.',
        'Momentos-chave onde a entrevista foi ganha ou perdida.',
        'Competencias, feedback por pergunta e plano de treino de duas semanas.',
      ],
      actions: 'Voce pode imprimir ou salvar em PDF e iniciar uma nova entrevista.',
      safety: 'Se a geracao falhar, a transcricao fica preservada para tentar de novo ou copiar.',
    },
    advanced: {
      title: 'Ajustes avancados',
      lead: 'Os padroes sao suficientes para comecar, mas voce pode ajustar o pipeline.',
      tiles: [
        { icon: <Sparkles className="w-4 h-4" />, title: 'Modelos', body: 'Escolha Padrao, Expressivo, Premium, Economico ou Qualidade de voz para o entrevistador e um modelo para cada funcao de texto.' },
        { icon: <MessageSquareText className="w-4 h-4" />, title: 'Prompt do entrevistador', body: 'Adicione instrucoes rapidas ou edite o template completo do entrevistador.' },
        { icon: <Receipt className="w-4 h-4" />, title: 'Custos', body: 'Ajuste a cotacao USD para BRL usada nos custos estimados.' },
      ],
      saving: 'Para gastar menos, troque os agentes de texto para modelos mais baratos em Configuracoes.',
    },
    tips: {
      title: 'Dicas e ajuda',
      lead: 'Pequenos habitos deixam a simulacao mais util.',
      tipsTitle: 'Boas praticas',
      tips: [
        'Cole a vaga completa, nao apenas o titulo.',
        'Use seu CV para melhorar os follow-ups.',
        'Fale em voz alta em vez de escrever mentalmente a resposta perfeita.',
        'Repita a simulacao depois de ler o relatorio.',
        'Use fones e um ambiente silencioso para melhorar a transcricao.',
      ],
      faqTitle: 'Perguntas frequentes',
      faqs: [
        { q: 'Nao ouco o entrevistador.', a: 'Confira permissao de microfone, volume de saida e o status do broker local.' },
        { q: 'O app diz que falta uma chave de voz.', a: 'Adicione a chave do provedor selecionado ao .env.local e reinicie npm run dev.' },
        { q: 'Posso colar qualquer CV ou vaga?', a: 'Evite material confidencial, segredos comerciais e dados pessoais sensiveis, pois os provedores processam os dados da sessao.' },
        { q: 'Preciso instalar algo?', a: 'Sim. Use Node.js 20+ com npm run dev ou o instalador local com o comando interview-pro.' },
      ],
      closing: 'Configure uma chave, cole uma vaga, converse com o entrevistador, leia o relatorio e repita ate se sentir pronto.',
    },
  },
}

const SECTIONS: Array<{ id: SectionId; icon: ReactNode }> = [
  { id: 'start', icon: <Rocket className="w-4 h-4" /> },
  { id: 'keys', icon: <KeyRound className="w-4 h-4" /> },
  { id: 'paths', icon: <Route className="w-4 h-4" /> },
  { id: 'prepare', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'live', icon: <Mic2 className="w-4 h-4" /> },
  { id: 'report', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'advanced', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'tips', icon: <Lightbulb className="w-4 h-4" /> },
]

export default function ManualPanel({ onClose }: { onClose: () => void }) {
  const uiLanguage = useSettings((s) => s.uiLanguage)
  const t = MANUAL_COPY[uiLanguage]
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
        <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-indigo-600/10 via-transparent to-emerald-600/10">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">{t.title}</h2>
              <p className="text-[11px] text-slate-500 leading-tight">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400" title={t.labels.close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0">
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
                <span className="hidden sm:inline md:inline">{t.sections[s.id]}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-9 md:py-8">
            <div className="max-w-2xl mx-auto space-y-6">
              {active === 'start' && <StartSection copy={t} />}
              {active === 'keys' && <KeysSection copy={t} />}
              {active === 'paths' && <PathsSection copy={t} />}
              {active === 'prepare' && <PrepareSection copy={t} />}
              {active === 'live' && <LiveSection copy={t} />}
              {active === 'report' && <ReportSection copy={t} />}
              {active === 'advanced' && <AdvancedSection copy={t} />}
              {active === 'tips' && <TipsSection copy={t} />}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

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

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={it} className="flex gap-3 items-start">
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

function TileGrid({ items }: { items: TileContent[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <Tile key={item.title} icon={item.icon} title={item.title}>{item.body}</Tile>
      ))}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-slate-300 leading-relaxed list-none">
      {items.map((item) => <li key={item}>- {item}</li>)}
    </ul>
  )
}

function StartSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<Rocket className="w-5 h-5" />} title={copy.start.title} lead={copy.start.lead} />
      <Callout tone="tip" title={copy.labels.oneSentence}>{copy.start.oneLine}</Callout>
      <Callout tone="info" title={copy.labels.publicRepo}>{copy.start.publicRepo}</Callout>
      <Sub>{copy.start.stepsTitle}</Sub>
      <Steps items={copy.start.steps} />
      <Sub>{copy.start.teamTitle}</Sub>
      <P>{copy.start.teamLead}</P>
      <TileGrid items={copy.start.team} />
    </>
  )
}

function KeysSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<KeyRound className="w-5 h-5" />} title={copy.keys.title} lead={copy.keys.lead} />
      <P>{copy.keys.explanation}</P>
      <Callout tone="money" title={copy.labels.cost}>{copy.keys.cost}</Callout>
      <Sub>{copy.keys.stepsTitle}</Sub>
      <Steps items={copy.keys.steps} />
      <Sub>{copy.keys.providersTitle}</Sub>
      <div className="space-y-2.5">
        {copy.keys.providers.map((provider) => (
          <div key={provider.name} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-100 text-sm">{provider.name}</span>
              <code className="px-1.5 py-0.5 rounded-md bg-slate-800 text-indigo-200 text-[12px] font-mono">{provider.url}</code>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mt-1.5">{provider.what}</p>
          </div>
        ))}
      </div>
      <Callout tone="safe" title={copy.labels.privacy}>{copy.keys.privacy}</Callout>
    </>
  )
}

function PathsSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<Route className="w-5 h-5" />} title={copy.paths.title} lead={copy.paths.lead} />
      <Callout tone="tip">{copy.paths.easy}</Callout>
      <Callout tone="info">{copy.paths.quality}</Callout>
      <Callout tone="info">{copy.paths.optional}</Callout>
      <Callout tone="warn">{copy.paths.voiceWarning}</Callout>
    </>
  )
}

function PrepareSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<ClipboardList className="w-5 h-5" />} title={copy.prepare.title} lead={copy.prepare.lead} />
      <Sub>{copy.prepare.contextTitle}</Sub>
      <BulletList items={copy.prepare.context} />
      <Callout tone="tip">{copy.prepare.jdTip}</Callout>
      <Sub>{copy.prepare.languageTitle}</Sub>
      <TileGrid items={copy.prepare.languageTiles} />
      <Callout tone="info">{copy.prepare.stress}</Callout>
      <Sub>{copy.prepare.weightsTitle}</Sub>
      <P>{copy.prepare.weights}</P>
      <Callout tone="info">{copy.prepare.spectator}</Callout>
      <Callout tone="safe">{copy.prepare.draft}</Callout>
    </>
  )
}

function LiveSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<Mic2 className="w-5 h-5" />} title={copy.live.title} lead={copy.live.lead} />
      <BulletList items={copy.live.bullets} />
      <Sub>{copy.live.buttonsTitle}</Sub>
      <TileGrid items={copy.live.buttons} />
      <Callout tone="tip">{copy.live.pause}</Callout>
    </>
  )
}

function ReportSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<BarChart3 className="w-5 h-5" />} title={copy.report.title} lead={copy.report.lead} />
      <BulletList items={copy.report.bullets} />
      <P>{copy.report.actions}</P>
      <Callout tone="safe">{copy.report.safety}</Callout>
    </>
  )
}

function AdvancedSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<SlidersHorizontal className="w-5 h-5" />} title={copy.advanced.title} lead={copy.advanced.lead} />
      <TileGrid items={copy.advanced.tiles} />
      <Callout tone="money">{copy.advanced.saving}</Callout>
    </>
  )
}

function TipsSection({ copy }: { copy: ManualCopy }) {
  return (
    <>
      <Heading icon={<Lightbulb className="w-5 h-5" />} title={copy.tips.title} lead={copy.tips.lead} />
      <Sub>{copy.tips.tipsTitle}</Sub>
      <BulletList items={copy.tips.tips} />
      <Sub>{copy.tips.faqTitle}</Sub>
      <div className="space-y-2.5">
        {copy.tips.faqs.map((faq) => (
          <div key={faq.q} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="font-semibold text-slate-100 text-sm mb-1">{faq.q}</div>
            <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
      <Callout tone="tip">{copy.tips.closing}</Callout>
    </>
  )
}
