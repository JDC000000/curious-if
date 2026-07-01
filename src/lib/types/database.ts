export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type QuestionStatus = 'draft' | 'spotlight' | 'published'
export type AnswerStatus = 'pending' | 'approved' | 'rejected'
export type ModerationAction = 'approve' | 'reject'

export interface Question {
  id: string
  text: string
  whisper_line: string | null
  accent_colour: string
  status: QuestionStatus
  published_at: string | null
  created_at: string
}

export interface Answer {
  id: string
  question_id: string
  body: string
  status: AnswerStatus
  submitter_id: string | null
  openai_flagged: boolean | null
  og_generated: boolean
  is_featured: boolean
  resonance_count: number
  /** Temporary sock-puppet seed answer — deleted once real answers fill the room */
  is_seed: boolean
  /** Single freeform attribution captured on the answer form (AGENTS.md #2). Preferred over author_display. */
  author_attribution: string | null
  /** Legacy display label e.g. "D.W. · Vancouver" (derived from submitter name+city). */
  author_display: string | null
  created_at: string
  approved_at: string | null
}

export interface Submitter {
  id: string
  // PII encrypted at rest (AES-256-GCM); email_blind_index enables lookups.
  email_encrypted: string | null
  email_blind_index: string | null
  name_encrypted: string | null
  city_encrypted: string | null
  subscribed: boolean
  created_at: string
}

export interface Nomination {
  id: string
  question_id: string
  nominator_submitter_id: string | null
  nominee_email_encrypted: string | null
  blind_index_email: string | null
  // Opaque 32-byte invite token (64-char hex) used in URLs — never the email.
  token: string | null
  personal_note: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

export interface Subscriber {
  id: string
  submitter_id: string | null
  email_encrypted: string | null
  email_blind_index: string | null
  subscribed_at: string
  unsubscribed_at: string | null
  notification_opted_out: boolean
}

export interface ModerationLog {
  id: string
  answer_id: string
  action: ModerationAction
  openai_flagged: boolean | null
  actioned_at: string
}

export interface ArchiveHeadline {
  id: string
  question_id: string
  headline: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      questions: {
        Row: Question
        Insert: Omit<Question, 'id' | 'created_at'>
        Update: Partial<Omit<Question, 'id' | 'created_at'>>
      }
      answers: {
        Row: Answer
        Insert: Omit<Answer, 'id' | 'created_at' | 'og_generated' | 'is_featured'>
        Update: Partial<Omit<Answer, 'id' | 'created_at'>>
      }
      submitters: {
        Row: Submitter
        Insert: Omit<Submitter, 'id' | 'created_at'>
        Update: Partial<Omit<Submitter, 'id' | 'created_at'>>
      }
      nominations: {
        Row: Nomination
        Insert: Omit<Nomination, 'id' | 'created_at'>
        Update: Partial<Omit<Nomination, 'id' | 'created_at'>>
      }
      subscribers: {
        Row: Subscriber
        Insert: Omit<Subscriber, 'id' | 'subscribed_at'>
        Update: Partial<Omit<Subscriber, 'id' | 'subscribed_at'>>
      }
      moderation_log: {
        Row: ModerationLog
        Insert: Omit<ModerationLog, 'id' | 'actioned_at'>
        Update: never
      }
      archive_headlines: {
        Row: ArchiveHeadline
        Insert: Omit<ArchiveHeadline, 'id' | 'created_at'>
        Update: Partial<Omit<ArchiveHeadline, 'id' | 'created_at'>>
      }
    }
    Functions: {
      publish_question: {
        Args: { new_question_id: string }
        Returns: void
      }
    }
  }
}
