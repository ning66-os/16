import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as THREE from 'three'
import { 
  ArrowLeft, FileAudio, FileText, Send, Sparkles, 
  Loader2, MapPin, Clock, Building2
} from 'lucide-react'
import { caseApi } from '../services/api'
import { useViewerStore } from '../store/useViewerStore'
import { BuildingViewer, AnnotationToolbar, AnnotationPanel } from '../components/BuildingViewer'
import Timeline from '../components/Timeline'
import EmailSender from '../components/EmailSender'
import type { FireCase, AudioRecord, Annotation, TimelineEvent, SpeakerSegment, Report, AnnotationTool } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const caseId = id ? parseInt(id) : null

  const [fireCase, setFireCase] = useState<FireCase | null>(null)
  const [audioRecords, setAudioRecords] = useState<AudioRecord[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [speakerSegments, setSpeakerSegments] = useState<SpeakerSegment[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [activeTab, setActiveTab] = useState<'3d' | 'timeline' | 'report'>('3d')
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showEmailSender, setShowEmailSender] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const {
    annotations,
    selectedAnnotation,
    currentTool,
    isDrawingPath,
    pathPoints,
    setCaseId,
    setAnnotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    setSelectedAnnotation,
    setCurrentTool,
    setIsDrawingPath,
    addPathPoint,
    clearPathPoints,
  } = useViewerStore()

  useEffect(() => {
    if (caseId) {
      setCaseId(caseId)
      loadCaseData()
    }
    return () => {
      setCaseId(null)
    }
  }, [caseId, setCaseId])

  const loadCaseData = async () => {
    if (!caseId) return
    setIsLoading(true)
    try {
      const [caseRes, audioRes, annotationsRes, timelineRes, speakersRes, reportsRes] = await Promise.all([
        caseApi.get(caseId),
        caseApi.getAudio(caseId),
        caseApi.getAnnotations(caseId),
        caseApi.getTimeline(caseId),
        caseApi.getSpeakerSegments(caseId),
        caseApi.getReports(caseId),
      ])
      
      setFireCase(caseRes.data)
      setAudioRecords(audioRes.data)
      setAnnotations(annotationsRes.data)
      setTimelineEvents(timelineRes.data)
      setSpeakerSegments(speakersRes.data)
      setReports(reportsRes.data)
    } catch (error) {
      console.error('Failed to load case data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !caseId) return

    setIsUploading(true)
    try {
      await caseApi.uploadAudio(caseId, file)
      alert('音频上传成功，正在后台处理...')
      setTimeout(loadCaseData, 2000)
    } catch (error) {
      console.error('Failed to upload audio:', error)
      alert('上传失败，请重试')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleGenerateSummary = async () => {
    if (!caseId) return
    
    setIsGenerating(true)
    try {
      await caseApi.generateSummary(caseId)
      alert('摘要生成成功！')
      loadCaseData()
    } catch (error) {
      console.error('Failed to generate summary:', error)
      alert('生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCanvasClick = useCallback(async (point: THREE.Vector3) => {
    if (!caseId || currentTool === 'select' || isDrawingPath) return

    if (currentTool === 'smoke_path' || currentTool === 'evacuation_route') {
      if (!isDrawingPath) {
        setIsDrawingPath(true)
      }
      addPathPoint({ x: point.x, y: point.y, z: point.z })
    } else {
      try {
        const response = await caseApi.createAnnotation({
          fire_case_id: caseId,
          annotation_type: currentTool,
          position: { x: point.x, y: point.y, z: point.z },
          label: getDefaultLabel(currentTool),
        })
        addAnnotation(response.data)
      } catch (error) {
        console.error('Failed to create annotation:', error)
      }
    }
  }, [caseId, currentTool, isDrawingPath, addPathPoint, addAnnotation, setIsDrawingPath])

  const handlePathPointClick = useCallback((point: THREE.Vector3) => {
    addPathPoint({ x: point.x, y: point.y, z: point.z })
  }, [addPathPoint])

  const handleFinishPath = async () => {
    if (!caseId || pathPoints.length < 2) {
      alert('请至少添加2个点')
      return
    }

    try {
      const response = await caseApi.createAnnotation({
        fire_case_id: caseId,
        annotation_type: currentTool,
        position: {
          x: pathPoints[0].x,
          y: pathPoints[0].y,
          z: pathPoints[0].z,
          points: pathPoints,
        },
        label: getDefaultLabel(currentTool),
      })
      addAnnotation(response.data)
    } catch (error) {
      console.error('Failed to create path annotation:', error)
    } finally {
      setIsDrawingPath(false)
      clearPathPoints()
    }
  }

  const handleCancelPath = () => {
    setIsDrawingPath(false)
    clearPathPoints()
  }

  const getDefaultLabel = (tool: AnnotationTool): string => {
    const labels: Record<AnnotationTool, string> = {
      select: '',
      fire_origin: '起火点',
      smoke_path: '烟气蔓延路径',
      evacuation_route: '疏散路线',
      hazard: '危险源',
    }
    return labels[tool]
  }

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation)
  }

  const handleAnnotationUpdate = (id: number, data: { label: string; description: string }) => {
    updateAnnotation(id, data)
  }

  const handleAnnotationDelete = (id: number) => {
    removeAnnotation(id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fire-500 animate-spin" />
      </div>
    )
  }

  if (!fireCase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">案件不存在</p>
          <Link to="/" className="text-fire-500 hover:underline">返回列表</Link>
        </div>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    processing: { label: '处理中', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    audio_processed: { label: '音频已处理', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    completed: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-100' },
    failed: { label: '处理失败', color: 'text-red-700', bgColor: 'bg-red-100' },
  }
  const status = statusConfig[fireCase.status] || statusConfig.processing

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{fireCase.title}</h1>
                  <span className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span className="font-mono">{fireCase.case_number}</span>
                  {fireCase.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {fireCase.location}
                    </span>
                  )}
                  {fireCase.fire_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(fireCase.fire_date), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                <FileAudio className="w-4 h-4" />
                <span>{isUploading ? '上传中...' : '上传音频'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>

              <button
                onClick={handleGenerateSummary}
                disabled={isGenerating || audioRecords.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-fire-500 text-white rounded-lg hover:bg-fire-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>生成摘要</span>
              </button>

              <button
                onClick={() => setShowEmailSender(true)}
                disabled={reports.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>发送邮件</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex gap-1">
              {[
                { id: '3d', label: '三维标注', icon: Building2 },
                { id: 'timeline', label: '时序复盘', icon: Clock },
                { id: 'report', label: '调查报告', icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-fire-500 text-fire-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === '3d' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '70vh' }}>
                <BuildingViewer
                  annotations={annotations}
                  onAnnotationClick={handleAnnotationClick}
                  onCanvasClick={handleCanvasClick}
                  onPathPointClick={handlePathPointClick}
                  isDrawingPath={isDrawingPath}
                  pathPoints={pathPoints}
                />
                <AnnotationToolbar
                  currentTool={currentTool}
                  onToolChange={setCurrentTool}
                  isDrawingPath={isDrawingPath}
                  onFinishPath={handleFinishPath}
                  onCancelPath={handleCancelPath}
                />
                {selectedAnnotation && (
                  <AnnotationPanel
                    annotation={selectedAnnotation}
                    onClose={() => setSelectedAnnotation(null)}
                    onDelete={handleAnnotationDelete}
                    onUpdate={handleAnnotationUpdate}
                  />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-fire-500" />
                  标注列表
                </h3>
                {annotations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    暂无标注，使用左侧工具栏添加
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {annotations.map((ann) => (
                      <div
                        key={ann.id}
                        onClick={() => setSelectedAnnotation(ann)}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          selectedAnnotation?.id === ann.id
                            ? 'bg-fire-50 border border-fire-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            ann.annotation_type === 'fire_origin' ? 'bg-orange-500' :
                            ann.annotation_type === 'smoke_path' ? 'bg-gray-500' :
                            ann.annotation_type === 'evacuation_route' ? 'bg-green-500' :
                            'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium text-gray-800">
                            {ann.label || '未命名'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ann.annotation_type === 'fire_origin' ? '起火点' :
                           ann.annotation_type === 'smoke_path' ? '烟气路径' :
                           ann.annotation_type === 'evacuation_route' ? '疏散路线' : '危险源'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-fire-500" />
                  音频记录
                </h3>
                {audioRecords.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    暂无音频记录
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {audioRecords.map((audio) => (
                      <div key={audio.id} className="p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {audio.filename}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            {audio.duration ? `${Math.round(audio.duration)}秒` : '--'}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            audio.status === 'completed' ? 'bg-green-100 text-green-700' :
                            audio.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {audio.status === 'completed' ? '已完成' :
                             audio.status === 'failed' ? '失败' :
                             audio.status === 'processing' ? '处理中' :
                             audio.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <Timeline events={timelineEvents} speakerSegments={speakerSegments} />
        )}

        {activeTab === 'report' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {reports.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无调查报告</h3>
                <p className="text-gray-500 mb-4">上传音频并点击"生成摘要"按钮创建调查报告</p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={audioRecords.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-fire-500 text-white rounded-lg hover:bg-fire-600 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5" />
                  生成调查报告
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">{reports[0].title}</h2>
                  <span className="text-sm text-gray-500">
                    生成于 {format(new Date(reports[0].created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {reports[0].content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showEmailSender && (
        <EmailSender
          fireCase={fireCase}
          onClose={() => setShowEmailSender(false)}
        />
      )}
    </div>
  )
}
