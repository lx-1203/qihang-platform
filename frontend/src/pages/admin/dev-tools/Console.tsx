import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal, Trash2, Download, Copy, Search, ChevronDown, ChevronRight,
  AlertTriangle, AlertCircle, XCircle, RefreshCw, Clock, X,
  ArrowUpDown, FileJson,
} from 'lucide-react'
import { getErrors, clearErrors } from '@/utils/devErrorCapture'
import { getRequests, clearRequests } from '@/utils/devApiInterceptor'
import { useDevMode } from '@/hooks/useDevMode'

// ============================================================================
// 类型定义（匹配 devErrorCapture / devApiInterceptor 的内部类型）
// ============================================================================

type TabKey = 'logs' | 'api'
type LogFilter = 'all' | 'error' | 'unhandledrejection' | 'console_error'

/** 错误日志记录 — 匹配 devErrorCapture 中的 ErrorRecord */
interface ErrorRecord {
  readonly id: number
  readonly type: 'error' | 'unhandledrejection' | 'console_error'
  readonly message: string
  readonly stack: string | null
  readonly timestamp: number
  readonly url: string
}

/** API 请求记录 — 匹配 devApiInterceptor 中的 RequestRecord */
interface RequestRecordReadonly {
  readonly id: number
  readonly url: string
  readonly method: string
  readonly status: number
  readonly startTime: number
  readonly endTime: number
  readonly duration: number
  readonly requestHeaders: Record<string, string>
  readonly requestBody: string | null
  readonly responseHeaders: Record<string, string>
  readonly responseBody: string | null
  readonly error: string | null
}

// ============================================================================
// 常量
// ============================================================================

/** 日志类型配置：标签文字、颜色样式 */
const LOG_TYPE_CONFIG: Record<LogFilter, { label: string; bg: string; text: string; border: string; dot: string }> = {
  all: { label: '全部', bg: 'bg-slate-700', text: 'text-slate-300', border: 'border-slate-600', dot: 'bg-slate-400' },
  error: { label: 'Error', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  unhandledrejection: { label: 'Unhandled', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  console_error: { label: 'Console', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
}

/** HTTP Method 颜色配置 */
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
}

/** HTTP Status 分类颜色 */
function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  if (status >= 300 && status < 400) return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  if (status >= 400 && status < 500) return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  if (status >= 500) return 'bg-red-500/10 text-red-400 border-red-500/30'
  return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
}

/** 自动刷新间隔（毫秒） */
const POLL_INTERVAL = 2000

// ============================================================================
// 工具函数
// ============================================================================

/** 截断 URL 用于表格展示 */
function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url
  return url.slice(0, maxLen - 3) + '...'
}

/** 格式化时间戳为 HH:MM:SS.mmm */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

/** 格式化相对时间 */
function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 1000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

/** JSON 格式化（尝试 parse 再 indent=2） */
function formatJson(raw: string | null): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

/** 安全 JSON stringify 用于复制/导出 */
function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// ============================================================================
// 自定义 Activity 图标（lucide-react 中无 Activity 命名导出）
// ============================================================================

function Activity({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

// ============================================================================
// 子组件 — 详情区块
// ============================================================================

function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{title}</span>
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="text-slate-600 hover:text-slate-400 transition-colors"
          title="复制"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
      <pre className="text-[11px] text-slate-400 leading-relaxed overflow-x-auto max-h-[180px] overflow-y-auto p-2 rounded-md bg-slate-950/60 border border-slate-800 font-mono whitespace-pre-wrap break-all">
        {content || <span className="text-slate-600 italic">(empty)</span>}
      </pre>
    </div>
  )
}

// ============================================================================
// 子组件 — 日志面板 (Tab 1)
// ============================================================================

function LogsPanel() {
  const [errors, setErrors] = useState<readonly ErrorRecord[]>([])
  const [filter, setFilter] = useState<LogFilter>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 拉取最新数据
  const refresh = useCallback(() => {
    setErrors(getErrors().slice() as unknown as readonly ErrorRecord[])
  }, [])

  // 定时轮询
  useEffect(() => {
    refresh()
    if (isPolling) {
      intervalRef.current = setInterval(refresh, POLL_INTERVAL)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh, isPolling])

  // 过滤 + 搜索
  const filteredErrors = useMemo(() => {
    let list = errors.slice().reverse()
    if (filter !== 'all') {
      list = list.filter((e) => e.type === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.message.toLowerCase().includes(q))
    }
    return list
  }, [errors, filter, search])

  // 清空日志
  const handleClear = () => {
    clearErrors()
    setErrors([])
    setExpandedId(null)
  }

  // 下载 JSON 文件
  const handleDownload = () => {
    const blob = new Blob([safeStringify(filteredErrors)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dev-errors-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 复制为 JSON
  const handleCopy = async () => {
    await navigator.clipboard.writeText(safeStringify(filteredErrors))
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 过滤按钮组 */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
          {(Object.keys(LOG_TYPE_CONFIG) as LogFilter[]).map((key) => {
            const cfg = LOG_TYPE_CONFIG[key]
            const count = key === 'all'
              ? errors.length
              : errors.filter((e) => e.type === key).length
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === key
                    ? `${cfg.bg} ${cfg.text}`
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {key !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                {cfg.label}
                <span className={`text-[10px] ml-0.5 ${filter === key ? 'opacity-70' : 'opacity-50'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索日志..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-600 focus:bg-slate-800 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* 自动刷新开关 */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isPolling
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-500 border border-slate-600'
            }`}
            title={isPolling ? '停止自动刷新' : '开启自动刷新'}
          >
            <RefreshCw
              className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`}
              style={isPolling ? { animationDuration: '2s' } : undefined}
            />
            自动
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-700/50 border border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="复制为 JSON"
          >
            <Copy className="w-3 h-3" />
            复制
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-700/50 border border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="下载 JSON 文件"
          >
            <Download className="w-3 h-3" />
            导出
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
            title="清空日志"
          >
            <Trash2 className="w-3 h-3" />
            清空
          </button>
        </div>
      </div>

      {/* 日志列表（终端风格） */}
      <div className="flex-1 overflow-auto rounded-lg bg-slate-950 border border-slate-800 font-mono">
        {filteredErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-600">
            <Terminal className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-xs">暂无日志记录</p>
            <p className="text-[10px] mt-1 opacity-60">
              {errors.length === 0 ? '页面尚未捕获到任何错误' : '当前过滤条件下无匹配结果'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filteredErrors.map((err) => {
              const cfg = LOG_TYPE_CONFIG[err.type]
              const isExpanded = expandedId === err.id

              return (
                <div key={err.id}>
                  {/* 日志摘要行 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : err.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800/30 transition-colors group flex items-start gap-2.5"
                  >
                    {/* 类型标签 */}
                    <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>

                    {/* 时间戳 */}
                    <span className="shrink-0 text-[10px] text-slate-500 mt-px tabular-nums">
                      {formatTime(err.timestamp)}
                    </span>

                    {/* 消息摘要 */}
                    <span className="flex-1 text-xs text-slate-300 truncate group-hover:text-slate-200">
                      {err.message}
                    </span>

                    {/* 展开/折叠图标 */}
                    <span className="shrink-0 text-slate-600 group-hover:text-slate-400 mt-px">
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3" />
                        : <ChevronRight className="w-3 h-3" />
                      }
                    </span>
                  </button>

                  {/* 展开详情 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 py-2.5 mx-3 mb-2 rounded-lg bg-slate-900/80 border border-slate-800">
                          {/* 完整消息 */}
                          <div className="mb-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Message</span>
                            <p className="text-xs text-slate-300 mt-0.5 break-all">{err.message}</p>
                          </div>

                          {/* 来源 URL */}
                          {err.url && (
                            <div className="mb-2">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Source</span>
                              <p className="text-[11px] text-slate-500 mt-0.5 break-all">{err.url}</p>
                            </div>
                          )}

                          {/* 时间戳 */}
                          <div className="mb-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Timestamp</span>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(err.timestamp).toLocaleString()}
                              <span className="text-slate-600 ml-2">({formatRelativeTime(err.timestamp)})</span>
                            </p>
                          </div>

                          {/* 堆栈信息 */}
                          {err.stack ? (
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Stack Trace</span>
                              <pre className="mt-1 p-2.5 rounded-md bg-slate-950/80 text-[11px] text-slate-400 leading-relaxed overflow-x-auto max-h-[240px] overflow-y-auto border border-slate-800">
                                {err.stack}
                              </pre>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Stack Trace</span>
                              <p className="text-[11px] text-slate-600 mt-0.5 italic">No stack trace available</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-600">
        <span>
          共 {errors.length} 条记录
          {filteredErrors.length !== errors.length && ` · 过滤后 ${filteredErrors.length} 条`}
        </span>
        {isPolling && (
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            每 {POLL_INTERVAL / 1000}s 自动刷新
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 子组件 — API 请求面板 (Tab 2)
// ============================================================================

function ApiRequestsPanel() {
  const [requests, setRequests] = useState<readonly RequestRecordReadonly[]>([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 拉取最新数据
  const refresh = useCallback(() => {
    setRequests(getRequests().slice() as unknown as readonly RequestRecordReadonly[])
  }, [])

  // 定时轮询
  useEffect(() => {
    refresh()
    if (isPolling) {
      intervalRef.current = setInterval(refresh, POLL_INTERVAL)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh, isPolling])

  // 过滤 + 搜索
  const filteredRequests = useMemo(() => {
    let list = requests.slice().reverse()
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.url.toLowerCase().includes(q))
    }
    return list
  }, [requests, search])

  // 清空请求记录
  const handleClear = () => {
    clearRequests()
    setRequests([])
    setExpandedId(null)
  }

  // 下载 JSON 文件
  const handleDownload = () => {
    const blob = new Blob([safeStringify(filteredRequests)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dev-requests-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 复制为 JSON
  const handleCopy = async () => {
    await navigator.clipboard.writeText(safeStringify(filteredRequests))
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 URL..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-600 focus:bg-slate-800 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* 自动刷新开关 */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isPolling
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-500 border border-slate-600'
            }`}
            title={isPolling ? '停止自动刷新' : '开启自动刷新'}
          >
            <RefreshCw
              className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`}
              style={isPolling ? { animationDuration: '2s' } : undefined}
            />
            自动
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-700/50 border border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="复制为 JSON"
          >
            <Copy className="w-3 h-3" />
            复制
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-700/50 border border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="下载 JSON 文件"
          >
            <Download className="w-3 h-3" />
            导出
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
            title="清空请求记录"
          >
            <Trash2 className="w-3 h-3" />
            清空
          </button>
        </div>
      </div>

      {/* 请求表格 */}
      <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-900">
        {filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-600">
            <Activity className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-xs">暂无 API 请求记录</p>
            <p className="text-[10px] mt-1 opacity-60">发起网络请求后将在此显示</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800/60 text-left">
                  <th className="px-3 py-2 font-medium text-slate-400 whitespace-nowrap">Method</th>
                  <th className="px-3 py-2 font-medium text-slate-400">URL</th>
                  <th className="px-3 py-2 font-medium text-slate-400 whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 font-medium text-slate-400 whitespace-nowrap text-right">Duration</th>
                  <th className="px-3 py-2 font-medium text-slate-400 whitespace-nowrap text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredRequests.map((req) => {
                  const isExpanded = expandedId === req.id
                  const methodColor = METHOD_COLORS[req.method] || 'bg-slate-500/10 text-slate-400 border-slate-500/30'

                  return (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    >
                      {/* Method */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${methodColor}`}>
                          {req.method}
                        </span>
                      </td>

                      {/* URL */}
                      <td className="px-3 py-2 max-w-[300px]">
                        <span className="text-slate-300 truncate block" title={req.url}>
                          {truncateUrl(req.url)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(req.status)}`}>
                          {req.status || '--'}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-2 whitespace-nowrap text-right text-slate-400 tabular-nums">
                        {req.duration} ms
                      </td>

                      {/* Time */}
                      <td className="px-3 py-2 whitespace-nowrap text-right text-slate-500 tabular-nums">
                        {formatTime(req.startTime)}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 展开详情面板 */}
      <AnimatePresence>
        {expandedId !== null && (() => {
          const req = requests.find((r) => r.id === expandedId)
          if (!req) return null

          return (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
                {/* 详情头部 */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${METHOD_COLORS[req.method] || 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                      {req.method}
                    </span>
                    <span className="text-xs text-slate-300 font-medium truncate" title={req.url}>
                      {req.url}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 请求/响应详情网格 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                  <DetailSection title="Request Headers" content={safeStringify(req.requestHeaders)} />
                  <DetailSection title="Request Body" content={formatJson(req.requestBody)} />
                  <DetailSection title="Response Headers" content={safeStringify(req.responseHeaders)} />
                  <DetailSection title="Response Body" content={formatJson(req.responseBody)} />
                </div>

                {/* 错误信息（如有） */}
                {req.error && (
                  <div className="px-4 py-2.5 border-t border-slate-800 bg-red-500/5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-xs text-red-400 font-medium">Error:</span>
                      <span className="text-xs text-red-300">{req.error}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-600">
        <span>
          共 {requests.length} 条请求
          {filteredRequests.length !== requests.length && ` · 过滤后 ${filteredRequests.length} 条`}
        </span>
        {isPolling && (
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            每 {POLL_INTERVAL / 1000}s 自动刷新
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export default function Console() {
  const { devToolsEnabled } = useDevMode()
  const [activeTab, setActiveTab] = useState<TabKey>('logs')

  // 开发者工具已被禁用
  if (!devToolsEnabled) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center">
            <Terminal className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium">开发者工具已禁用</p>
          <p className="text-slate-600 text-xs">请通过功能开关重新启用</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-12rem)]">
      {/* 页面标题 */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-white">调试控制台</h1>
        <p className="text-xs text-slate-500 mt-0.5">实时监控错误日志与 API 请求，仅开发模式可见</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 mb-5 bg-slate-800/50 rounded-lg p-1 w-fit">
        {([
          { key: 'logs' as TabKey, label: '日志面板', icon: AlertTriangle },
          { key: 'api' as TabKey, label: 'API 请求', icon: FileJson },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容区 */}
      <div className="flex-1 min-h-0">
        {activeTab === 'logs' && <LogsPanel />}
        {activeTab === 'api' && <ApiRequestsPanel />}
      </div>
    </div>
  )
}
