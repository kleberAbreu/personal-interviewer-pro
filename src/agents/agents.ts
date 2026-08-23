import { analystPrompt, plannerPrompt, researcherPrompt } from '../config/prompts'
import { extractJson } from '../lib/json'
import { chatJson } from '../providers/llm'
import { textCostUsd } from '../services/cost'
import type {
  AgentResult,
  ApiKeys,
  CompanyBrief,
  InterviewConfig,
  InterviewPlan,
  ModelRef,
  ReportData,
} from '../types'

export async function runResearcher(
  config: InterviewConfig,
  ref: ModelRef,
  keys: ApiKeys,
): Promise<AgentResult<CompanyBrief>> {
  const result = await chatJson({
    ref,
    keys,
    system: researcherPrompt(config.interviewLanguage),
    user: `INPUT DATA:
- Area: ${config.area}${config.customArea ? ` (${config.customArea})` : ''}
- Interview type: ${config.interviewType}
- Interview language: ${config.interviewLanguage}
- Stress Mode: ${config.stressMode}
- JD:
${config.jobDescription}
- Resume (context):
${config.cvText || '(not provided)'}`,
  })
  const data = extractJson<CompanyBrief>(result.text)
  if (!data.company_brief) throw new Error('RESEARCH_BRIEF_FAILED')
  return { data, costUsd: textCostUsd(ref, result.usage) }
}

export async function runPlanner(
  config: InterviewConfig,
  brief: CompanyBrief,
  ref: ModelRef,
  keys: ApiKeys,
): Promise<AgentResult<InterviewPlan>> {
  const result = await chatJson({
    ref,
    keys,
    system: plannerPrompt(config.interviewLanguage),
    user: `INPUT DATA:
- Area: ${config.area}${config.customArea ? ` (${config.customArea})` : ''}
- Interview type: ${config.interviewType}
- Stress Mode: ${config.stressMode}
- REQUESTED DURATION: ${config.duration} MINUTES
- Scoring weights: ${JSON.stringify(config.weights)}
- Company Brief: ${JSON.stringify(brief)}
- JD:
${config.jobDescription}
- CV:
${config.cvText || '(not provided)'}`,
  })
  const data = extractJson<InterviewPlan>(result.text)
  if (!data.interview_plan?.blocks?.length) {
    throw new Error('INTERVIEW_PLAN_FAILED')
  }
  return { data, costUsd: textCostUsd(ref, result.usage) }
}

export async function runAnalyst(
  config: InterviewConfig,
  plan: InterviewPlan,
  transcript: string,
  ref: ModelRef,
  keys: ApiKeys,
): Promise<AgentResult<ReportData>> {
  // Transcrição insuficiente: não gasta tokens, devolve relatório "insufficient"
  if (!transcript || transcript.length < 80) {
    return {
      costUsd: 0,
      data: {
        meta: {
          generated_at: new Date().toISOString(),
          role_title: config.area,
          seniority_expected: { level: plan.metadata?.seniority_inferred?.level ?? '?' },
          evidence_status: 'insufficient',
        },
        executive_summary: {
          overall_weighted_score_1_to_5: null,
          top_strengths: [],
          top_gaps: [],
          summary_text:
            config.feedbackLanguage === 'en-US'
              ? 'The interview was too short or no candidate answers were detected, so a reliable evaluation could not be generated.'
              : 'A entrevista foi muito curta ou não houve respostas detectáveis do candidato para gerar uma avaliação confiável.',
        },
        key_moments: [],
        competency_breakdown: [],
        question_level_feedback: [],
        two_week_training_plan: { weekly_goals: [] },
      },
    }
  }

  const result = await chatJson({
    ref,
    keys,
    system: analystPrompt(config.feedbackLanguage),
    user: `INPUT DATA:
- Area: ${config.area}
- JD: ${config.jobDescription}
- Resume (CONTEXT ONLY): ${config.cvText || '(not provided)'}
- Inferred seniority: ${JSON.stringify(plan.metadata?.seniority_inferred)}
- Weights: ${JSON.stringify(config.weights)}
- TRANSCRIPT (SOURCE OF TRUTH):
${transcript}`,
    maxTokens: 24000,
  })
  const parsed = extractJson<ReportData & { report_data?: ReportData }>(result.text)
  const data = parsed.report_data ?? parsed
  if (!data.competency_breakdown) throw new Error('REPORT_INVALID')
  return { data, costUsd: textCostUsd(ref, result.usage) }
}
