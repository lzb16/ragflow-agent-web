import { Link } from 'react-router-dom'
import { Bot, Plus, Settings } from 'lucide-react'

export default function Navbar() {
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === 'true'

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('is_admin')
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slate-800 hover:text-blue-600 transition-colors">
          <Bot size={20} strokeWidth={2} />
          <span className="font-semibold font-display text-[15px]">RAGflow 广场</span>
        </Link>

        <nav className="flex items-center gap-1">
          {token ? (
            <>
              {isAdmin && (
                <Link to="/admin"
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">
                  <Settings size={14} />
                  管理
                </Link>
              )}
              <Link to="/submit"
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <Plus size={15} strokeWidth={2.5} />
                分享智能体
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors ml-1 cursor-pointer">
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/register"
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">
                注册
              </Link>
              <Link to="/login"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                登录
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
