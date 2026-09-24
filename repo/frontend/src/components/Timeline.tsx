import { useState } from 'react'
import { Clock, Radio, Flame, Search, Droplets, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import type { TimelineEvent, SpeakerSegment } from '../types'
import { format } from 'date-fns'

interface TimelineProps {
  events: TimelineEvent[]
  speakerSegments: SpeakerSegment[]
}

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  command: { icon: Radio, color: 'text-blue-600', bgColor: 'bg-blue-100', label: '指挥部' },
  firefighting: { icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-100', label: '灭火组' },
  rescue: { icon: Search, color: 'text-green-600', bgColor: 'bg-green-100', label: '搜救组' },
  support: { icon: Droplets, color: 'text-cyan-600', bgColor: 'bg-cyan-100', label: '供水组' },
  security: { icon: ShieldAlert, color: 'text-purple-600', bgColor: 'bg-purple-100', label: '警戒组' },
  other: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100', label: '其他' },
}

export default function Timeline({ events, speakerSegments }: TimelineProps) {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const allEvents = [
    ...events.map(e => ({ ...e, isSpeaker: false })),
    ...speakerSegments.map(s => ({
      id: -s.id,
      fire_case_id: 0,
      event_time: s.start_time,
      event_type: s.speaker_role === '指挥部' ? 'command' : 
                  s.speaker_role === '灭火组' ? 'firefighting' :
                  s.speaker_role === '搜救组' ? 'rescue' :
                  s.speaker_role === '供水组' ? 'support' :
                  s.speaker_role === '警戒组' ? 'security' : 'other',
      title: `${s.speaker_role} - ${s.text.slice(0, 30)}${s.text.length > 30 ? '...' : ''}`,
      description: s.text,
      source: s.speaker_role,
      created_at: '',
      isSpeaker: true,
      speaker: s.speaker,
    }))
  ].sort((a, b) => a.event_time - b.event_time)

  const filteredEvents = activeFilter
    ? allEvents.filter(e => e.event_type === activeFilter)
    : allEvents

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-fire-500" />
          事件时间线
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeFilter === null ? 'bg-fire-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {Object.entries(eventTypeConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                activeFilter === key ? 'bg-fire-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <config.icon className="w-3 h-3" />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无时间线事件</p>
              <p className="text-sm">上传音频并生成摘要后将自动生成时间线</p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const config = eventTypeConfig[event.event_type] || eventTypeConfig.other
              const isExpanded = expandedEvent === event.id

              return (
                <div
                  key={event.id}
                  className={`relative pl-10 ${
                    isExpanded ? '' : 'cursor-pointer hover:bg-gray-50'
                  } rounded p-2 -ml-2`}
                  onClick={() => !isExpanded && setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                >
                  <div
                    className={`absolute left-2 top-3 w-4 h-4 rounded-full ${config.bgColor} border-2 border-white shadow`}
                  >
                    <config.icon className={`w-3 h-3 ${config.color} m-0.5`} />
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">
                          {formatTime(event.event_time)}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">
                        {event.title}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />
                    )}
                  </div>

                  {isExpanded && event.description && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                      {event.description}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
