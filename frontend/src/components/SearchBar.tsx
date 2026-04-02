import { useState } from 'react'
import type { FormEvent } from 'react'

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
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="搜索智能体名称或描述..."
        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
        搜索
      </button>
    </form>
  )
}
