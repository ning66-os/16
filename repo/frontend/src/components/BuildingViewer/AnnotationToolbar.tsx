import { Flame, CloudFog, MousePointer2, AlertTriangle, Footprints } from 'lucide-react'
import type { AnnotationTool } from '../../types'

interface AnnotationToolbarProps {
  currentTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  isDrawingPath: boolean
  onFinishPath: () => void
  onCancelPath: () => void
}

const tools: { id: AnnotationTool; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'select', label: '选择', icon: MousePointer2, color: 'text-gray-600' },
  { id: 'fire_origin', label: '起火点', icon: Flame, color: 'text-orange-500' },
  { id: 'smoke_path', label: '烟气路径', icon: CloudFog, color: 'text-gray-500' },
  { id: 'evacuation_route', label: '疏散路线', icon: Footprints, color: 'text-green-500' },
  { id: 'hazard', label: '危险源', icon: AlertTriangle, color: 'text-red-500' },
]

export default function AnnotationToolbar({
  currentTool,
  onToolChange,
  isDrawingPath,
  onFinishPath,
  onCancelPath,
}: AnnotationToolbarProps) {
  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 z-10">
      {isDrawingPath ? (
        <div className="flex gap-2">
          <button
            onClick={onFinishPath}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            完成路径
          </button>
          <button
            onClick={onCancelPath}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                currentTool === tool.id
                  ? 'bg-fire-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title={tool.label}
            >
              <tool.icon className={`w-5 h-5 ${currentTool === tool.id ? 'text-white' : tool.color}`} />
              <span className="text-sm">{tool.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
