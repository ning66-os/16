import { useState } from 'react'
import { Send, X, Plus, Loader2, CheckCircle } from 'lucide-react'
import { caseApi } from '../services/api'
import type { FireCase } from '../types'

interface EmailSenderProps {
  fireCase: FireCase
  onClose: () => void
}

export default function EmailSender({ fireCase, onClose }: EmailSenderProps) {
  const [emails, setEmails] = useState<string[]>([''])
  const [subject, setSubject] = useState(`[火灾复盘报告] ${fireCase.case_number} - ${fireCase.title}`)
  const [include3dLink, setInclude3dLink] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  const addEmail = () => {
    setEmails([...emails, ''])
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index))
    }
  }

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emails.filter(e => e.trim()).every(e => emailRegex.test(e.trim()))
  }

  const handleSend = async () => {
    const validEmails = emails.filter(e => e.trim())
    
    if (validEmails.length === 0) {
      alert('请至少输入一个邮箱地址')
      return
    }

    if (!validateEmails()) {
      alert('请输入有效的邮箱地址')
      return
    }

    setIsSending(true)
    setSendResult(null)

    try {
      const response = await caseApi.sendEmail({
        fire_case_id: fireCase.id,
        to_emails: validEmails,
        subject: subject.trim() || undefined,
        include_3d_link: include3dLink,
      })

      setSendResult({
        success: response.data.success,
        message: response.data.message || (response.data.success ? '邮件发送成功！' : '邮件发送失败'),
      })

      if (response.data.success) {
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.response?.data?.detail || '发送过程中发生错误',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-fire-500" />
            发送复盘报告邮件
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-fire-50 border border-fire-200 rounded p-3">
            <p className="text-sm font-medium text-fire-800">案件: {fireCase.title}</p>
            <p className="text-xs text-fire-600">案件编号: {fireCase.case_number}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收件人邮箱
            </label>
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    placeholder="example@mail.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent text-sm"
                  />
                  {emails.length > 1 && (
                    <button
                      onClick={() => removeEmail(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addEmail}
              className="mt-2 text-sm text-fire-600 hover:text-fire-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              添加收件人
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮件主题
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fire-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include3d"
              checked={include3dLink}
              onChange={(e) => setInclude3dLink(e.target.checked)}
              className="w-4 h-4 text-fire-500 rounded focus:ring-fire-500"
            />
            <label htmlFor="include3d" className="text-sm text-gray-700">
              包含三维标注场景链接
            </label>
          </div>

          {sendResult && (
            <div
              className={`p-3 rounded flex items-center gap-2 ${
                sendResult.success
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              <span className="text-sm">{sendResult.message}</span>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            disabled={isSending}
          >
            取消
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || emails.filter(e => e.trim()).length === 0}
            className="flex-1 px-4 py-2 bg-fire-500 text-white rounded hover:bg-fire-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                发送邮件
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
