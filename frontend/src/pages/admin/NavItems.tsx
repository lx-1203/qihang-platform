import { useEffect, useState, useCallback } from 'react';
import http from '@/api/http';

interface NavItem {
  id?: number;
  name: string;
  path: string;
  icon: string;
  sortOrder: number;
  isEnabled: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  target: string;
  sectionType: string;
  visibilityScope: string;
}

const emptyForm: NavItem = {
  name: '',
  path: '',
  icon: '',
  sortOrder: 0,
  isEnabled: true,
  isExternal: false,
  openInNewTab: false,
  target: '_self',
  sectionType: '',
  visibilityScope: 'all',
};

// 扩展图标选择库：从 6 个预设扩展到 18+ 个，覆盖各板块相关图标
const ICON_OPTIONS = [
  // 通用
  { value: '', label: '无图标' },
  { value: 'House', label: '首页 (House)' },
  { value: 'Menu', label: '菜单 (Menu)' },
  { value: 'Settings', label: '设置 (Settings)' },
  // 求职招聘板块
  { value: 'Briefcase', label: '求职招聘 (Briefcase)' },
  { value: 'Building2', label: '公司 (Building2)' },
  { value: 'FileText', label: '简历/文档 (FileText)' },
  { value: 'Search', label: '搜索 (Search)' },
  { value: 'MapPin', label: '地点 (MapPin)' },
  // 能力提升板块
  { value: 'Sparkles', label: '能力提升 (Sparkles)' },
  { value: 'BookOpen', label: '书本 (BookOpen)' },
  { value: 'Play', label: '播放/视频 (Play)' },
  { value: 'Trophy', label: '奖杯 (Trophy)' },
  { value: 'Award', label: '荣誉 (Award)' },
  // 升学深造板块
  { value: 'GraduationCap', label: '升学深造 (GraduationCap)' },
  { value: 'Globe', label: '留学/地球 (Globe)' },
  { value: 'Clock', label: '时间线 (Clock)' },
  { value: 'CalendarRange', label: '日历 (CalendarRange)' },
  // 创新创业板块
  { value: 'Rocket', label: '创业 (Rocket)' },
  { value: 'Lightbulb', label: '创意 (Lightbulb)' },
  { value: 'Flame', label: '热门 (Flame)' },
  // 其他常用
  { value: 'Compass', label: '指南针 (Compass)' },
  { value: 'Users', label: '用户 (Users)' },
  { value: 'Star', label: '星星 (Star)' },
  { value: 'Zap', label: '闪电 (Zap)' },
  { value: 'Heart', label: '收藏 (Heart)' },
  { value: 'Bell', label: '通知 (Bell)' },
  { value: 'MessageCircle', label: '消息 (MessageCircle)' },
  { value: 'ExternalLink', label: '外链 (ExternalLink)' },
  { value: 'Shield', label: '安全 (Shield)' },
];

const PRIMARY_NAV_PATH_OPTIONS = [
  { path: '/', label: '首页' },
  { path: '/skill-enhancement', label: '能力提升' },
  { path: '/further-education', label: '升学深造' },
  { path: '/job-recruitment', label: '求职招聘' },
  { path: '/entrepreneurship', label: '创业' },
];

const RETIRED_NAV_PATH_PREFIXES = [
  '/admin',
  '/company',
  '/mentor',
  '/verify-identity',
  '/career-plan',
  '/jobs',
  '/mentors',
  '/courses',
  '/guidance',
  '/postgrad',
  '/study-abroad',
  '/student/appointments',
  // /chat and /partners retired
];

const SECTION_TYPE_OPTIONS = [
  { value: '', label: '未分类' },
  { value: 'primary_board', label: '公开板块' },
  { value: 'admin_tool', label: '后台工具' },
  { value: 'external_link', label: '外部链接' },
  { value: 'custom', label: '自定义' },
];

const VISIBILITY_SCOPE_OPTIONS = [
  { value: 'all', label: '所有人可见' },
  { value: 'authenticated', label: '登录可见' },
  { value: 'student_only', label: '仅学生可见' },
  { value: 'admin_only', label: '仅管理员可见' },
];

function normalizeInternalPath(pathValue: string) {
  const trimmed = pathValue.trim();
  if (!trimmed || !trimmed.startsWith('/')) {
    return trimmed;
  }

  const [withoutHash] = trimmed.split('#');
  const [withoutQuery] = withoutHash.split('?');
  return withoutQuery.replace(/\/+$/, '') || '/';
}

function isRetiredInternalPath(pathValue: string) {
  const normalizedPath = normalizeInternalPath(pathValue).toLowerCase();
  return RETIRED_NAV_PATH_PREFIXES.some((prefix) => (
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  ));
}

function isPrimaryBoardPath(pathValue: string) {
  const normalizedPath = normalizeInternalPath(pathValue).toLowerCase();
  return PRIMARY_NAV_PATH_OPTIONS.some(({ path }) => path.toLowerCase() === normalizedPath);
}

export default function AdminNavItems() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [form, setForm] = useState<NavItem>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const response = await http.get('/nav/admin');
      const raw = response.data.data;
      // 后端返回 snake_case，前端用 camelCase
      const mapped = raw.map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        path: r.path,
        icon: r.icon,
        sortOrder: r.sort_order,
        isEnabled: !!r.is_enabled,
        isExternal: !!r.is_external,
        openInNewTab: !!r.open_in_new_tab,
        target: r.target || '_self',
        sectionType: String(r.section_type || ''),
        visibilityScope: String(r.visibility_scope || 'all'),
      }));
      setItems(mapped);
    } catch (err) {
      console.error('加载导航项失败:', err);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function validateForm() {
    if (!form.name.trim()) {
      return '请输入导航名称';
    }

    const trimmedPath = form.path.trim();

    if (!trimmedPath) {
      return '请输入导航链接';
    }

    if (form.isExternal && !/^https?:\/\//i.test(trimmedPath)) {
      return '外部链接必须使用 http 或 https URL';
    }

    if (!form.isExternal && !trimmedPath.startsWith('/')) {
      return '站内链接必须以 / 开头';
    }

    if (!form.isExternal) {
      if (isRetiredInternalPath(trimmedPath)) {
        return '该路径仅保留兼容，请改用新的板块路径';
      }
    }

    return '';
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        path: form.path.trim(),
        icon: form.icon,
        sort_order: form.sortOrder,
        is_enabled: form.isEnabled ? 1 : 0,
        is_external: form.isExternal ? 1 : 0,
        open_in_new_tab: form.openInNewTab ? 1 : 0,
        target: form.openInNewTab ? '_blank' : (form.target || '_self'),
        section_type: form.sectionType,
        visibility_scope: form.visibilityScope || 'all',
      };
      if (editingId) {
        await http.put(`/nav/admin/${editingId}`, payload);
      } else {
        await http.post('/nav/admin', payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadItems();
    } catch (err) {
      console.error('保存导航项失败:', err);
      setFormError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确认删除该导航项？')) return;
    setDeletingId(id);
    try {
      await http.delete(`/nav/admin/${id}`);
      await loadItems();
    } catch (err) {
      console.error('删除导航项失败:', err);
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(item: NavItem) {
    setEditingId(item.id || null);
    setForm(item);
    setFormError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }

  // 批量排序：上移/下移
  async function handleMoveUp(item: NavItem) {
    const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sortedItems.findIndex((i) => i.id === item.id);
    if (idx <= 0) return;
    // 交换 sort_order
    const prevItem = sortedItems[idx - 1];
    const reorderPayload = [
      { id: item.id, sort_order: prevItem.sortOrder },
      { id: prevItem.id, sort_order: item.sortOrder },
    ];
    try {
      await http.put('/nav/admin/reorder', { items: reorderPayload });
      await loadItems();
    } catch (err) {
      console.error('排序失败:', err);
    }
  }

  async function handleMoveDown(item: NavItem) {
    const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sortedItems.findIndex((i) => i.id === item.id);
    if (idx < 0 || idx >= sortedItems.length - 1) return;
    const nextItem = sortedItems[idx + 1];
    const reorderPayload = [
      { id: item.id, sort_order: nextItem.sortOrder },
      { id: nextItem.id, sort_order: item.sortOrder },
    ];
    try {
      await http.put('/nav/admin/reorder', { items: reorderPayload });
      await loadItems();
    } catch (err) {
      console.error('排序失败:', err);
    }
  }

  // 快速切换启用/禁用
  async function handleToggleEnabled(item: NavItem) {
    try {
      await http.put(`/nav/admin/${item.id}`, {
        name: item.name,
        path: item.path,
        icon: item.icon,
        sort_order: item.sortOrder,
        is_enabled: item.isEnabled ? 0 : 1,
        is_external: item.isExternal ? 1 : 0,
        open_in_new_tab: item.openInNewTab ? 1 : 0,
        target: item.openInNewTab ? '_blank' : (item.target || '_self'),
        section_type: item.sectionType,
        visibility_scope: item.visibilityScope || 'all',
      });
      await loadItems();
    } catch (err) {
      console.error('切换启用状态失败:', err);
    }
  }

  // 图标标签查找
  const getIconLabel = (iconValue: string) => {
    const found = ICON_OPTIONS.find((o) => o.value === iconValue);
    return found ? found.label : iconValue;
  };

  const getSectionTypeLabel = (typeValue: string) => {
    const found = SECTION_TYPE_OPTIONS.find((o) => o.value === typeValue);
    return found ? found.label : typeValue || '未分类';
  };

  const getVisibilityScopeLabel = (scopeValue: string) => {
    const found = VISIBILITY_SCOPE_OPTIONS.find((o) => o.value === scopeValue);
    return found ? found.label : scopeValue || '所有人可见';
  };

  const normalizedEditingPath = form.isExternal ? '' : normalizeInternalPath(form.path);
  const editingRetiredPath = !form.isExternal && !!normalizedEditingPath && isRetiredInternalPath(normalizedEditingPath);
  const editingPrimaryBoardPath = !form.isExternal && !!normalizedEditingPath && isPrimaryBoardPath(normalizedEditingPath);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">顶部导航配置</h1>
        <p className="mt-2 text-sm text-neutral-500">
          这里的变更会立即同步到全站顶部导航，无需前端再次发版。支持新增、编辑、删除、排序和启用/禁用操作。
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          当前公开板块以首页、能力提升、升学深造、求职招聘、创业为准；旧公开路径仅保留兼容，不再作为新增导航入口。
        </p>
      </div>

      {/* 新增/编辑表单 */}
      <form className="grid gap-4 rounded-3xl border border-neutral-200 bg-white p-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          aria-label="名称"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          className="rounded-2xl border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          placeholder="导航名称（如：求职招聘）"
          required
        />
        <input
          aria-label="链接"
          value={form.path}
          onChange={(event) => setForm((prev) => ({ ...prev, path: event.target.value }))}
          className="rounded-2xl border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          placeholder="链接路径（如：/job-recruitment 或 https://...）"
          required
        />
        <div className="md:col-span-2 flex flex-wrap gap-2 text-xs text-neutral-500">
          {PRIMARY_NAV_PATH_OPTIONS.map((option) => (
            <span
              key={option.path}
              className={`rounded-full border px-3 py-1 ${
                normalizedEditingPath === option.path
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-500'
              }`}
            >
              {option.label} {option.path}
            </span>
          ))}
        </div>
        {!form.isExternal && normalizedEditingPath ? (
          <div
            className={`md:col-span-2 rounded-2xl border px-4 py-3 text-sm ${
              editingRetiredPath
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : editingPrimaryBoardPath
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-600'
            }`}
          >
            {editingRetiredPath
              ? '该站内路径属于旧公开 IA，仅建议用于兼容存量链接；新增导航请切换到当前板块路径。'
              : editingPrimaryBoardPath
                ? '该路径属于当前公开板块结构，可作为导航主入口。'
                : '请确认该路径是否为当前公开信息架构的一部分。'}
          </div>
        ) : null}
        <select
          aria-label="图标"
          value={form.icon}
          onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
          className="rounded-2xl border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          {ICON_OPTIONS.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          aria-label="排序"
          value={form.sortOrder}
          onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
          className="rounded-2xl border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          placeholder="排序值（越小越靠前）"
          type="number"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            checked={form.isEnabled}
            onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
            type="checkbox"
          />
          启用
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            checked={form.isExternal}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, isExternal: event.target.checked }));
              setFormError('');
            }}
            type="checkbox"
          />
          外部链接
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            checked={form.openInNewTab}
            onChange={(event) => {
              setForm((prev) => ({
                ...prev,
                openInNewTab: event.target.checked,
                target: event.target.checked ? '_blank' : '_self',
              }));
            }}
            type="checkbox"
          />
          在新标签页打开
        </label>
        <select
          aria-label="板块类型"
          value={form.sectionType}
          onChange={(event) => setForm((prev) => ({ ...prev, sectionType: event.target.value }))}
          className="rounded-2xl border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          {SECTION_TYPE_OPTIONS.map((option) => (
            <option key={option.value || 'empty-section-type'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="可见范围"
          value={form.visibilityScope}
          onChange={(event) => setForm((prev) => ({ ...prev, visibilityScope: event.target.value }))}
          className="rounded-2xl border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          {VISIBILITY_SCOPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {formError ? (
          <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {formError}
          </div>
        ) : null}
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : editingId ? '保存修改' : '新增导航'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm text-neutral-700"
            >
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      {/* 导航项列表 */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            当前导航项（共 {items.length} 项）
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            暂无导航项，请通过上方表单添加
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const retiredPath = !item.isExternal && isRetiredInternalPath(item.path);
              const primaryBoardPath = !item.isExternal && isPrimaryBoardPath(item.path);

              return (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                  item.isEnabled
                    ? 'border-neutral-200 bg-white'
                    : 'border-neutral-100 bg-neutral-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* 排序控制 */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => handleMoveUp(item)}
                      className="p-0.5 text-neutral-400 hover:text-primary-600 transition-colors"
                      aria-label="上移"
                      title="上移"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(item)}
                      className="p-0.5 text-neutral-400 hover:text-primary-600 transition-colors"
                      aria-label="下移"
                      title="下移"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 10L10 5H2L6 10Z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">{item.name}</span>
                      {!item.isEnabled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-500">
                          已禁用
                        </span>
                      )}
                      {item.isExternal && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                          外链
                        </span>
                      )}
                      {item.openInNewTab && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                          新标签页
                        </span>
                      )}
                      {retiredPath && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          兼容旧路径
                        </span>
                      )}
                      {primaryBoardPath && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          当前板块
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 truncate">
                      {item.path} &middot; 图标 {getIconLabel(item.icon || '')} &middot; 排序 {item.sortOrder}
                      {item.isExternal && ' &middot; 外部链接'}
                      {item.openInNewTab && ' &middot; 新标签页打开'}
                      {item.sectionType && ` · ${getSectionTypeLabel(item.sectionType)}`}
                      {item.visibilityScope && item.visibilityScope !== 'all' && ` · ${getVisibilityScopeLabel(item.visibilityScope)}`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleEnabled(item)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      item.isEnabled
                        ? 'border-green-200 text-green-600 hover:bg-green-50'
                        : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                    }`}
                  >
                    {item.isEnabled ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(item.id as number)}
                    disabled={deletingId === item.id}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === item.id ? '删除中...' : '删除'}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
