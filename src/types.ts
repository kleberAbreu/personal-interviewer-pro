export type Provider = 'gemini' | 'openai' | 'anthropic' | 'openrouter'
export type AgentRole = 'researcher' | 'planner' | 'interviewer' | 'analyst'
export type Language = 'pt-BR' | 'en-US'
export type Area = 'Software' | 'Produto' | 'Dados' | 'Comercial' | 'Outra'
export type InterviewType = 'RH' | 'Tecnica' | 'Case' | 'Mista'
export type AppStep = 'setup' | 'preparing' | 'ready' | 'interview' | 'analyzing' | 'report'

export interface ModelRef {
  provider: Provider
  model: string
}

export interface ApiKeys {
  gemini: string
  openai: string
  anthropic: string
  openrouter: string
}

export interface Weights {
  communication: number
  technical: number
  cultureFit: number
  structure: number
  depth: number
}

export interface InterviewConfig {
  area: Area
  customArea?: string
  interviewType: InterviewType
  interviewLanguage: Language
  feedbackLanguage: Language
  stressMode: boolean
  voiceName: string
  duration: 15 | 30 | 45
  weights: Weights
  jobDescription: string
  cvText: string
}

export interface CompanyBrief {
  company_identification: { company_name: string; resolved_domain: string }
  company_brief: {
    mission_vision_values: { values: string[] }
    culture_and_ways_of_working: { work_style: string[] }
    hiring_and_interview_signals: { likely_interview_structure: string[] }
  }
  interview_style_profile: {
    tone: string
    strictness_level: number
    pace: string
    preferred_answer_style: string[]
  }
}

export interface PlanQuestion {
  question_id: string
  primary_question: string
  competencies_targeted: string[]
}

export interface PlanBlock {
  block_id: string
  name: string
  start_sec: number
  end_sec: number
  objective: string
  questions: PlanQuestion[]
}

export interface InterviewPlan {
  metadata: { seniority_inferred: { level: string; confidence: number } }
  interview_plan: { blocks: PlanBlock[] }
  guardrails_for_interviewer?: { role_integrity_rules?: string[] }
  scoring_rubric?: { competencies: Array<{ name: string; what_to_observe: string[] }> }
}

export interface KeyMoment {
  timestamp_context: string
  situation: string
  candidate_action: string
  impact_analysis: string
  transcript_quote: string
}

export interface ReportData {
  meta: {
    generated_at: string
    role_title: string
    seniority_expected: { level: string }
    evidence_status: 'sufficient' | 'insufficient' | 'partial'
  }
  executive_summary: {
    overall_weighted_score_1_to_5: number | null
    top_strengths: Array<{ title: string; why_it_matters: string; evidence_quote: string }>
    top_gaps: Array<{ title: string; impact: string; evidence_quote: string }>
    summary_text: string
  }
  key_moments: KeyMoment[]
  competency_breakdown: Array<{
    competency: string
    score_1_to_5: number | null
    what_went_well: string[]
    what_to_improve: string[]
    evidence: Array<{ quote: string; interpretation: string }>
  }>
  question_level_feedback: Array<{
    question_summary: string
    issues_detected: string[]
    example_improved_answer: string
  }>
  two_week_training_plan: { weekly_goals: Array<{ week: number; goals: string[] }> }
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface AgentResult<T> {
  data: T
  costUsd: number
}

export interface TranscriptEntry {
  role: 'interviewer' | 'candidate'
  text: string
  at: number
}
