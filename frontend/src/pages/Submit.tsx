import { useState, useRef } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Submit() {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [usageGuide, setUsageGuide] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [parseError, setParseError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  async function handleParse() {
    if (!url.trim()) return
    setParsing(true)
    setParseError('')
    try {
      const data = await api.parseLink(url.trim())
      if (data.error) {
        setParseError(data.error)
      } else {
        if (data.name) setName(data.name)
        if (data.description) setDescription(data.description)
        if (data.avatar_base64) {
          setAvatarPreview(data.avatar_base64)
          // Convert base64 to File
          const res = await fetch(data.avatar_base64)
          const blob = await res.blob()
          const file = new File([blob], 'avatar.png', { type: blob.type })
          setAvatarFile(file)
        }
      }
    } catch (_err: unknown) {
      setParseError('解析失败，请手动填写')
    } finally {
      setParsing(false)
    }
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setError('')
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('url', url.trim())
      if (description) fd.append('description', description)
      if (tags) fd.append('tags', tags)
      if (usageGuide) fd.append('usage_guide', usageGuide)
      if (avatarFile) fd.append('avatar', avatarFile)
      const agent = await api.submitAgent(fd)
      navigate(`/agents/${agent.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">分享智能体</h1>

      <div className="bg-white rounded-xl shadow p-6">
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        {/* 链接解析 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            RAGflow 分享链接 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="http://your-ragflow/share?shared_id=..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button type="button" onClick={handleParse} disabled={parsing || !url}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
              {parsing ? '解析中...' : '解析'}
            </button>
          </div>
          {parseError && <p className="text-orange-500 text-xs mt-1">{parseError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 头像 */}
          <div>
            <label className="block text-sm font-medium mb-1">头像</label>
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">?</div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-500 hover:underline">
                {avatarPreview ? '更换图片' : '上传图片'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              名称 <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium mb-1">标签（逗号分隔）</label>
            <input type="text" value={tags} onChange={e => setTags(e.target.value)}
              placeholder="办公,法律,代码"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* 使用说明 */}
          <div>
            <label className="block text-sm font-medium mb-1">使用说明</label>
            <textarea value={usageGuide} onChange={e => setUsageGuide(e.target.value)} rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          <button type="submit" disabled={submitting || !name.trim() || !url.trim()}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">
            {submitting ? '提交中...' : '提交审核'}
          </button>
        </form>
      </div>
    </div>
  )
}
