import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Briefcase, MapPin, DollarSign, Tag,
  FileText, AlertCircle, Loader2, Save, Zap,
  X,
} from 'lucide-react';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';

// ====== 企业端 - 职位发布/编辑全页面表单 ======

interface JobFormData {
  title: string;
  location: string;
  salary: string;
  type: '校招' | '实习' | '社招';
  category: string;
  tags: string[];
  description: string;
  requirements: string;
  urgent: boolean;
  status: 'active' | 'inactive';
}

const EMPTY_FORM: JobFormData = {
  title: '',
  location: '',
  salary: '',
  type: '校招',
  category: '',
  tags: [],
  description: '',
  requirements: '',
  urgent: false,
  status: 'active',
};

/** DB ENUM 使用 校招/实习/社招，JobManage 列表使用 全职/实习/兼职 — 此处映射 */
function normalizeJobType(raw: string): JobFormData['type'] {
  const map: Record<string, JobFormData['type']> = {
    '全职': '校招',
    '兼职': '社招',
    '实习': '实习',
    '校招': '校招',
    '社招': '社招',
  };
  return map[raw] || '校招';
}

export default function JobForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;

  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // 记录初始值，用于 dirty check
  const [initialForm, setInitialForm] = useState<JobFormData>(EMPTY_FORM);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  // 编辑模式：加载数据
  useEffect(() => {
    if (!isEdit) return;

    // 优先使用路由 state（从 JobManage 导航传入）
    const stateJob = (location.state as { job?: Record<string, unknown> })?.job;
    if (stateJob) {
      const loaded: JobFormData = {
        title: (stateJob.title as string) || '',
        location: (stateJob.location as string) || '',
        salary: (stateJob.salary as string) || '',
        type: normalizeJobType((stateJob.type as string) || '校招'),
        category: (stateJob.category as string) || '',
        tags: Array.isArray(stateJob.tags) ? stateJob.tags as string[] : parseTags(stateJob.tags),
        description: (stateJob.description as string) || '',
        requirements: (stateJob.requirements as string) || '',
        urgent: !!(stateJob.urgent),
        status: (stateJob.status as 'active' | 'inactive') || 'active',
      };
      setForm(loaded);
      setInitialForm(loaded);
      return;
    }

    // Fallback：调用公开 API 获取
    async function fetchJob() {
      try {
        setLoading(true);
        const res = await http.get(`/jobs/${id}`);
        if (res.data?.code === 200 && res.data.data) {
          const j = res.data.data;
          const loaded: JobFormData = {
            title: j.title || '',
            location: j.location || '',
            salary: j.salary || '',
            type: normalizeJobType(j.type || '校招'),
            category: j.category || '',
            tags: Array.isArray(j.tags) ? j.tags : parseTags(j.tags),
            description: j.description || '',
            requirements: j.requirements || '',
            urgent: !!j.urgent,
            status: j.status || 'active',
          };
          setForm(loaded);
          setInitialForm(loaded);
        } else {
          showToast('职位数据加载失败', 'error');
          navigate('/company/jobs', { replace: true });
        }
      } catch {
        showToast('网络请求失败，无法加载职位数据', 'error');
        navigate('/company/jobs', { replace: true });
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [id, isEdit, location.state, navigate]);

  function parseTags(raw: unknown): string[] {
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  }

  function updateField<K extends keyof JobFormData>(key: K, value: JobFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    // 清除该字段的错误
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // 标签输入处理
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags(tagInput);
    }
  }

  function addTags(input: string) {
    const newTags = input
      .split(/[,，、]/)
      .map(t => t.trim())
      .filter(t => t.length > 0 && !form.tags.includes(t));

    if (form.tags.length + newTags.length > 10) {
      showToast('最多添加 10 个标签', 'warning');
      return;
    }

    if (newTags.length > 0) {
      updateField('tags', [...form.tags, ...newTags]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    updateField('tags', form.tags.filter(t => t !== tag));
  }

  // 表单校验
  function validate(): boolean {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {};
    if (!form.title.trim()) newErrors.title = '请输入职位名称';
    if (!form.location.trim()) newErrors.location = '请输入工作地点';
    if (!form.salary.trim()) newErrors.salary = '请输入薪资范围';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // 提交
  async function handleSubmit() {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        location: form.location.trim(),
        salary: form.salary.trim(),
        type: form.type,
        category: form.category.trim(),
        tags: form.tags,
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        urgent: form.urgent ? 1 : 0,
        status: form.status,
      };

      if (isEdit) {
        await http.put(`/company/jobs/${id}`, payload);
        showToast('职位已更新', 'success');
      } else {
        await http.post('/company/jobs', payload);
        showToast('职位发布成功', 'success');
      }
      navigate('/company/jobs');
    } catch {
      showToast(isEdit ? '更新失败，请重试' : '发布失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (isDirty) {
      if (!window.confirm('表单内容尚未保存，确定要离开吗？')) return;
    }
    navigate('/company/jobs');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 顶部导航条 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? '编辑职位' : '发布新职位'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isEdit ? '修改职位信息后保存' : '填写职位信息并发布到平台'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 基本信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-500" />
          基本信息
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 职位名称 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              职位名称 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none ${
                  errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="如：前端开发工程师 (2026届校招)"
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.title}
              </p>
            )}
          </div>

          {/* 工作地点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              工作地点 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.location}
                onChange={e => updateField('location', e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none ${
                  errors.location ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="如：北京/上海"
              />
            </div>
            {errors.location && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.location}
              </p>
            )}
          </div>

          {/* 薪资范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              薪资范围 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.salary}
                onChange={e => updateField('salary', e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none ${
                  errors.salary ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="如：25k-40k 或 200/天"
              />
            </div>
            {errors.salary && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.salary}
              </p>
            )}
          </div>

          {/* 职位类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              职位类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={e => updateField('type', e.target.value as JobFormData['type'])}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="校招">校招</option>
              <option value="实习">实习</option>
              <option value="社招">社招</option>
            </select>
          </div>

          {/* 职位分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              职位分类
            </label>
            <input
              type="text"
              value={form.category}
              onChange={e => updateField('category', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="如：技术、产品、运营、市场"
            />
          </div>

          {/* 急招标记 */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.urgent}
                onChange={e => updateField('urgent', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500" />
            </label>
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <Zap className="w-4 h-4 text-orange-500" />
              急招标记
            </span>
            <span className="text-xs text-gray-400">开启后职位将显示急招标签</span>
          </div>
        </div>
      </motion.div>

      {/* 职位描述卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          职位描述
        </h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">岗位职责</label>
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              placeholder="请描述岗位的主要工作内容和职责范围..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">任职要求</label>
            <textarea
              value={form.requirements}
              onChange={e => updateField('requirements', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              placeholder="请描述学历要求、技能要求、经验要求等..."
            />
          </div>
        </div>
      </motion.div>

      {/* 标签与发布卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary-500" />
          标签与发布
        </h2>
        <div className="space-y-5">
          {/* 技能标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              技能标签
              <span className="text-gray-400 font-normal ml-2">({form.tags.length}/10)</span>
            </label>
            {/* 已添加的标签 */}
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="p-0.5 rounded-full hover:bg-primary-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* 标签输入框 */}
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => { if (tagInput.trim()) addTags(tagInput); }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="输入标签后按回车或逗号分隔，如：React, TypeScript, Node.js"
              disabled={form.tags.length >= 10}
            />
          </div>

          {/* 发布状态 */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">发布状态</label>
            <select
              value={form.status}
              onChange={e => updateField('status', e.target.value as 'active' | 'inactive')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="active">立即发布</option>
              <option value="inactive">暂不发布（存为草稿）</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* 底部操作栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-end gap-3 pb-8"
      >
        <button
          onClick={handleBack}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {submitting ? '保存中...' : isEdit ? '保存修改' : '发布职位'}
        </button>
      </motion.div>
    </div>
  );
}
