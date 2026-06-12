import { useState } from 'react'
import { Check, KeyRound, MessageSquareText, Receipt, Sparkles, X } from 'lucide-react'
import { CATALOG, PROVIDER_LABELS, ROLE_SUGGESTIONS, modelInfo } from '../config/models'
import { useSettings } from '../store'
import type { AgentRole, ApiKeys, ModelRef } from '../types'
import { Badge, Button, Card, Field, inputCls } from './ui'

const ROLES: AgentRole[] = ['researcher', 'planner', 'interviewer', 'analyst']
type Tab = 'keys' | 'models' | 'prompt' | 'cost'

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('keys')
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'keys', label: 'Chaves de API', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'models', label: 'Modelos', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'prompt', label: 'Prompt do Entrevistador', icon: <MessageSquareText className="w-4 h-4" /> },
    { id: 'cost', label: 'Custos', icon: <Receipt className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-10 no-print">
      <Card className="w-full max-w-3xl p-0 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold">Configurações</h2>
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
            <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Concluir</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}

function KeysTab() {
  const { keys, setKey } = useSettings()
  const entries: Array<{ id: keyof ApiKeys; label: string; hint: string }> = [
    { id: 'gemini', label: 'Google Gemini', hint: 'aistudio.google.com/apikey — necessária para a entrevista por voz via Gemini Live.' },
    { id: 'openai', label: 'OpenAI', hint: 'platform.openai.com/api-keys — necessária para GPT e voz via Realtime API.' },
    { id: 'anthropic', label: 'Anthropic', hint: 'console.anthropic.com — recomendada para o Analista (Claude Opus 4.8 / Fable 5).' },
    { id: 'openrouter', label: 'OpenRouter', hint: 'openrouter.ai/keys — uma chave única para acessar Claude, GPT, Gemini, DeepSeek e mais. Ideal para escolher o melhor modelo por função sem gerenciar várias contas.' },
  ]
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        As chaves ficam salvas apenas no <strong>localStorage deste navegador</strong> e são enviadas
        diretamente aos provedores. Configure apenas as dos provedores que for usar.
      </p>
      {entries.map((e) => (
        <Field key={e.id} label={e.label} hint={e.hint}>
          <input
            type="password"
            className={inputCls}
            value={keys[e.id]}
            onChange={(ev) => setKey(e.id, ev.target.value)}
            placeholder={`Chave ${e.label}…`}
            autoComplete="off"
          />
        </Field>
      ))}
    </div>
  )
}

function ModelsTab() {
  const { models, setModel } = useSettings()
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Escolha o modelo de cada função do pipeline. As sugestões maximizam qualidade onde importa
        (Analista) e economizam onde não importa (Pesquisador).
      </p>
      {ROLES.map((role) => {
        const sug = ROLE_SUGGESTIONS[role]
        const current = models[role]
        const options = CATALOG.filter((m) => (role === 'interviewer' ? m.voice : !m.voice))
        const isRecommended = current.provider === sug.recommended.provider && current.model === sug.recommended.model
        const info = modelInfo(current)
        return (
          <Card key={role} className="p-4 bg-slate-950/40">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-semibold text-slate-100">{sug.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{sug.description}</div>
              </div>
              {isRecommended ? <Badge tone="green">recomendado</Badge> : <Badge tone="slate">customizado</Badge>}
            </div>
            <select
              className={inputCls}
              value={`${current.provider}::${current.model}`}
              onChange={(e) => {
                const [provider, model] = e.target.value.split('::')
                setModel(role, { provider, model } as ModelRef)
              }}
            >
              {options.map((m) => (
                <option key={`${m.provider}::${m.id}`} value={`${m.provider}::${m.id}`}>
                  {m.label} — {PROVIDER_LABELS[m.provider]} (~${m.inputPerM}/{m.outputPerM} por MTok)
                </option>
              ))}
            </select>
            {info?.note && <p className="text-xs text-slate-500 mt-2">{info.note}</p>}
            <div className="mt-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <p className="text-xs text-indigo-200/90">
                <strong>Sugestão:</strong> {sug.rationale}
              </p>
              {!isRecommended && (
                <button
                  className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  onClick={() => setModel(role, sug.recommended)}
                >
                  Usar recomendado → {modelInfo(sug.recommended)?.label}
                </button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function PromptTab() {
  const { interviewerTemplate, setInterviewerTemplate, extraInstructions, setExtraInstructions, resetInterviewerTemplate } = useSettings()
  return (
    <div className="space-y-5">
      <Field
        label="Instruções adicionais (atalho rápido)"
        hint='Anexadas ao prompt sem editar o template. Ex.: "Foque em system design" ou "Pergunte sobre liderança".'
      >
        <textarea
          className={`${inputCls} h-24 resize-y`}
          value={extraInstructions}
          onChange={(e) => setExtraInstructions(e.target.value)}
          placeholder="Instruções extras para o entrevistador…"
        />
      </Field>
      <Field
        label="Template completo do entrevistador"
        hint="Placeholders: {{LANGUAGE_RULES}} {{DURATION}} {{COMPANY_BRIEF}} {{STYLE_PROFILE}} {{PLAN}} {{STRESS_MODE}} {{EXTRA}}"
      >
        <textarea
          className={`${inputCls} h-80 resize-y font-mono text-xs leading-relaxed`}
          value={interviewerTemplate}
          onChange={(e) => setInterviewerTemplate(e.target.value)}
          spellCheck={false}
        />
      </Field>
      <Button variant="secondary" onClick={resetInterviewerTemplate}>
        Restaurar template padrão
      </Button>
    </div>
  )
}

function CostTab() {
  const { usdToBrl, setUsdToBrl } = useSettings()
  return (
    <div className="space-y-5">
      <Field label="Cotação USD → BRL" hint="Usada para exibir os custos estimados em reais.">
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
        Custos de texto usam os tokens reais reportados por cada API. Custos de voz são estimados
        pela duração do áudio. Preços por modelo em <code className="text-slate-400">src/config/models.ts</code>.
      </p>
    </div>
  )
}
