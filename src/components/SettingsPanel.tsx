import { useEffect, useState } from 'react'
import { Check, KeyRound, MessageSquareText, Receipt, Save, Server, Sparkles, Trash2, X } from 'lucide-react'
import {
  CANDIDATE_TTS_MODELS,
  CATALOG,
  GEMINI_VOICES,
  ROLE_SUGGESTIONS,
  modelInfo,
} from '../config/models'
import { modelNote, providerLabels, roleSuggestionCopy, settingsCopy } from '../i18n'
import { useSettings } from '../store'
import { getVoiceBrokerStatus, updateVoiceCredentials, type VoiceBrokerStatus } from '../voice/broker'
import type { AgentRole, ApiKeys, CandidateEngine, ModelRef } from '../types'
import { Badge, Button, Card, Field, Select, inputCls } from './ui'

const ROLES: AgentRole[] = ['researcher', 'planner', 'interviewer', 'analyst', 'candidate']
type Tab = 'keys' | 'models' | 'prompt' | 'cost'

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('keys')
  const uiLanguage = useSettings((s) => s.uiLanguage)
  const t = settingsCopy[uiLanguage]
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'keys', label: t.tabs.keys, icon: <KeyRound className="w-4 h-4" /> },
    { id: 'models', label: t.tabs.models, icon: <Sparkles className="w-4 h-4" /> },
    { id: 'prompt', label: t.tabs.prompt, icon: <MessageSquareText className="w-4 h-4" /> },
    { id: 'cost', label: t.tabs.cost, icon: <Receipt className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-10 no-print">
      <Card className="w-full max-w-3xl p-0 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold">{t.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-1 px-4 pt-3 border-b border-slate-800 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {tab === 'keys' && <KeysTab />}
          {tab === 'models' && <ModelsTab />}
          {tab === 'prompt' && <PromptTab />}
          {tab === 'cost' && <CostTab />}
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
          <Button onClick={onClose}>
            <span className="flex items-center gap-2"><Check className="w-4 h-4" /> {t.done}</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}

function KeysTab() {
  const { keys, setKey, uiLanguage } = useSettings()
  const t = settingsCopy[uiLanguage]
  const entries: Array<{ id: keyof ApiKeys; label: string; hint: string }> = [
    { id: 'openrouter', label: 'OpenRouter', hint: t.keys.openrouter },
  ]
  const [voiceStatus, setVoiceStatus] = useState<VoiceBrokerStatus | null>(null)
  const [brokerAvailable, setBrokerAvailable] = useState<boolean | null>(null)
  const [openAiKey, setOpenAiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    let active = true
    void getVoiceBrokerStatus()
      .then((status) => {
        if (!active) return
        setVoiceStatus(status)
        setBrokerAvailable(true)
      })
      .catch(() => { if (active) setBrokerAvailable(false) })
    return () => { active = false }
  }, [])

  const saveVoiceKeys = async () => {
    const update = {
      ...(openAiKey.trim() ? { openai: openAiKey.trim() } : {}),
      ...(geminiKey.trim() ? { gemini: geminiKey.trim() } : {}),
    }
    if (!Object.keys(update).length) return

    setSaving(true)
    setFeedback(null)
    try {
      const status = await updateVoiceCredentials(update)
      setVoiceStatus(status)
      setBrokerAvailable(true)
      setOpenAiKey('')
      setGeminiKey('')
      setFeedback({ tone: 'success', message: t.voiceBroker.saved })
    } catch (error) {
      if (error instanceof Error && error.message === 'VOICE_BROKER_UNAVAILABLE') setBrokerAvailable(false)
      setFeedback({ tone: 'error', message: t.voiceBroker.saveError })
    } finally {
      setSaving(false)
    }
  }

  const removeVoiceKey = async (provider: 'openai' | 'gemini', label: string) => {
    if (!window.confirm(t.voiceBroker.confirmRemove(label))) return
    setSaving(true)
    setFeedback(null)
    try {
      const status = await updateVoiceCredentials({ [provider]: null })
      setVoiceStatus(status)
      setBrokerAvailable(true)
      if (provider === 'openai') setOpenAiKey('')
      else setGeminiKey('')
      setFeedback({ tone: 'success', message: t.voiceBroker.removed(label) })
    } catch (error) {
      if (error instanceof Error && error.message === 'VOICE_BROKER_UNAVAILABLE') setBrokerAvailable(false)
      setFeedback({ tone: 'error', message: t.voiceBroker.saveError })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">{t.keysIntro}</p>
      <div className="p-4 rounded-lg border border-slate-700 bg-slate-950/50">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Server className="w-4 h-4 text-cyan-400" /> {t.voiceBroker.title}
          </div>
          <Badge tone={brokerAvailable === false ? 'red' : brokerAvailable ? 'green' : 'slate'}>
            {brokerAvailable === false ? t.voiceBroker.offline : brokerAvailable ? t.voiceBroker.online : t.voiceBroker.checking}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={voiceStatus?.gemini ? 'green' : 'slate'}>Gemini: {voiceStatus?.gemini ? t.voiceBroker.configured : t.voiceBroker.notConfigured}</Badge>
          <Badge tone={voiceStatus?.openai ? 'green' : 'slate'}>OpenAI: {voiceStatus?.openai ? t.voiceBroker.configured : t.voiceBroker.notConfigured}</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          {brokerAvailable === false ? t.voiceBroker.unavailable : t.voiceBroker.hint}
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void saveVoiceKeys()
          }}
        >
          <Field label={t.voiceBroker.openAiLabel} hint={t.voiceBroker.openAiHint}>
            <div className="flex items-center gap-2">
              <input
                type="password"
                className={inputCls}
                value={openAiKey}
                onChange={(event) => setOpenAiKey(event.target.value)}
                placeholder={voiceStatus?.openai ? t.voiceBroker.replacePlaceholder : t.voiceBroker.openAiPlaceholder}
                autoComplete="new-password"
                spellCheck={false}
                disabled={brokerAvailable === false || saving}
              />
              {voiceStatus?.openai && (
                <Button
                  variant="ghost"
                  className="shrink-0 px-3"
                  disabled={saving}
                  onClick={() => void removeVoiceKey('openai', 'OpenAI')}
                >
                  <span className="sr-only">{t.voiceBroker.remove('OpenAI')}</span>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Field>
          <Field label={t.voiceBroker.geminiLabel} hint={t.voiceBroker.geminiHint}>
            <div className="flex items-center gap-2">
              <input
                type="password"
                className={inputCls}
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                placeholder={voiceStatus?.gemini ? t.voiceBroker.replacePlaceholder : t.voiceBroker.geminiPlaceholder}
                autoComplete="new-password"
                spellCheck={false}
                disabled={brokerAvailable === false || saving}
              />
              {voiceStatus?.gemini && (
                <Button
                  variant="ghost"
                  className="shrink-0 px-3"
                  disabled={saving}
                  onClick={() => void removeVoiceKey('gemini', 'Gemini')}
                >
                  <span className="sr-only">{t.voiceBroker.remove('Gemini')}</span>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-xs ${feedback?.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
              role="status"
              aria-live="polite"
            >
              {feedback?.message}
            </p>
            <Button
              type="submit"
              disabled={brokerAvailable !== true || saving || (!openAiKey.trim() && !geminiKey.trim())}
            >
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? t.voiceBroker.saving : t.voiceBroker.save}
              </span>
            </Button>
          </div>
        </form>
      </div>
      {entries.map((e) => (
        <Field key={e.id} label={e.label} hint={e.hint}>
          <input
            type="password"
            className={inputCls}
            value={keys[e.id]}
            onChange={(ev) => setKey(e.id, ev.target.value)}
            placeholder={t.keys.placeholder(e.label)}
            autoComplete="off"
          />
        </Field>
      ))}
    </div>
  )
}

function ModelsTab() {
  const { models, setModel, uiLanguage } = useSettings()
  const t = settingsCopy[uiLanguage]
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        {t.modelsIntro}
      </p>
      {ROLES.map((role) => {
        const sug = ROLE_SUGGESTIONS[role]
        const sugText = roleSuggestionCopy[uiLanguage][role]
        const current = models[role]
        const options = CATALOG.filter((m) => (
          role === 'interviewer' ? m.voice : m.provider === 'openrouter' && !m.voice
        ))
        const isRecommended = current.provider === sug.recommended.provider && current.model === sug.recommended.model
        const info = modelInfo(current)
        return (
          <Card key={role} className="p-4 bg-slate-950/40">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-semibold text-slate-100">{sugText.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{sugText.description}</div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {info?.voice && info.preset && <Badge tone="slate">{t.presets[info.preset]}</Badge>}
                {info?.maturity === 'preview' && <Badge tone="amber">preview</Badge>}
                {isRecommended ? <Badge tone="green">{t.recommended}</Badge> : <Badge tone="slate">{t.custom}</Badge>}
              </div>
            </div>
            <Select
              value={`${current.provider}::${current.model}`}
              options={options.map((model) => ({
                value: `${model.provider}::${model.id}`,
                label: `${model.label} - ${providerLabels[model.provider]} (~${model.inputPerM}/${model.outputPerM} ${t.perMTok})`,
              }))}
              onChange={(next) => {
                const [provider, model] = next.split('::')
                setModel(role, { provider, model } as ModelRef)
              }}
              ariaLabel={sugText.title}
            />
            {info?.note && role !== 'candidate' && <p className="text-xs text-slate-500 mt-2">{modelNote(uiLanguage, info.provider, info.id, info.note)}</p>}
            {info?.voice && (
              <p className="text-[11px] text-slate-600 mt-1.5">
                {info.contextWindow ? `${info.contextWindow / 1000}k context` : ''}
                {info.transport ? ` · ${info.transport.toUpperCase()}` : ''}
                {info.audioInputPerM !== undefined ? ` · $${info.audioInputPerM}/$${info.audioOutputPerM} ${t.audioPerMTok}` : ''}
              </p>
            )}
            {role === 'candidate' && <CandidateExtras />}
            <div className="mt-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <p className="text-xs text-indigo-200/90">
                <strong>{t.suggestion}</strong> {sugText.rationale}
              </p>
              {!isRecommended && (
                <button
                  className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  onClick={() => setModel(role, sug.recommended)}
                >
                  {t.useRecommended} - {modelInfo(sug.recommended)?.label}
                </button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function CandidateExtras() {
  const {
    candidateEngine, setCandidateEngine,
    candidateVoice, setCandidateVoice,
    candidateTtsModel, setCandidateTtsModel,
    uiLanguage,
  } = useSettings()
  const t = settingsCopy[uiLanguage].candidate
  return (
    <div className="mt-3 grid md:grid-cols-3 gap-3">
      <Field label={t.engine}>
        <Select
          value={candidateEngine}
          options={[
            { value: 'text-tts', label: t.textTts },
            { value: 'gemini-live', label: t.geminiLive },
          ]}
          onChange={(next) => setCandidateEngine(next as CandidateEngine)}
          ariaLabel={t.engine}
        />
      </Field>
      <Field label={t.voice}>
        <Select
          value={candidateVoice}
          options={GEMINI_VOICES.map((voice) => ({ value: voice, label: voice }))}
          onChange={setCandidateVoice}
          ariaLabel={t.voice}
        />
      </Field>
      <Field label={t.ttsModel}>
        <Select
          value={candidateTtsModel}
          options={CANDIDATE_TTS_MODELS.map((model) => ({ value: model.id, label: t.ttsModels[model.id] }))}
          onChange={setCandidateTtsModel}
          ariaLabel={t.ttsModel}
        />
      </Field>
    </div>
  )
}

function PromptTab() {
  const { interviewerTemplate, setInterviewerTemplate, extraInstructions, setExtraInstructions, resetInterviewerTemplate, uiLanguage } = useSettings()
  const t = settingsCopy[uiLanguage]
  return (
    <div className="space-y-5">
      <Field
        label={t.promptExtraLabel}
        hint={t.promptExtraHint}
      >
        <textarea
          className={`${inputCls} h-24 resize-y`}
          value={extraInstructions}
          onChange={(e) => setExtraInstructions(e.target.value)}
          placeholder={t.promptExtraPlaceholder}
        />
      </Field>
      <Field
        label={t.promptTemplateLabel}
        hint={t.promptTemplateHint}
      >
        <textarea
          className={`${inputCls} h-80 resize-y font-mono text-xs leading-relaxed`}
          value={interviewerTemplate}
          onChange={(e) => setInterviewerTemplate(e.target.value)}
          spellCheck={false}
        />
      </Field>
      <Button variant="secondary" onClick={resetInterviewerTemplate}>
        {t.restorePrompt}
      </Button>
    </div>
  )
}

function CostTab() {
  const { usdToBrl, setUsdToBrl, uiLanguage } = useSettings()
  const t = settingsCopy[uiLanguage]
  return (
    <div className="space-y-5">
      <Field label={t.exchangeLabel} hint={t.exchangeHint}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={inputCls}
          value={usdToBrl}
          onChange={(e) => setUsdToBrl(Number(e.target.value) || 0)}
        />
      </Field>
      <p className="text-xs text-slate-500">
        {t.costNote} <code className="text-slate-400">src/config/models.ts</code>.
      </p>
    </div>
  )
}
