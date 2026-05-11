import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Loader2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfigStore } from '@/store/config';
import { handleApiFailure } from '@/utils/connectionStatus';
import defaultHomeConfig from '../../data/home-ui-config.json';

type HomeUiConfig = typeof defaultHomeConfig;

function mergeConfig(config?: Partial<HomeUiConfig> | null): HomeUiConfig {
  return {
    ...defaultHomeConfig,
    ...config,
    homeHero: {
      ...defaultHomeConfig.homeHero,
      ...(config?.homeHero ?? {}),
    },
    homeAdPanel: {
      ...defaultHomeConfig.homeAdPanel,
      ...(config?.homeAdPanel ?? {}),
    },
    textResources: {
      ...defaultHomeConfig.textResources,
      ...(config?.textResources ?? {}),
      sections: {
        ...defaultHomeConfig.textResources.sections,
        ...(config?.textResources?.sections ?? {}),
        valueProposition: {
          ...defaultHomeConfig.textResources.sections.valueProposition,
          ...(config?.textResources?.sections?.valueProposition ?? {}),
        },
      },
    },
  };
}

export default function HomeConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((state) => state.fetchConfigs);
  const [activeTab, setActiveTab] = useState<'brand' | 'summary'>('brand');
  const [config, setConfig] = useState<HomeUiConfig>(defaultHomeConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await http.get('/config/public');
        const rawConfig = res.data?.data?.home_ui_config;

        if (!rawConfig) {
          setConfig(defaultHomeConfig);
          return;
        }

        const parsedConfig =
          typeof rawConfig === 'string'
            ? (JSON.parse(rawConfig) as Partial<HomeUiConfig>)
            : (rawConfig as Partial<HomeUiConfig>);

        setConfig(mergeConfig(parsedConfig));
      } catch {
        await handleApiFailure('首页配置');
        setConfig(defaultHomeConfig);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const canSave = useMemo(
    () =>
      Boolean(
        config.homeHero.badge.trim() &&
          config.homeHero.title.trim() &&
          config.homeAdPanel.title.trim() &&
          config.textResources.sections.valueProposition.title.trim(),
      ),
    [config],
  );

  const updateConfig = (updater: (prev: HomeUiConfig) => HomeUiConfig) => {
    setConfig((prev) => updater(prev));
  };

  const handleSave = async () => {
    if (saving) return;

    if (!canSave) {
      toast.error('校验失败', '请补全品牌广告区和核心摘要文案的必填字段。');
      return;
    }

    setSaving(true);

    const nextConfig: HomeUiConfig = {
      ...config,
      _meta: {
        ...config._meta,
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
    };

    try {
      const res = await http.post('/config/batch', {
        configs: {
          home_ui_config: JSON.stringify(nextConfig),
        },
      });

      if (res.data?.code !== 200) {
        toast.error('保存失败', res.data?.message || '请稍后重试。');
        return;
      }

      setConfig(nextConfig);
      setSaved(true);
      toast.success('保存成功', '首页极简广告配置已更新。');
      await refreshConfig(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('网络错误', '无法连接到服务器，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'brand' as const, label: '品牌广告区' },
    { key: 'summary' as const, label: '核心摘要文案' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
            <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">首页配置管理</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    维护极简广告首页的品牌广告区与核心摘要文案。
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    <Eye className="h-4 w-4" />
                    预览首页
                  </a>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      saved ? 'bg-green-500' : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : saved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        已保存
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        保存配置
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3" role="tablist" aria-label="首页配置分区">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
            {activeTab === 'brand' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm text-gray-700">
                    <span className="block text-xs font-medium text-gray-500">品牌角标</span>
                    <input
                      aria-label="品牌角标"
                      value={config.homeHero.badge}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, badge: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-gray-700">
                    <span className="block text-xs font-medium text-gray-500">广告眉题</span>
                    <input
                      aria-label="广告眉题"
                      value={config.homeAdPanel.eyebrow}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          homeAdPanel: { ...prev.homeAdPanel, eyebrow: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-gray-700 md:col-span-2">
                    <span className="block text-xs font-medium text-gray-500">品牌主标题</span>
                    <input
                      aria-label="品牌主标题"
                      value={config.homeHero.title}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, title: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-gray-700 md:col-span-2">
                    <span className="block text-xs font-medium text-gray-500">品牌描述</span>
                    <textarea
                      aria-label="品牌描述"
                      rows={3}
                      value={config.homeHero.description}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, description: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-gray-700 md:col-span-2">
                    <span className="block text-xs font-medium text-gray-500">广告标题</span>
                    <input
                      aria-label="广告标题"
                      value={config.homeAdPanel.title}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          homeAdPanel: { ...prev.homeAdPanel, title: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-gray-700 md:col-span-2">
                    <span className="block text-xs font-medium text-gray-500">广告描述</span>
                    <textarea
                      aria-label="广告描述"
                      rows={3}
                      value={config.homeAdPanel.description}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          homeAdPanel: { ...prev.homeAdPanel, description: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="grid gap-4">
                  <label className="space-y-1 text-sm text-gray-700">
                    <span className="block text-xs font-medium text-gray-500">摘要标题</span>
                    <input
                      aria-label="摘要标题"
                      value={config.textResources.sections.valueProposition.title}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          textResources: {
                            ...prev.textResources,
                            sections: {
                              ...prev.textResources.sections,
                              valueProposition: {
                                ...prev.textResources.sections.valueProposition,
                                title: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-gray-700">
                    <span className="block text-xs font-medium text-gray-500">摘要副标题</span>
                    <textarea
                      aria-label="摘要副标题"
                      rows={3}
                      value={config.textResources.sections.valueProposition.subtitle}
                      onChange={(event) =>
                        updateConfig((prev) => ({
                          ...prev,
                          textResources: {
                            ...prev.textResources,
                            sections: {
                              ...prev.textResources.sections,
                              valueProposition: {
                                ...prev.textResources.sections.valueProposition,
                                subtitle: event.target.value,
                              },
                            },
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
