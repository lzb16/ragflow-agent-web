import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Agent } from '../types'

export default function Admin() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    setLoading(true)
    api.adminListAgents(filter)
      .then(data => setAgents(data.items))
      .finally(() => setLoading(false))
  }, [filter])

  async function handleApprove(id: number) {
    const updated = await api.adminApprove(id)
    setAgents(prev => prev.map(a => a.id === id ? updated : a))
  }

  async function handleReject(id: number) {
    const updated = await api.adminReject(id)
    setAgents(prev => prev.map(a => a.id === id ? updated : a))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理后台</h1>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← 返回首页</Link>
      </div>

      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无数据</div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
              {agent.avatar_path ? (
                <img src={`/${agent.avatar_path}`} alt={agent.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold flex-shrink-0">
                  {agent.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{agent.name}</p>
                <a href={agent.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline truncate block">{agent.url}</a>
                <p className="text-xs text-gray-400 mt-0.5">
                  提交于 {new Date(agent.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {agent.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(agent.id)}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-600">
                      通过
                    </button>
                    <button onClick={() => handleReject(agent.id)}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600">
                      拒绝
                    </button>
                  </>
                )}
                {agent.status !== 'pending' && (
                  <span className={`text-sm px-3 py-1.5 rounded-lg ${agent.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {agent.status === 'approved' ? '已通过' : '已拒绝'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
