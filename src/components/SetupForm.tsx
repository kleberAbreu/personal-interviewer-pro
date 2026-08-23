import { useEffect, useState } from 'react'
import { Bot, BrainCircuit, Briefcase, FileText, Flame, Globe2, Mic2, Rocket, SlidersHorizontal, Timer, UserRound, Waves } from 'lucide-react'
import { compatibleVoice, supportsAffectiveDialog, supportsVoiceReasoning, voicesForModel } from '../config/models'
import { areaLabels, interviewTypeLabels, setupCopy } from '../i18n'
import { useSettings } from '../store'
import type { Area, CandidateMode, InterviewConfig, InterviewType, Language, VoiceExpressiveness, VoiceReasoningMode, Weights } from '../types'
import { Button, Card, Field, SectionTitle, inputCls } from './ui'

const AREAS: Area[] = ['Software', 'Produto', 'Dados', 'Comercial', 'Outra']
const TYPES: InterviewType[] = ['RH', 'Tecnica', 'Case', 'Mista']
const DRAFT_KEY = 'pip-setup-draft-v1'

const DEFAULT_WEIGHTS: Weights = { communication: 20, technical: 30, cultureFit: 15, structure: 15, depth: 20 }

function loadDraft(): Partial<InterviewConfig> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function SetupForm({ onStart }: { onStart: (config: InterviewConfig) => void }) {
  const interviewerRef = useSettings((s) => s.models.interviewer)
  const uiLanguage = useSettings((s) => s.uiLanguage)
  const t = setupCopy[uiLanguage]
  const voices = voicesForModel(interviewerRef)
  const reasoningAvailable = supportsVoiceReasoning(interviewerRef)
  const expressiveAvailable = supportsAffectiveDialog(interviewerRef)
  const draft = loadDraft()

  const [area, setArea] = useState<Area>(draft.area ?? 'Software')
  const [customArea, setCustomArea] = useState(draft.customArea ?? '')
  const [interviewType, setInterviewType] = useState<InterviewType>(draft.interviewType ?? 'Mista')
  const [interviewLanguage, setInterviewLanguage] = useState<Language>(draft.interviewLanguage ?? 'pt-BR')
  const [feedbackLanguage, setFeedbackLanguage] = useState<Language>(draft.feedbackLanguage ?? 'pt-BR')
  const [stressMode, setStressMode] = useState(draft.stressMode ?? false)
  const [candidateMode, setCandidateMode] = useState<CandidateMode>(draft.candidateMode ?? 'human')
  const [voiceName, setVoiceName] = useState(compatibleVoice(interviewerRef, draft.voiceName))
  const [voiceReasoningMode, setVoiceReasoningMode] = useState<VoiceReasoningMode>(draft.voiceReasoningMode ?? 'balanced')
  const [voiceExpressiveness, setVoiceExpressiveness] = useState<VoiceExpressiveness>(draft.voiceExpressiveness ?? 'standard')
  const [duration, setDuration] = useState<15 | 30 | 45>(draft.duration ?? 30)
  const [weights, setWeights] = useState<Weights>(draft.weights ?? DEFAULT_WEIGHTS)
  const [jobDescription, setJobDescription] = useState(draft.jobDescription ?? '')
  const [cvText, setCvText] = useState(draft.cvText ?? '')

  // Voz precisa pertencer ao engine atual: derivamos em render em vez de corrigir
  // por efeito (evita setState síncrono em useEffect / cascading renders).
  const selectedVoiceName = compatibleVoice(interviewerRef, voiceName)
  const selectedExpressiveness = expressiveAvailable ? voiceExpressiveness : 'standard'

  const config: InterviewConfig = {
    area, customArea: customArea || undefined, interviewType,
    interviewLanguage, feedbackLanguage, stressMode, candidateMode, voiceName: selectedVoiceName,
    voiceReasoningMode, voiceExpressiveness: selectedExpressiveness,
    duration, weights, jobDescription, cvText,
  }

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(config))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, customArea, interviewType, interviewLanguage, feedbackLanguage, stressMode, candidateMode, voiceName, voiceReasoningMode, voiceExpressiveness, duration, weights, jobDescription, cvText])

  const hasJobDescription = jobDescription.trim().length > 30
  const hasCandidateResume = candidateMode === 'human' || cvText.trim().length >= 100
  const canStart = hasJobDescription && hasCandidateResume

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-6">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-300 via-white to-emerald-300 bg-clip-text text-transparent">
          {t.heroTitle}
        </h2>
        <p className="text-slate-400 mt-3 max-w-xl mx-auto">
          {t.heroBody}
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <SectionTitle icon={<Briefcase className="w-4 h-4" />}>{t.jobContext}</SectionTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t.area}>
            <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value as Area)}>
              {AREAS.map((a) => <option key={a} value={a}>{areaLabels[uiLanguage][a]}</option>)}
            </select>
          </Field>
          <Field label={t.interviewType}>
            <select className={inputCls} value={interviewType} onChange={(e) => setInterviewType(e.target.value as InterviewType)}>
              {TYPES.map((type) => <option key={type} value={type}>{interviewTypeLabels[uiLanguage][type]}</option>)}
            </select>
          </Field>
        </div>
        {area === 'Outra' && (
          <Field label={t.customArea}>
            <input className={inputCls} value={customArea} onChange={(e) => setCustomArea(e.target.value)} placeholder={t.customAreaPlaceholder} />
          </Field>
        )}
        <Field label={t.jd} hint={t.jdHint}>
          <textarea
            className={`${inputCls} h-36 resize-y`}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder={t.jdPlaceholder}
          />
        </Field>
        <Field label={t.cv} hint={t.cvHint}>
          <textarea
            className={`${inputCls} h-28 resize-y`}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder={t.cvPlaceholder}
          />
        </Field>
      </Card>

      <Card className="p-6 space-y-4">
        <SectionTitle icon={<Bot className="w-4 h-4" />}>{t.candidate.title}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCandidateMode('human')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              candidateMode === 'human'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            <UserRound className="w-4 h-4" /> {t.candidate.human}
          </button>
          <button
            type="button"
            onClick={() => setCandidateMode('ai')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              candidateMode === 'ai'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            <Bot className="w-4 h-4" /> {t.candidate.ai}
          </button>
        </div>
        {candidateMode === 'ai' && (
          <p className="text-xs text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            {t.candidate.hint}
          </p>
        )}
      </Card>

      <Card className="p-6 space-y-6">
        <SectionTitle icon={<Globe2 className="w-4 h-4" />}>{t.languageVoice}</SectionTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t.interviewLanguage} hint={t.interviewLanguageHint}>
            <div className="grid grid-cols-2 gap-2">
              {(['pt-BR', 'en-US'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setInterviewLanguage(lang)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    interviewLanguage === lang
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {lang === 'pt-BR' ? `🇧🇷 ${t.portuguese}` : `🇺🇸 ${t.english}`}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t.feedbackLanguage} hint={t.feedbackLanguageHint}>
            <select className={inputCls} value={feedbackLanguage} onChange={(e) => setFeedbackLanguage(e.target.value as Language)}>
              <option value="pt-BR">{t.reportPt}</option>
              <option value="en-US">{t.reportEn}</option>
            </select>
          </Field>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label={t.voice}>
            <div className="relative">
              <Mic2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select className={`${inputCls} pl-9`} value={selectedVoiceName} onChange={(e) => setVoiceName(e.target.value)}>
                {voices.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </Field>
          <Field label={t.duration}>
            <div className="relative">
              <Timer className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select className={`${inputCls} pl-9`} value={duration} onChange={(e) => setDuration(Number(e.target.value) as 15 | 30 | 45)}>
                <option value={15}>15 {t.minutes}</option>
                <option value={30}>30 {t.minutes}</option>
                <option value={45}>45 {t.minutes}</option>
              </select>
            </div>
          </Field>
          <Field label={t.stressMode} hint={t.stressHint}>
            <button
              type="button"
              onClick={() => setStressMode(!stressMode)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                stressMode
                  ? 'bg-red-600/20 border-red-500/50 text-red-300'
                  : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Flame className="w-4 h-4" />
              {stressMode ? t.enabled : t.disabled}
            </button>
          </Field>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t.reasoning} hint={reasoningAvailable ? t.reasoningHint : t.reasoningUnavailable}>
            <div className="grid grid-cols-3 gap-2">
              {(['fast', 'balanced', 'deep'] as VoiceReasoningMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!reasoningAvailable}
                  onClick={() => setVoiceReasoningMode(mode)}
                  className={`min-w-0 px-2 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    voiceReasoningMode === mode && reasoningAvailable
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="inline-flex items-center gap-1"><BrainCircuit className="w-3.5 h-3.5" /> {t.reasoningModes[mode]}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label={t.expressiveness} hint={expressiveAvailable ? t.expressivenessHint : t.expressivenessUnavailable}>
            <div className="grid grid-cols-2 gap-2">
              {(['standard', 'expressive'] as VoiceExpressiveness[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={mode === 'expressive' && !expressiveAvailable}
                  onClick={() => setVoiceExpressiveness(mode)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedExpressiveness === mode
                      ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-100'
                      : 'bg-slate-950/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5"><Waves className="w-3.5 h-3.5" /> {t.expressivenessModes[mode]}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <SectionTitle icon={<SlidersHorizontal className="w-4 h-4" />}>{t.weights}</SectionTitle>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {(Object.keys(weights) as Array<keyof Weights>).map((k) => (
            <div key={k}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{t.weightLabels[k]}</span>
                <span className="text-indigo-400 font-mono">{weights[k]}%</span>
              </div>
              <input
                type="range" min={0} max={50} step={5}
                value={weights[k]}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-center pb-10">
        <Button onClick={() => onStart(config)} disabled={!canStart} className="px-10 py-4 text-base rounded-full">
          <span className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            {t.start}
          </span>
        </Button>
      </div>
      {!canStart && (
        <p className="text-center text-xs text-slate-500 -mt-8 pb-6 flex items-center justify-center gap-1">
          <FileText className="w-3 h-3" /> {hasJobDescription ? t.candidate.needResume : t.needJd}
        </p>
      )}
    </div>
  )
}
