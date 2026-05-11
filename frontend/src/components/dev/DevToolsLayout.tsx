import { Link, Outlet, useLocation } from 'react-router-dom'
import { Terminal, Activity, Zap, Eye, ToggleLeft } from 'lucide-react'

if (!import.meta.env.DEV) throw new Error('DevToolsLayout must only be rendered in DEV mode')

type NavItem = { name: string; href: string; icon: typeof Terminal }

const NAV_ITEMS: NavItem[] = [
  { name: '调试控制台', href: '/admin/dev-tools/console', icon: Terminal },
  { name: '网络监控', href: '/admin/dev-tools/network', icon: Activity },
  { name: '性能分析', href: '/admin/dev-tools/performance', icon: Zap },
  { name: '状态监控', href: '/admin/dev-tools/state', icon: Eye },
  { name: '功能开关', href: '/admin/dev-tools/feature-flags', icon: ToggleLeft },
]

export default function DevToolsLayout() {
  const location = useLocation()

  if (!import.meta.env.DEV) return null

  return (
    <div className="flex h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl min-h-[calc(100vh-8rem)]">
      <aside className="w-[220px] shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-wide">开发者工具</span>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 rounded-lg bg-slate-800/40">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">开发模式</p>
            <p className="text-[10px] text-amber-500/80 mt-0.5 font-mono">DEV only · 上线前移除</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950/50">
        <div className="p-4 md:p-6 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
