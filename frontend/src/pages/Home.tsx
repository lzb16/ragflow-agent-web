import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Agent } from '../types'
import AgentCard from '../components/AgentCard'
import SearchBar from '../components/SearchBar'

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === 'true'
  const pageSize = 12

  useEffect(() => {
    setLoading(true)
    api.listAgents(query || undefined, page)
      .then(data => { setAgents(data.items); setTotal(data.total) })
      .finally(() => setLoading(false))
  }, [query, page])

  function handleSearch(q: string) {
    setQuery(q)
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">RAGflow 智能体广场</h1>
        <div className="flex gap-2">
          {token ? (
            <>
              <Link to="/submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                + 分享智能体
              </Link>
              {isAdmin && (
                <Link to="/admin"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                  管理
                </Link>
              )}
              <button
                onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('is_admin'); window.location.reload() }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2">
                退出
              </button>
            </>
          ) : (
            <Link to="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
              登录
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6">
        <SearchBar onSearch={handleSearch} initialValue={query} />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {query ? `没有找到与"${query}"相关的智能体` : '还没有智能体，快来分享第一个吧！'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full text-sm ${p === page ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
