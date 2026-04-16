import { useState, useEffect, useCallback } from 'react';
import {
  Globe, GraduationCap, Award, Calendar, Users,
  Search, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, X, Loader2,
} from 'lucide-react';
import http from '../../api/http';
import Tag from '@/components/ui/Tag';

// ====== 类型定义 ======

type TabKey = 'universities' | 'programs' | 'offers' | 'timeline' | 'consultants';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { key: 'universities', label: '院校', icon: GraduationCap },
  { key: 'programs', label: '项目', icon: Globe },
  { key: 'offers', label: '录取案例', icon: Award },
  { key: 'timeline', label: '时间线', icon: Calendar },
  { key: 'consultants', label: '顾问', icon: Users },
];

// ====== 通用 Toast ======
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  const el = document.createElement('div');
  el.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl text-sm font-medium text-white shadow-lg transition-all ${
    type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
  }`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
}

// ====== 组件 ======

export default function AdminStudyAbroad() {
  const [activeTab, setActiveTab] = useState<TabKey>('universities');
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [universityOptions, setUniversityOptions] = useState<{ id: number; name: string }[]>([]);

  const pageSize = 15;

  // ---------- API 端点映射 ----------
  const apiPath = (tab: TabKey) => {
    switch (tab) {
      case 'universities': return '/admin/universities';
      case 'programs': return '/admin/programs';
      case 'offers': return '/admin/study-abroad-offers';
      case 'timeline': return '/admin/study-abroad-timeline';
      case 'consultants': return '/admin/study-abroad-consultants';
    }
  };

  // ---------- 加载数据 ----------
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, pageSize };
      if (keyword) params.keyword = keyword;
      const res = await http.get(apiPath(activeTab), { params });
      setList(res.data.data?.list || []);
      setTotal(res.data.data?.total || 0);
    } catch {
      showToast('加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, keyword]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // 切换 tab 时重置
  useEffect(() => {
    setPage(1);
    setKeyword('');
    setList([]);
    setTotal(0);
  }, [activeTab]);

  // 加载院校下拉（用于项目 Tab）
  useEffect(() => {
    if (activeTab === 'programs' && universityOptions.length === 0) {
      http.get('/admin/universities', { params: { pageSize: 200 } })
        .then(res => {
          const opts = (res.data.data?.list || []).map((u: any) => ({ id: u.id, name: u.name_zh }));
          setUniversityOptions(opts);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // ---------- CRUD 操作 ----------
  const openCreate = () => {
    setEditingItem(null);
    setFormData(getDefaultFormData(activeTab));
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData(itemToFormData(activeTab, item));
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = preparePayload(activeTab, formData);
      if (editingItem) {
        await http.put(`${apiPath(activeTab)}/${editingItem.id}`, data);
        showToast('更新成功');
      } else {
        await http.post(apiPath(activeTab), data);
        showToast('创建成功');
      }
      setShowModal(false);
      fetchList();
    } catch (err: any) {
      showToast(err.response?.data?.message || '操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此条数据吗？')) return;
    try {
      await http.delete(`${apiPath(activeTab)}/${id}`);
      showToast('删除成功');
      fetchList();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleToggleStatus = async (item: any) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      if (activeTab === 'universities') {
        await http.patch(`${apiPath(activeTab)}/${item.id}/status`, { status: newStatus });
      } else {
        await http.put(`${apiPath(activeTab)}/${item.id}`, { status: newStatus });
      }
      showToast(`已${newStatus === 'active' ? '上架' : '下架'}`);
      fetchList();
    } catch {
      showToast('状态切换失败', 'error');
    }
  };

  // ---------- 分页 ----------
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-7 h-7 text-primary-500" /> 留学数据管理
        </h1>
        <p className="text-sm text-gray-500 mt-1">管理院校、项目、录取案例、时间线和顾问数据</p>
      </div>

      {/* Tab 栏 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-primary-500 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索关键字..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> 新增
        </button>
        <span className="text-xs text-gray-400 ml-auto">共 {total} 条</span>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {getColumns(activeTab).map((col, i) => (
                  <th key={i} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={99} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={99} className="text-center py-16 text-gray-400">暂无数据</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    {getColumns(activeTab).map((col, i) => (
                      <td key={i} className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                        {col.render ? col.render(item) : (item[col.key] ?? '-')}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {'status' in item && (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.status === 'active'
                                ? 'text-emerald-500 hover:bg-emerald-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={item.status === 'active' ? '下架' : '上架'}
                          >
                            {item.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">第 {page}/{totalPages} 页</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingItem ? '编辑' : '新增'}{TABS.find(t => t.key === activeTab)?.label}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {getFormFields(activeTab, universityOptions).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    >
                      <option value="">请选择</option>
                      {(field.options || []).map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder || ''}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingItem ? '保存修改' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== 表格列定义 ======

interface ColDef {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
}

function getColumns(tab: TabKey): ColDef[] {
  const statusBadge = (item: any) => (
    <Tag variant={item.status === 'active' ? 'green' : 'gray'} size="xs">
      {item.status === 'active' ? '上架' : '下架'}
    </Tag>
  );

  switch (tab) {
    case 'universities':
      return [
        { key: 'id', label: 'ID' },
        { key: 'name_zh', label: '中文名' },
        { key: 'name_en', label: '英文名' },
        { key: 'region', label: '地区' },
        { key: 'qs_ranking', label: 'QS排名', render: (i) => i.qs_ranking || '-' },
        { key: 'program_count', label: '项目数', render: (i) => i.program_count ?? 0 },
        { key: 'status', label: '状态', render: statusBadge },
      ];
    case 'programs':
      return [
        { key: 'id', label: 'ID' },
        { key: 'name_zh', label: '专业名' },
        { key: 'university_name', label: '所属院校' },
        { key: 'degree', label: '学位' },
        { key: 'category', label: '学科' },
        { key: 'duration', label: '学制' },
        { key: 'status', label: '状态', render: statusBadge },
      ];
    case 'offers':
      return [
        { key: 'id', label: 'ID' },
        { key: 'student_name', label: '学生' },
        { key: 'school', label: '录取院校' },
        { key: 'program', label: '项目' },
        { key: 'country', label: '国家' },
        { key: 'date', label: '日期', render: (i) => i.date?.slice(0, 10) },
        { key: 'likes', label: '点赞' },
        { key: 'status', label: '状态', render: statusBadge },
      ];
    case 'timeline':
      return [
        { key: 'id', label: 'ID' },
        { key: 'date', label: '日期', render: (i) => i.date?.slice(0, 10) },
        { key: 'title', label: '标题' },
        { key: 'type', label: '类型', render: (i) => {
          const map: Record<string, string> = { deadline: '截止日期', live: '直播', event: '事件', tips: '提示' };
          return map[i.type] || i.type;
        }},
        { key: 'category', label: '分类' },
        { key: 'status', label: '状态', render: statusBadge },
      ];
    case 'consultants':
      return [
        { key: 'id', label: 'ID' },
        { key: 'name', label: '姓名' },
        { key: 'title', label: '头衔' },
        { key: 'country', label: '负责国家' },
        { key: 'experience', label: '经验' },
        { key: 'success_cases', label: '成功案例' },
        { key: 'status', label: '状态', render: statusBadge },
      ];
  }
}

// ====== 表单字段定义 ======

interface FormFieldDef {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

function getFormFields(tab: TabKey, universityOptions: { id: number; name: string }[]): FormFieldDef[] {
  switch (tab) {
    case 'universities':
      return [
        { key: 'name_zh', label: '中文名称', required: true, placeholder: '如：帝国理工学院' },
        { key: 'name_en', label: '英文名称', required: true, placeholder: 'Imperial College London' },
        { key: 'region', label: '地区', required: true, type: 'select', options: [
          { value: '英国', label: '英国' }, { value: '美国', label: '美国' },
          { value: '中国香港', label: '中国香港' }, { value: '新加坡', label: '新加坡' },
          { value: '澳大利亚', label: '澳大利亚' }, { value: '加拿大', label: '加拿大' },
          { value: '日本', label: '日本' }, { value: '德国', label: '德国' },
          { value: '法国', label: '法国' }, { value: '韩国', label: '韩国' },
          { value: '新西兰', label: '新西兰' }, { value: '爱尔兰', label: '爱尔兰' },
          { value: '瑞士', label: '瑞士' }, { value: '意大利', label: '意大利' },
        ]},
        { key: 'country', label: '国家代码', required: true, placeholder: 'uk/us/de/fr...' },
        { key: 'city', label: '城市', placeholder: '如：伦敦' },
        { key: 'qs_ranking', label: 'QS排名', type: 'number', placeholder: '如：6' },
        { key: 'logo', label: 'Logo URL', placeholder: 'https://...' },
        { key: 'description', label: '简介', type: 'textarea' },
        { key: 'gpa_min', label: '最低GPA', type: 'number', placeholder: '3.00' },
        { key: 'ielts_min', label: '雅思最低', type: 'number', placeholder: '6.5' },
        { key: 'toefl_min', label: '托福最低', type: 'number', placeholder: '90' },
        { key: 'tuition_min', label: '学费下限(万)', type: 'number' },
        { key: 'tuition_max', label: '学费上限(万)', type: 'number' },
        { key: 'website', label: '官网', placeholder: 'https://...' },
      ];
    case 'programs':
      return [
        { key: 'university_id', label: '所属院校', required: true, type: 'select',
          options: universityOptions.map(u => ({ value: String(u.id), label: u.name }))
        },
        { key: 'name_zh', label: '专业中文名', required: true, placeholder: '如：计算机科学' },
        { key: 'name_en', label: '专业英文名', required: true, placeholder: 'MSc Computer Science' },
        { key: 'degree', label: '学位类型', type: 'select', options: [
          { value: '硕士', label: '硕士' }, { value: '博士', label: '博士' },
          { value: '本科', label: '本科' }, { value: 'MBA', label: 'MBA' },
        ]},
        { key: 'category', label: '学科大类', required: true, type: 'select', options: [
          { value: '计算机', label: '计算机' }, { value: '商科', label: '商科' },
          { value: '工程', label: '工程' }, { value: '人文社科', label: '人文社科' },
          { value: '理科', label: '理科' }, { value: '艺术', label: '艺术' },
          { value: '医学', label: '医学' }, { value: '法学', label: '法学' },
          { value: '教育', label: '教育' },
        ]},
        { key: 'duration', label: '学制', placeholder: '1年/2年' },
        { key: 'language', label: '授课语言', placeholder: '英语' },
        { key: 'gpa_min', label: 'GPA最低', type: 'number', placeholder: '3.00' },
        { key: 'ielts_min', label: '雅思最低', type: 'number', placeholder: '6.5' },
        { key: 'toefl_min', label: '托福最低', type: 'number', placeholder: '90' },
        { key: 'tuition_total', label: '总学费', placeholder: '如：£35,000' },
        { key: 'deadline', label: '截止日期', placeholder: '如：2026-01-15' },
        { key: 'employment_rate', label: '就业率(%)', type: 'number', placeholder: '95' },
        { key: 'avg_salary', label: '平均年薪', placeholder: '如：¥45万' },
        { key: 'description', label: '专业介绍', type: 'textarea' },
      ];
    case 'offers':
      return [
        { key: 'student_name', label: '学生姓名', required: true },
        { key: 'background', label: '背景描述', required: true, placeholder: '985 · 计算机科学 · GPA 3.7/4.0' },
        { key: 'gpa', label: 'GPA', placeholder: '3.7/4.0' },
        { key: 'ielts', label: '雅思', type: 'number' },
        { key: 'toefl', label: '托福', type: 'number' },
        { key: 'gre', label: 'GRE', type: 'number' },
        { key: 'result', label: '录取结果', required: true, placeholder: 'Imperial College London - MSc Computing' },
        { key: 'country', label: '国家代码', required: true, placeholder: 'uk/us/de...' },
        { key: 'school', label: '录取院校', required: true },
        { key: 'program', label: '录取项目', required: true },
        { key: 'scholarship', label: '奖学金' },
        { key: 'date', label: '录取日期', required: true, type: 'date' },
        { key: 'internship_text', label: '实习经历', type: 'textarea', placeholder: '每行一条实习经历' },
        { key: 'research_text', label: '科研经历', type: 'textarea', placeholder: '每行一条科研经历' },
        { key: 'story', label: '申请故事', type: 'textarea' },
        { key: 'tags_text', label: '标签', placeholder: '逗号分隔，如：CS热门,G5录取' },
        { key: 'likes', label: '点赞数', type: 'number' },
      ];
    case 'timeline':
      return [
        { key: 'date', label: '日期', required: true, type: 'date' },
        { key: 'title', label: '标题', required: true },
        { key: 'description', label: '描述', type: 'textarea' },
        { key: 'type', label: '类型', required: true, type: 'select', options: [
          { value: 'deadline', label: '截止日期' }, { value: 'live', label: '直播' },
          { value: 'event', label: '事件' }, { value: 'tips', label: '提示' },
        ]},
        { key: 'category', label: '分类', placeholder: '如：英国、综合' },
        { key: 'icon', label: '图标Emoji', placeholder: '如：🇬🇧' },
        { key: 'color', label: '颜色', placeholder: '如：red/purple/amber/green' },
        { key: 'link', label: '链接', placeholder: '/study-abroad/...' },
        { key: 'tags_text', label: '标签', placeholder: '逗号分隔' },
      ];
    case 'consultants':
      return [
        { key: 'name', label: '姓名', required: true },
        { key: 'title', label: '头衔', placeholder: '资深英国留学顾问' },
        { key: 'avatar', label: '头像URL', placeholder: 'https://...' },
        { key: 'country', label: '负责国家代码', required: true, placeholder: 'uk/us/de...' },
        { key: 'experience', label: '从业年限', placeholder: '8年' },
        { key: 'education', label: '学历背景', placeholder: '帝国理工学院 MSc' },
        { key: 'success_cases', label: '成功案例数', type: 'number' },
        { key: 'specialty_text', label: '擅长方向', placeholder: '逗号分隔，如：英国G5,商科,计算机' },
        { key: 'description', label: '简介', type: 'textarea' },
      ];
  }
}

// ====== 表单默认值 ======

function getDefaultFormData(tab: TabKey): Record<string, any> {
  switch (tab) {
    case 'universities':
      return { name_zh: '', name_en: '', region: '', country: '', city: '', qs_ranking: '', logo: '', description: '', gpa_min: '', ielts_min: '', toefl_min: '', tuition_min: '', tuition_max: '', website: '' };
    case 'programs':
      return { university_id: '', name_zh: '', name_en: '', degree: '硕士', category: '', duration: '', language: '英语', gpa_min: '', ielts_min: '', toefl_min: '', tuition_total: '', deadline: '', employment_rate: '', avg_salary: '', description: '' };
    case 'offers':
      return { student_name: '', background: '', gpa: '', ielts: '', toefl: '', gre: '', result: '', country: '', school: '', program: '', scholarship: '', date: '', internship_text: '', research_text: '', story: '', tags_text: '', likes: '0' };
    case 'timeline':
      return { date: '', title: '', description: '', type: 'deadline', category: '', icon: '', color: '', link: '', tags_text: '' };
    case 'consultants':
      return { name: '', title: '', avatar: '', country: '', experience: '', education: '', success_cases: '0', specialty_text: '', description: '' };
  }
}

// ====== 数据库行 → 表单数据 ======

function itemToFormData(tab: TabKey, item: any): Record<string, any> {
  const base = { ...item };

  // JSON 数组字段转文本
  const parseJson = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
    return [];
  };

  if (tab === 'offers') {
    base.internship_text = parseJson(item.internship).join('\n');
    base.research_text = parseJson(item.research).join('\n');
    base.tags_text = parseJson(item.tags).join(',');
    base.date = item.date?.slice(0, 10) || '';
  }
  if (tab === 'timeline') {
    base.tags_text = parseJson(item.tags).join(',');
    base.date = item.date?.slice(0, 10) || '';
  }
  if (tab === 'consultants') {
    base.specialty_text = parseJson(item.specialty).join(',');
  }
  if (tab === 'programs') {
    base.university_id = String(item.university_id || '');
  }

  return base;
}

// ====== 表单数据 → API payload ======

function preparePayload(tab: TabKey, form: Record<string, any>): Record<string, any> {
  const data = { ...form };

  // 清理数字字段
  const numFields = ['qs_ranking', 'gpa_min', 'ielts_min', 'toefl_min', 'tuition_min', 'tuition_max',
    'ielts', 'toefl', 'gre', 'likes', 'success_cases', 'employment_rate', 'university_id'];
  for (const f of numFields) {
    if (f in data) {
      data[f] = data[f] === '' || data[f] === null ? null : Number(data[f]);
    }
  }

  // 文本字段转 JSON 数组
  if (tab === 'offers') {
    data.internship = (data.internship_text || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
    data.research = (data.research_text || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
    data.tags = (data.tags_text || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    delete data.internship_text;
    delete data.research_text;
    delete data.tags_text;
  }
  if (tab === 'timeline') {
    data.tags = (data.tags_text || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    delete data.tags_text;
  }
  if (tab === 'consultants') {
    data.specialty = (data.specialty_text || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    delete data.specialty_text;
  }

  // 删除不属于 payload 的字段
  delete data.id;
  delete data.created_at;
  delete data.updated_at;
  delete data.program_count;
  delete data.university_name;
  delete data.university_name_en;

  return data;
}
