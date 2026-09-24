export interface FireCase {
  id: number
  case_number: string
  title: string
  description: string | null
  location: string | null
  fire_date: string | null
  status: string
  created_at: string
  updated_at: string | null
}

export interface FireCaseCreate {
  case_number: string
  title: string
  description?: string
  location?: string
  fire_date?: string
}

export interface AudioRecord {
  id: number
  fire_case_id: number
  filename: string
  original_path: string | null
  denoised_path: string | null
  duration: number | null
  status: string
  created_at: string
}

export interface Annotation {
  id: number
  fire_case_id: number
  annotation_type: string
  position: {
    x: number
    y: number
    z: number
    points?: Array<{ x: number; y: number; z: number }>
  }
  label: string | null
  description: string | null
  timestamp: number | null
  created_at: string
}

export interface AnnotationCreate {
  fire_case_id: number
  annotation_type: string
  position: any
  label?: string
  description?: string
  timestamp?: number
}

export interface SpeakerSegment {
  id: number
  speaker: string
  speaker_role: string
  start_time: number
  end_time: number
  text: string
  confidence: number
}

export interface TimelineEvent {
  id: number
  fire_case_id: number
  event_time: number
  event_type: string
  title: string
  description: string | null
  source: string | null
  created_at: string
}

export interface Report {
  id: number
  fire_case_id: number
  title: string
  content: string
  content_type: string
  report_type: string
  created_at: string
}

export interface EmailSendRequest {
  fire_case_id: number
  to_emails: string[]
  subject?: string
  include_3d_link: boolean
}

export type AnnotationTool = 'select' | 'fire_origin' | 'smoke_path' | 'evacuation_route' | 'hazard'

export interface ViewerState {
  caseId: number | null
  annotations: Annotation[]
  selectedAnnotation: Annotation | null
  currentTool: AnnotationTool
  isDrawingPath: boolean
  pathPoints: Array<{ x: number; y: number; z: number }>
}
