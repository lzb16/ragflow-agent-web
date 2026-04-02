import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const data = await api.login(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('is_admin', String(data.is_admin))
      const redirect = params.get('redirect') || '/'
      navigate(redirect, { replace: true })
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">登录</h1>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <button type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-medium">
            登录
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          还没有账号？<Link to="/register" className="text-blue-500 hover:underline">注册</Link>
        </p>
      </div>
    </div>
  )
}
