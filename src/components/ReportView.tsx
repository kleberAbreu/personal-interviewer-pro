import { useState } from 'react'
import {
  AlertTriangle, BookOpenCheck, CalendarCheck2, ChevronDown, FileText,
  Lightbulb, MessageCircleQuestion, Printer, RotateCcw, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react'
import { formatBrl } from '../services/cost'
import { useSettings } from '../store'
import type { ReportData, TranscriptEntry } from '../types'
import { Badge, Button, Card, SectionTitle } from './ui'

interface Props {
  data: ReportData
  transcript: TranscriptEntry[]
  totalCostUsd: number
  onRestart: () => void
}

function ScoreRing({ score }: { score: number | null }) {
  const pct = score == null ? 0 : (score / 5) * 100
  const r = 54
  const c = 2 * Math.PI * r
  const color = score == null ? '#475569' : score >= 4 ? '#34d399' : score >= 3 ? '#fbbf24' : '#f87171'
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score?.toFixed(1) ?? '—'}</span>
        <span className="text-xs text-slate-500">de 5.0</span>
      </div>
    </div>
  )
}

function ScoreBar({ score }: { score: number | null }) {
  const pct = score == null ? 0 : (score / 5) * 100
  const color = score == null ? 'bg-slate-600' : score >= 4 ? 'bg-emerald-400' : score >= 3 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ReportView({ data, transcript, totalCostUsd, onRestart }: Props) {
  const usdToBrl = useSettings((s) => s.usdToBrl)
  const [showTranscript, setShowTranscript] = useState(false)
  const [openQuestion, setOpenQuestion] = useState<number | null>(null)
  const es = data.executive_summary
  const insufficient = data.meta.evidence_status === 'insufficient'

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <h2 className="text-2xl font-bold">Relatório de Performance</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <span className="flex items-center gap-2"><Printer className="w-4 h-4" /> Imprimir / PDF</span>
          </Button>
          <Button onClick={onRestart}>
            <span className="flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Nova entrevista</span>
          </Button>
        </div>
      </div>

      {/* Resumo executivo */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <ScoreRing score={es.overall_weighted_score_1_to_5} />
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge tone="indigo">{data.meta.role_title}</Badge>
              <Badge tone="slate">Senioridade: {data.meta.seniority_expected.level}</Badge>
              <Badge tone={data.meta.evidence_status === 'sufficient' ? 'green' : data.meta.evidence_status === 'partial' ? 'amber' : 'red'}>
                Evidências: {data.meta.evidence_status}
              </Badge>
            </div>
            <p className="text-slate-300 leading-relaxed">{es.summary_text}</p>
            <p className="text-xs text-slate-500">
              Custo total da sessão: {formatBrl(totalCostUsd, usdToBrl)} (est.)
            </p>
          </div>
        </div>
      </Card>

      {insufficient && (
        <Card className="p-5 border-amber-500/40 bg-amber-950/20">
          <div className="flex items-center gap-3 text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Não houve material suficiente na transcrição para uma avaliação confiável. Tente uma sessão mais longa.
          </div>
        </Card>
      )}

      {/* Forças e gaps */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}>Pontos fortes</SectionTitle>
          <div className="space-y-4">
            {es.top_strengths.length === 0 && <p className="text-sm text-slate-600 italic">Sem evidências suficientes.</p>}
            {es.top_strengths.map((s, i) => (
              <div key={i} className="border-l-2 border-emerald-500/50 pl-3">
                <div className="font-semibold text-emerald-200 text-sm">{s.title}</div>
                <p className="text-xs text-slate-400 mt-1">{s.why_it_matters}</p>
                {s.evidence_quote && <p className="text-xs text-slate-500 italic mt-1">“{s.evidence_quote}”</p>}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle icon={<TrendingDown className="w-4 h-4 text-red-400" />}>Gaps principais</SectionTitle>
          <div className="space-y-4">
            {es.top_gaps.length === 0 && <p className="text-sm text-slate-600 italic">Sem evidências suficientes.</p>}
            {es.top_gaps.map((g, i) => (
              <div key={i} className="border-l-2 border-red-500/50 pl-3">
                <div className="font-semibold text-red-200 text-sm">{g.title}</div>
                <p className="text-xs text-slate-400 mt-1">{g.impact}</p>
                {g.evidence_quote && <p className="text-xs text-slate-500 italic mt-1">“{g.evidence_quote}”</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Momentos-chave */}
      {data.key_moments.length > 0 && (
        <Card className="p-5">
          <SectionTitle icon={<Sparkles className="w-4 h-4 text-indigo-400" />}>Momentos-chave</SectionTitle>
          <div className="space-y-5">
            {data.key_moments.map((m, i) => (
              <div key={i} className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-indigo-500/60 border-2 border-indigo-400" />
                {i < data.key_moments.length - 1 && <div className="absolute left-[5px] top-5 bottom-[-14px] w-0.5 bg-slate-800" />}
                <div className="text-xs text-slate-500">{m.timestamp_context}</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{m.situation}</div>
                <p className="text-xs text-slate-400 mt-1"><strong className="text-slate-300">Ação:</strong> {m.candidate_action}</p>
                <p className="text-xs text-slate-400 mt-0.5"><strong className="text-slate-300">Impacto:</strong> {m.impact_analysis}</p>
                {m.transcript_quote && <p className="text-xs text-slate-500 italic mt-1">“{m.transcript_quote}”</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Competências */}
      {data.competency_breakdown.length > 0 && (
        <Card className="p-5">
          <SectionTitle icon={<BookOpenCheck className="w-4 h-4 text-indigo-400" />}>Competências</SectionTitle>
          <div className="space-y-5">
            {data.competency_breakdown.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-200">{c.competency}</span>
                  <span className="text-sm font-mono text-slate-400">{c.score_1_to_5?.toFixed(1) ?? '—'}</span>
                </div>
                <ScoreBar score={c.score_1_to_5} />
                <div className="grid md:grid-cols-2 gap-3 mt-2 text-xs">
                  <ul className="space-y-1 text-emerald-300/80">
                    {c.what_went_well.map((w, j) => <li key={j}>✓ {w}</li>)}
                  </ul>
                  <ul className="space-y-1 text-amber-300/80">
                    {c.what_to_improve.map((w, j) => <li key={j}>→ {w}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Feedback por pergunta */}
      {data.question_level_feedback.length > 0 && (
        <Card className="p-5">
          <SectionTitle icon={<MessageCircleQuestion className="w-4 h-4 text-indigo-400" />}>Feedback por pergunta</SectionTitle>
          <div className="divide-y divide-slate-800">
            {data.question_level_feedback.map((q, i) => (
              <div key={i} className="py-3">
                <button
                  className="w-full flex items-center justify-between text-left text-sm font-medium text-slate-200 hover:text-white"
                  onClick={() => setOpenQuestion(openQuestion === i ? null : i)}
                >
                  {q.question_summary}
                  <ChevronDown className={`w-4 h-4 transition-transform ${openQuestion === i ? 'rotate-180' : ''}`} />
                </button>
                {openQuestion === i && (
                  <div className="mt-3 space-y-2 text-xs">
                    {q.issues_detected.length > 0 && (
                      <ul className="space-y-1 text-amber-300/80">
                        {q.issues_detected.map((iss, j) => <li key={j}>⚠ {iss}</li>)}
                      </ul>
                    )}
                    {q.example_improved_answer && (
                      <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-indigo-200/90">
                        <div className="flex items-center gap-1.5 font-semibold mb-1">
                          <Lightbulb className="w-3.5 h-3.5" /> Resposta melhorada
                        </div>
                        {q.example_improved_answer}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Plano de treino */}
      {data.two_week_training_plan.weekly_goals.length > 0 && (
        <Card className="p-5">
          <SectionTitle icon={<CalendarCheck2 className="w-4 h-4 text-emerald-400" />}>Plano de treino — 2 semanas</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            {data.two_week_training_plan.weekly_goals.map((w) => (
              <div key={w.week} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="font-semibold text-sm text-indigo-300 mb-2">Semana {w.week}</div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {w.goals.map((g, j) => <li key={j}>• {g}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transcrição */}
      <Card className="p-5 no-print">
        <button
          className="w-full flex items-center justify-between text-sm font-semibold text-slate-300"
          onClick={() => setShowTranscript(!showTranscript)}
        >
          <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Transcrição completa ({transcript.length} turnos)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
        </button>
        {showTranscript && (
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2 text-xs font-mono">
            {transcript.map((t, i) => (
              <p key={i} className={t.role === 'candidate' ? 'text-emerald-300/90' : 'text-slate-400'}>
                <strong>{t.role === 'candidate' ? 'Você' : 'Entrevistador'}:</strong> {t.text}
              </p>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
