import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Clock, MapPin, ChevronRight, PlusCircle } from 'lucide-react'
import { caseApi } from '../services/api'
import type { FireCase, FireCaseCreate } from '../types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function CaseListPage() {
  const [cases, setCases] = useState<FireCase[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCase, setNewCase] = useState<FireCaseCreate>({
    case_number: '',
    title: '',
    description: '',
    location: '',
    fire_date: '',
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    try {
      const response = await caseApi.list()
      setCases(response.data)
    } catch (error) {
      console.error('Failed to load cases:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCase.case_number || !newCase.title) {
      alert('请填写案件编号和案件名称')
      return
    }

    setIsCreating(true)
    try {
      await caseApi.create(newCase)
      setShowCreateModal(false)
      setNewCase({
        case_number: '',
        title: '',
        description: '',
        location: '',
        fire_date: '',
      })
      loadCases()
    } catch (error) {
      console.error('Failed to create case:', error)
      alert('创建失败，请重试')
    } finally {
      setIsCreating(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    processing: { label: '处理中', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    audio_processed: { label: '音频已处理', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    completed: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-100' },
    failed: { label: '处理失败', color: 'text-red-700', bgColor: 'bg-red-100' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-fire-500" />
                火灾调查复盘系统
              </h1>
              <p className="mt-1 text-gray-500">时序复原纪要管理平台</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-fire-500 text-white rounded-lg hover:bg-fire-600 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              新建案件
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {cases.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-fire-100 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-fire-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无案件</h3>
            <p className="text-gray-500 mb-6">创建您的第一个火灾调查案件</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-fire-500 text-white rounded-lg hover:bg-fire-600 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              创建案件
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((fireCase) => {
              const status = statusConfig[fireCase.status] || statusConfig.processing
              return (
                <Link
                  key={fireCase.id}
                  to={`/cases/${fireCase.id}`}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono text-gray-400">
                        {fireCase.case_number}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-800 mt-1">
                        {fireCase.title}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {fireCase.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {fireCase.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    {fireCase.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate max-w-[120px]">{fireCase.location}</span>
                      </div>
                    )}
                    {fireCase.fire_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(fireCase.fire_date), 'yyyy-MM-dd', { locale: zhCN })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      创建于 {format(new Date(fireCase.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">新建案件</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  案件编号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCase.case_number}
                  onChange={(e) => setNewCase({ ...newCase, case_number: e.target.value })}
                  placeholder="例如: FIRE-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  案件名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="例如: XX大厦火灾事故调查"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  发生地点
                </label>
                <input
                  type="text"
                  value={newCase.location || ''}
                  onChange={(e) => setNewCase({ ...newCase, location: e.target.value })}
                  placeholder="火灾发生的具体地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  发生时间
                </label>
                <input
                  type="datetime-local"
                  value={newCase.fire_date || ''}
                  onChange={(e) => setNewCase({ ...newCase, fire_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  案件描述
                </label>
                <textarea
                  value={newCase.description || ''}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="简要描述火灾情况"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-fire-500 text-white rounded hover:bg-fire-600 transition-colors disabled:opacity-50"
                >
                  {isCreating ? '创建中...' : '创建案件'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
