import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Plus, Settings, KeyRound, LogOut, UserCircle } from 'lucide-react'

export default function Navbar() {
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === 'true'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

              {/* 用户菜单 */}
              <div className="relative ml-1" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                  <UserCircle size={20} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-10 w-36 bg-white border border-slate-200 rounded-xl shadow-md py-1 z-50">
                    <Link
                      to="/change-password"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                      <KeyRound size={14} />
                      修改密码
                    </Link>
                    <div className="h-px bg-slate-100 mx-2 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors cursor-pointer">
                      <LogOut size={14} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
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
