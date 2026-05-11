import { Eye, Database } from 'lucide-react';

/** 状态监控 - 开发者工具占位页面 */
export default function State() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-4">
        <Eye className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">状态监控</h2>
      <p className="text-sm text-slate-400 mb-2">查看 Zustand Store 状态、追踪状态变更</p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Database className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-500 font-mono">开发中，即将上线</span>
      </div>
    </div>
  );
}
