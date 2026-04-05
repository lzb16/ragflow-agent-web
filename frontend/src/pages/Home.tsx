import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { api } from '../api'
import type { Agent } from '../types'
import AgentCard from '../components/AgentCard'
import SearchBar from '../components/SearchBar'
import Navbar from '../components/Navbar'

const pageSize = 12

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [favoritedIds, setFavoritedIds] = useState<number[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const token = localStorage.getItem('token')

  useEffect(() => {
    setLoading(true)
    api.listAgents(query || undefined, page)
      .then(data => { setAgents(data.items); setTotal(data.total) })
      .finally(() => setLoading(false))
  }, [query, page])

  useEffect(() => {
    if (!token) return
    api.listMyFavorites().then(setFavoritedIds).catch(() => {})
  }, [token])

  function handleSearch(q: string) {
    setQuery(q)
    setPage(1)
  }

  function handleFavoriteToggle(agentId: number, favorited: boolean) {
    setFavoritedIds(prev =>
      favorited ? [...prev, agentId] : prev.filter(id => id !== agentId)
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-white border-b border-slate-200 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={12} />
            社区共建 · 开放共享
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3 font-display">
            发现优质 RAGflow 智能体
          </h1>
          <p className="text-slate-500 mb-8 text-[15px]">
            探索社区分享的智能体，一键使用，提升工作效率
          </p>
          <SearchBar onSearch={handleSearch} initialValue={query} />
        </div>
      </section>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {token && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setShowFavorites(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                !showFavorites
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              全部
            </button>
            <button
              onClick={() => setShowFavorites(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                showFavorites
                  ? 'bg-amber-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              <span>⭐</span>
              我的收藏
            </button>
          </div>
        )}
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">加载中...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-sm">
              {showFavorites
                  ? '还没有收藏任何智能体'
                  : query
                    ? `没有找到与"${query}"相关的智能体`
                    : '还没有智能体，快来分享第一个吧！'}
            </p>
            {!query && (
              <Link to="/submit"
                className="mt-4 inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
                分享第一个智能体 →
              </Link>
            )}
          </div>
        ) : (
          <>
            {query && (
              <p className="text-sm text-slate-500 mb-4">
                找到 <span className="font-medium text-slate-700">{total}</span> 个与
                "<span className="font-medium text-slate-700">{query}</span>"相关的智能体
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {(showFavorites ? agents.filter(a => favoritedIds.includes(a.id)) : agents)
                .map(agent => <AgentCard key={agent.id} agent={agent} favoritedIds={favoritedIds} onFavoriteToggle={handleFavoriteToggle} />)}
            </div>

            {!showFavorites && totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}>
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
