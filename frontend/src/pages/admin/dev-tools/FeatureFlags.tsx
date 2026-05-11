import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ToggleLeft, ToggleRight, RefreshCw, Upload, CheckCircle2,
  AlertCircle, Zap, Shield, Globe, Clock,
} from 'lucide-react';
import {
  getFlags, setFlag, applyPreset, syncToBackend, loadFromBackend,
  getPresets, getLastUpdatedAt, FLAG_META,
  type FlagMap, type PresetName,
} from '@/utils/featureFlags';
import http from '@/api/http';

// ====== 功能开关管理页面 ======
// 管理员在此页面集中管理所有功能模块的启用/禁用状态。
//
// 核心功能：
// 1. 显示所有功能开关（名称、描述、当前状态、最后修改时间）
// 2. Switch Toggle 切换单个开关（即时生效 + localStorage 持久化）
// 3. 预设模板：全开 / 仅核心 / 维护模式
// 4. 同步到后端服务器（写入 MySQL feature_flags 表）
// 5. 从后端加载最新配置

// ====== 小型 Toggle Switch 组件 ======

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

function ToggleSwitch({ checked, onChange, disabled = false, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
        transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2
        focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${checked ? 'bg-amber-500' : 'bg-slate-600'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md
          ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}
      />
    </button>
  );
}

// ====== 状态徽章组件 ======

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-medium">
      <CheckCircle2 className="w-3 h-3" />
      已启用
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-400 text-xs font-medium">
      <AlertCircle className="w-3 h-3" />
      已禁用
    </span>
  );
}

// ====== 预设按钮组件 ======

interface PresetButtonProps {
  name: PresetName;
  icon: typeof Zap;
  description: string;
  onApply: (name: PresetName) => void;
  isLoading: boolean;
}

function PresetButton({ name, icon: Icon, description, onApply, isLoading }: PresetButtonProps) {
  return (
    <button
      onClick={() => onApply(name)}
      disabled={isLoading}
      className="flex flex-col items-start gap-2 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50
        hover:border-amber-500/30 hover:bg-slate-800 transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed text-left w-full"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-sm font-semibold text-white">{name}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </button>
  );
}

// ====== 预设描述映射 ======

const PRESET_DESCRIPTIONS: Record<PresetName, { icon: typeof Zap; description: string }> = {
  '全开': { icon: Zap, description: '启用所有功能模块，适用于正常运行状态' },
  '仅核心': { icon: Globe, description: '仅开放核心模块（求职、课程、升学），关闭辅助功能' },
  '维护模式': { icon: Shield, description: '关闭所有功能模块，仅保留管理后台访问' },
};

// ====== 主页面组件 ======

export default function FeatureFlags() {
  // 当前开关状态
  const [flags, setFlags] = useState<FlagMap>(() => getFlags());
  // 后端存储的各开关更新时间
  const [serverTimestamps, setServerTimestamps] = useState<Record<string, string>>({});
  // 同步状态
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // 同步结果反馈
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 刷新本地状态
  const refreshFlags = useCallback(() => {
    setFlags(getFlags());
  }, []);

  // 页面加载时从后端拉取最新配置
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        // 先尝试从后端加载
        const response = await http.get('/admin/feature-flags');
        if (!cancelled && response.data?.code === 200) {
          const serverFlags = response.data?.data?.flags as FlagMap;
          const serverMeta = response.data?.data?.meta as Record<string, { updated_at: string }> | undefined;
          setFlags(serverFlags);
          if (serverMeta) {
            const timestamps: Record<string, string> = {};
            for (const [key, val] of Object.entries(serverMeta)) {
              timestamps[key] = val.updated_at;
            }
            setServerTimestamps(timestamps);
          }
        }
      } catch {
        // 后端不可用时降级为本地缓存
        if (!cancelled) {
          refreshFlags();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshFlags]);

  // 处理单个开关切换
  const handleToggle = useCallback((key: string, value: boolean) => {
    setFlag(key, value);
    setFlags((prev) => ({ ...prev, [key]: value }));
    // 清除之前的同步消息
    setSyncMessage(null);
  }, []);

  // 处理预设应用
  const handlePreset = useCallback((presetName: PresetName) => {
    applyPreset(presetName);
    refreshFlags();
    setSyncMessage(null);
  }, [refreshFlags]);

  // 处理同步到后端
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await syncToBackend();
      setSyncMessage({ type: 'success', text: '已成功同步到服务器' });

      // 同步成功后刷新服务器时间戳
      try {
        const response = await http.get('/admin/feature-flags');
        if (response.data?.code === 200) {
          const serverMeta = response.data?.data?.meta as Record<string, { updated_at: string }> | undefined;
          if (serverMeta) {
            const timestamps: Record<string, string> = {};
            for (const [key, val] of Object.entries(serverMeta)) {
              timestamps[key] = val.updated_at;
            }
            setServerTimestamps(timestamps);
          }
        }
      } catch {
        // 忽略时间戳刷新失败
      }
    } catch {
      setSyncMessage({ type: 'error', text: '同步失败，请检查网络连接后重试' });
    } finally {
      setIsSyncing(false);
      // 3 秒后自动清除消息
      setTimeout(() => setSyncMessage(null), 3000);
    }
  }, []);

  // 处理从后端重新加载
  const handleReload = useCallback(async () => {
    setIsLoading(true);
    setSyncMessage(null);
    try {
      const serverFlags = await loadFromBackend();
      setFlags(serverFlags);
      setSyncMessage({ type: 'success', text: '已从服务器加载最新配置' });

      // 刷新服务器时间戳
      try {
        const response = await http.get('/admin/feature-flags');
        if (response.data?.code === 200) {
          const serverMeta = response.data?.data?.meta as Record<string, { updated_at: string }> | undefined;
          if (serverMeta) {
            const timestamps: Record<string, string> = {};
            for (const [key, val] of Object.entries(serverMeta)) {
              timestamps[key] = val.updated_at;
            }
            setServerTimestamps(timestamps);
          }
        }
      } catch {
        // 忽略
      }
    } catch {
      setSyncMessage({ type: 'error', text: '加载失败，将继续使用本地缓存' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  }, []);

  // 开关 key 列表
  const flagKeys = Object.keys(FLAG_META);
  const presets = getPresets();
  const lastUpdated = getLastUpdatedAt();

  // 统计
  const enabledCount = flagKeys.filter((k) => flags[k]).length;
  const totalCount = flagKeys.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* ====== 页头 ====== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <ToggleLeft className="w-5 h-5 text-amber-400" />
            功能开关管理
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            集中管理平台各功能模块的启用/禁用状态，修改即时生效
          </p>
        </div>

        {/* 统计概览 */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <span className="text-emerald-400 font-semibold">{enabledCount}</span>
            <span className="mx-1">/</span>
            <span>{totalCount}</span>
            <span className="ml-1.5">已启用</span>
          </span>
          {lastUpdated && (
            <span className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {new Date(lastUpdated).toLocaleString('zh-CN', {
                month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      {/* ====== 同步状态消息 ====== */}
      {syncMessage && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
            syncMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {syncMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {syncMessage.text}
        </motion.div>
      )}

      {/* ====== 预设模板区 ====== */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          预设模板
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const details = PRESET_DESCRIPTIONS[preset.name];
            return (
              <PresetButton
                key={preset.name}
                name={preset.name}
                icon={details.icon}
                description={details.description}
                onApply={handlePreset}
                isLoading={isLoading}
              />
            );
          })}
        </div>
      </div>

      {/* ====== 功能开关列表 ====== */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <ToggleRight className="w-4 h-4 text-amber-400" />
          开关列表
        </h3>

        {isLoading ? (
          /* 加载骨架屏 */
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-xl bg-slate-800/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {flagKeys.map((key, index) => {
              const meta = FLAG_META[key];
              const enabled = flags[key] ?? true;
              const serverTs = serverTimestamps[key];

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.2 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors duration-200 ${
                    enabled
                      ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50'
                      : 'bg-slate-800/15 border-slate-700/30 opacity-80'
                  }`}
                >
                  {/* 左侧：状态指示器 */}
                  <div className="shrink-0">
                    {enabled ? (
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-700/40 flex items-center justify-center">
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* 中间：开关信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white truncate">
                        {meta?.label || key}
                      </span>
                      <StatusBadge enabled={enabled} />
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {meta?.description || '暂无描述'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <code className="text-[10px] text-slate-600 font-mono bg-slate-800/40 px-1.5 py-0.5 rounded">
                        {key}
                      </code>
                      {serverTs && (
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(serverTs).toLocaleString('zh-CN', {
                            month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 右侧：Toggle 开关 */}
                  <div className="shrink-0">
                    <ToggleSwitch
                      checked={enabled}
                      onChange={(value) => handleToggle(key, value)}
                      disabled={isLoading}
                      label={`切换 ${meta?.label || key}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== 底部操作栏 ====== */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-800/50">
        {/* 同步到服务器 */}
        <button
          onClick={handleSync}
          disabled={isSyncing || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600
            disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold
            transition-colors duration-200 shadow-sm shadow-amber-500/20"
        >
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {isSyncing ? '同步中...' : '同步到服务器'}
        </button>

        {/* 从服务器加载 */}
        <button
          onClick={handleReload}
          disabled={isSyncing || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700
            disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 text-sm font-medium
            border border-slate-700/50 transition-colors duration-200"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          从服务器加载
        </button>

        {/* 提示信息 */}
        <p className="text-xs text-slate-600 ml-auto">
          Toggle 修改即时生效 · 同步后可持久化到数据库
        </p>
      </div>
    </motion.div>
  );
}
