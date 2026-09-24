import axios from 'axios'
import type {
  FireCase,
  FireCaseCreate,
  AudioRecord,
  Annotation,
  AnnotationCreate,
  SpeakerSegment,
  TimelineEvent,
  Report,
  EmailSendRequest,
} from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const caseApi = {
  list: () => api.get<FireCase[]>('/cases'),
  get: (id: number) => api.get<FireCase>(`/cases/${id}`),
  create: (data: FireCaseCreate) => api.post<FireCase>('/cases', data),
  update: (id: number, data: Partial<FireCase>) => api.put<FireCase>(`/cases/${id}`, data),
  uploadAudio: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/cases/${id}/upload-audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getAudio: (id: number) => api.get<AudioRecord[]>(`/cases/${id}/audio`),
  getTranscriptions: (id: number) => api.get(`/cases/${id}/transcriptions`),
  getSpeakerSegments: (id: number) => api.get<SpeakerSegment[]>(`/cases/${id}/speaker-segments`),
  createAnnotation: (data: AnnotationCreate) =>
    api.post<Annotation>(`/cases/${data.fire_case_id}/annotations`, data),
  getAnnotations: (id: number) => api.get<Annotation[]>(`/cases/${id}/annotations`),
  updateAnnotation: (caseId: number, annotationId: number, data: { label?: string; description?: string }) =>
    api.put<Annotation>(`/cases/${caseId}/annotations/${annotationId}`, data),
  deleteAnnotation: (caseId: number, annotationId: number) =>
    api.delete(`/cases/${caseId}/annotations/${annotationId}`),
  createTimelineEvent: (caseId: number, data: any) =>
    api.post<TimelineEvent>(`/cases/${caseId}/timeline-events`, data),
  getTimeline: (id: number) => api.get<TimelineEvent[]>(`/cases/${id}/timeline-events`),
  generateSummary: (id: number) => api.post(`/cases/${id}/generate-summary`),
  getReports: (id: number) => api.get<Report[]>(`/cases/${id}/reports`),
  sendEmail: (data: EmailSendRequest) =>
    api.post(`/cases/${data.fire_case_id}/send-email`, data),
  get3dLink: (id: number) => api.get(`/cases/${id}/3d-link`),
}

export default api
