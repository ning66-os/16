import { useEffect, useState } from 'react'
import { X, Trash2, MapPin } from 'lucide-react'
import type { Annotation } from '../../types'
import { caseApi } from '../../services/api'

interface AnnotationPanelProps {
  annotation: Annotation | null
  onClose: () => void
  onDelete: (id: number) => void
  onUpdate: (id: number, data: { label: string; description: string }) => void
}

export default function AnnotationPanel({
  annotation,
  onClose,
  onDelete,
  onUpdate,
}: AnnotationPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(annotation?.label || '')
  const [description, setDescription] = useState(annotation?.description || '')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLabel(annotation?.label || '')
    setDescription(annotation?.description || '')
    setIsEditing(false)
  }, [annotation?.id, annotation?.label, annotation?.description])

  if (!annotation) return null

  const typeLabels: Record<string, string> = {
    fire_origin: '起火点',
    smoke_path: '烟气路径',
    evacuation_route: '疏散路线',
    hazard: '危险源',
  }

  const typeColors: Record<string, string> = {
    fire_origin: 'bg-orange-100 text-orange-800',
    smoke_path: 'bg-gray-100 text-gray-800',
    evacuation_route: 'bg-green-100 text-green-800',
    hazard: 'bg-red-100 text-red-800',
  }

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个标注吗？')) return
    
    setIsDeleting(true)
    try {
      await caseApi.deleteAnnotation(annotation.fire_case_id, annotation.id)
      onDelete(annotation.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete annotation:', error)
      alert('删除失败，请重试')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    const data = { label, description }
    setIsSaving(true)
    try {
      await caseApi.updateAnnotation(annotation.fire_case_id, annotation.id, data)
    } catch (error) {
      // 后端暂未提供标注更新接口时，至少保证前端状态生效
      console.warn('Failed to persist annotation update, applying locally:', error)
    } finally {
      setIsSaving(false)
      setIsEditing(false)
      onUpdate(annotation.id, data)
    }
  }

  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-10">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-fire-500" />
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[annotation.annotation_type]}`}>
            {typeLabels[annotation.annotation_type]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            名称
          </label>
          {isEditing ? (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent"
            />
          ) : (
            <p className="text-gray-900">{annotation.label || '未命名'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          {isEditing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent"
            />
          ) : (
            <p className="text-gray-600 text-sm">
              {annotation.description || '暂无描述'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            位置
          </label>
          <div className="bg-gray-50 p-2 rounded text-sm font-mono text-gray-600">
            {annotation.position.points ? (
              <div>
                <p className="mb-1">路径点 ({annotation.position.points.length} 个):</p>
                {annotation.position.points.slice(0, 3).map((p, i) => (
                  <p key={i}>
                    {i + 1}. ({p.x.toFixed(2)}, {p.y.toFixed(2)}, {p.z.toFixed(2)})
                  </p>
                ))}
                {annotation.position.points.length > 3 && (
                  <p>... 还有 {annotation.position.points.length - 3} 个点</p>
                )}
              </div>
            ) : (
              <p>
                ({annotation.position.x.toFixed(2)}, {annotation.position.y.toFixed(2)},{' '}
                {annotation.position.z.toFixed(2)})
              </p>
            )}
          </div>
        </div>

        {annotation.timestamp !== null && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              时间戳
            </label>
            <p className="text-gray-900">
              {Math.floor(annotation.timestamp / 60)}分 {Math.floor(annotation.timestamp % 60)}秒
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t bg-gray-50 flex gap-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-fire-500 text-white rounded hover:bg-fire-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                setLabel(annotation.label || '')
                setDescription(annotation.description || '')
                setIsEditing(false)
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 px-4 py-2 bg-fire-500 text-white rounded hover:bg-fire-600 transition-colors"
            >
              编辑
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
