import { useState, useRef } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Upload, Sparkles } from 'lucide-react'
import { api } from '../api'
import Navbar from '../components/Navbar'

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
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8">
        <Link to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowLeft size={14} />
          返回首页
        </Link>

        <h1 className="text-2xl font-bold text-slate-800 font-display mb-1">分享智能体</h1>
        <p className="text-slate-500 text-sm mb-6">填写信息后提交审核，审核通过后将展示在广场</p>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {/* URL 解析 */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              RAGflow 分享链接 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="http://your-ragflow/share?shared_id=..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={handleParse}
                disabled={parsing || !url}
                className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap">
                <Sparkles size={13} />
                {parsing ? '解析中...' : '自动解析'}
              </button>
            </div>
            {parseError && (
              <p className="text-orange-500 text-xs mt-1.5">{parseError}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 头像 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">头像</label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <Upload size={18} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                  {avatarPreview ? '更换图片' : '上传图片'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>

            {/* 名称 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              />
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">标签</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="办公, 法律, 代码（逗号分隔）"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* 使用说明 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">使用说明</label>
              <textarea
                value={usageGuide}
                onChange={e => setUsageGuide(e.target.value)}
                rows={4}
                placeholder="描述如何使用这个智能体..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim() || !url.trim()}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors cursor-pointer">
              {submitting ? '提交中...' : '提交审核'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
