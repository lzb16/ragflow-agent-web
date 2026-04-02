import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, ShieldOff, ClipboardList, Users } from 'lucide-react'
import { api } from '../api'
import type { AdminUser } from '../types'
import Navbar from '../components/Navbar'

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const storedUserId = localStorage.getItem('user_id')
  const currentUserId = storedUserId ? Number(storedUserId) : null

  useEffect(() => {
    api.adminListUsers()
      .then(data => setUsers(data.items))
      .finally(() => setLoading(false))
  }, [])

  async function handleSetAdmin(userId: number, isAdmin: boolean) {
    setUpdating(userId)
    try {
      const updated = await api.adminSetAdmin(userId, isAdmin)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    } finally {
      setUpdating(null)
    }
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
          <Link to="/admin"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <ClipboardList size={14} />
            智能体审核
          </Link>
          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-800 shadow-sm">
            <Users size={14} />
            用户管理
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">加载中...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">用户名</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">邮箱</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">注册时间</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">角色</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{user.username}</td>
                    <td className="px-4 py-3 text-slate-500">{user.email}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                          <ShieldCheck size={11} />
                          管理员
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          普通用户
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.id === currentUserId ? (
                        <span className="text-xs text-slate-300">（当前账号）</span>
                      ) : user.is_admin ? (
                        <button
                          onClick={() => handleSetAdmin(user.id, false)}
                          disabled={updating === user.id}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                          <ShieldOff size={12} />
                          撤销管理员
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetAdmin(user.id, true)}
                          disabled={updating === user.id}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                          <ShieldCheck size={12} />
                          设为管理员
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
