import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { caseApi } from '../services/api'
import { useViewerStore } from '../store/useViewerStore'
import { BuildingViewer, AnnotationPanel } from '../components/BuildingViewer'
import type { Annotation, FireCase } from '../types'
import * as THREE from 'three'

export default function Viewer3DPage() {
  const { id } = useParams<{ id: string }>()
  const caseId = id ? parseInt(id) : null

  const [fireCase, setFireCase] = useState<FireCase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null)

  const {
    annotations,
    setCaseId,
    setAnnotations,
    updateAnnotation,
    removeAnnotation,
  } = useViewerStore()

  useEffect(() => {
    if (caseId) {
      setCaseId(caseId)
      loadData()
    }
    return () => {
      setCaseId(null)
    }
  }, [caseId, setCaseId])

  const loadData = async () => {
    if (!caseId) return
    setIsLoading(true)
    try {
      const [caseRes, annotationsRes] = await Promise.all([
        caseApi.get(caseId),
        caseApi.getAnnotations(caseId),
      ])
      setFireCase(caseRes.data)
      setAnnotations(annotationsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation)
  }

  const handleCanvasClick = () => {
    setSelectedAnnotation(null)
  }

  const handleAnnotationUpdate = (annotationId: number, data: { label: string; description: string }) => {
    updateAnnotation(annotationId, data)
    setSelectedAnnotation((prev) =>
      prev && prev.id === annotationId ? { ...prev, ...data } : prev
    )
  }

  const handleAnnotationDelete = (annotationId: number) => {
    removeAnnotation(annotationId)
    setSelectedAnnotation(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fire-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={fireCase ? `/cases/${fireCase.id}` : '/'}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">
              {fireCase?.title || '三维标注场景'}
            </h1>
            <p className="text-sm text-gray-400">
              {fireCase?.case_number || ''}
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {annotations.length} 个标注
        </div>
      </header>

      <div className="relative" style={{ height: 'calc(100vh - 72px)' }}>
        <BuildingViewer
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
          onCanvasClick={handleCanvasClick}
          isDrawingPath={false}
          pathPoints={[]}
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
  )
}
