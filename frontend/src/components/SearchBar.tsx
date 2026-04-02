import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search } from 'lucide-react'

interface Props {
  onSearch: (q: string) => void
  initialValue?: string
}

export default function SearchBar({ onSearch, initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSearch(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="搜索智能体名称或描述..."
          className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white"
        />
      </div>
      <button type="submit"
        className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">
        搜索
      </button>
    </form>
  )
}
