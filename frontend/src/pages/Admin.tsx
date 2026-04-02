import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, ArrowLeft, Trash2, ClipboardList, Users } from 'lucide-react'
import { api } from '../api'
import type { Agent } from '../types'
import Navbar from '../components/Navbar'

type FilterStatus = 'pending' | 'approved' | 'rejected'

const filterLabels: Record<FilterStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

export default function Admin() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')

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

  async function handleDelete(id: number) {
    if (!confirm('确定删除该智能体吗？此操作不可撤销。')) return
    await api.adminDeleteAgent(id)
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800 font-display">管理后台</h1>
          <Link to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} />
            返回首页
          </Link>
        </div>

        {/* 顶级模块 Tab */}
        <div className="flex gap-1.5 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-800 shadow-sm">
            <ClipboardList size={14} />
            智能体审核
          </button>
          <Link to="/admin/users"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <Users size={14} />
            用户管理
          </Link>
        </div>

        {/* 审核状态筛选 */}
        <div className="flex gap-1.5 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          {(Object.keys(filterLabels) as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filter === s
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {filterLabels[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">加载中...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">暂无{filterLabels[filter]}的智能体</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map(agent => (
              <div key={agent.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                {agent.avatar_path ? (
                  <img src={`/${agent.avatar_path}`} alt={agent.name}
                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold font-display flex-shrink-0">
                    {agent.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{agent.name}</p>
                  <a href={agent.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline truncate block mt-0.5">{agent.url}</a>
                  <p className="text-xs text-slate-400 mt-0.5">
                    提交于 {new Date(agent.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {agent.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(agent.id)}
                        className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer">
                        <Check size={14} strokeWidth={2.5} />
                        通过
                      </button>
                      <button
                        onClick={() => handleReject(agent.id)}
                        className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer">
                        <X size={14} strokeWidth={2.5} />
                        拒绝
                      </button>
                    </>
                  )}
                  {agent.status !== 'pending' && (
                    <span className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium ${
                      agent.status === 'approved'
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {agent.status === 'approved'
                        ? <><Check size={13} strokeWidth={2.5} />已通过</>
                        : <><X size={13} strokeWidth={2.5} />已拒绝</>
                      }
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer">
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
