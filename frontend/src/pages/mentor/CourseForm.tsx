import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, FileText, Tag, Image,
  Video, Clock, BarChart3, AlertCircle, Loader2,
  Save, X, DollarSign,
} from 'lucide-react';
import http from '@/api/http';
import { COURSE_CATEGORIES } from '@/constants';
import { showToast } from '@/components/ui/ToastContainer';
import FileUpload from '@/components/ui/FileUpload';

// ====== 导师端 - 课程创建/编辑全页面表单 ======

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  cover: string;
  video_url: string;
  duration: string;
  price: string;
  tags: string[];
}

const EMPTY_FORM: CourseFormData = {
  title: '',
  description: '',
  category: '',
  difficulty: 'beginner',
  cover: '',
  video_url: '',
  duration: '',
  price: '0',
  tags: [],
};

const CATEGORIES = COURSE_CATEGORIES;

const LOCAL_DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: '入门', desc: '适合零基础学员' },
  { value: 'intermediate', label: '进阶', desc: '需要一定基础知识' },
  { value: 'advanced', label: '高级', desc: '适合有经验的学员' },
] as const;

export default function CourseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;

  const [form, setForm] = useState<CourseFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CourseFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // 记录初始值，用于 dirty check
  const [initialForm, setInitialForm] = useState<CourseFormData>(EMPTY_FORM);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  // 编辑模式：加载数据
  useEffect(() => {
    if (!isEdit) return;

    // 优先使用路由 state（从 CourseManage 导航传入）
    const stateCourse = (location.state as { course?: Record<string, unknown> })?.course;
    if (stateCourse) {
      const loaded: CourseFormData = {
        title: (stateCourse.title as string) || '',
        description: (stateCourse.description as string) || '',
        category: (stateCourse.category as string) || '',
        difficulty: (stateCourse.difficulty as CourseFormData['difficulty']) || 'beginner',
        cover: (stateCourse.cover as string) || '',
        video_url: (stateCourse.video_url as string) || '',
        duration: (stateCourse.duration as string) || '',
        price: String(stateCourse.price ?? 0),
        tags: Array.isArray(stateCourse.tags) ? stateCourse.tags as string[] : parseTags(stateCourse.tags),
      };
      setForm(loaded);
      setInitialForm(loaded);
      return;
    }

    // Fallback：调用公开 API 获取
    async function fetchCourse() {
      try {
        setLoading(true);
        const res = await http.get(`/courses/${id}`);
        if (res.data?.code === 200 && res.data.data) {
          const c = res.data.data;
          const loaded: CourseFormData = {
            title: c.title || '',
            description: c.description || '',
            category: c.category || '',
            difficulty: c.difficulty || 'beginner',
            cover: c.cover || '',
            video_url: c.video_url || '',
            duration: c.duration || '',
            price: String(c.price ?? 0),
            tags: Array.isArray(c.tags) ? c.tags : parseTags(c.tags),
          };
          setForm(loaded);
          setInitialForm(loaded);
        } else {
          showToast('课程数据加载失败', 'error');
          navigate('/mentor/courses', { replace: true });
        }
      } catch {
        showToast('网络请求失败，无法加载课程数据', 'error');
        navigate('/mentor/courses', { replace: true });
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [id, isEdit, location.state, navigate]);

  function parseTags(raw: unknown): string[] {
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  }

  function updateField<K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
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
    const newErrors: Partial<Record<keyof CourseFormData, string>> = {};
    if (!form.title.trim()) newErrors.title = '请输入课程标题';
    if (!form.description.trim()) newErrors.description = '请输入课程描述';
    if (!form.category) newErrors.category = '请选择课程分类';
    if (!form.price.trim()) newErrors.price = '请输入课程价格';
    else if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) newErrors.price = '课程价格必须为大于等于 0 的数字';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // 提交
  async function handleSubmit() {
    if (submitting) return; // 防止重复提交
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        difficulty: form.difficulty,
        cover: form.cover.trim(),
        video_url: form.video_url.trim(),
        duration: form.duration.trim(),
        price: Number(form.price),
        tags: form.tags,
      };

      if (isEdit) {
        await http.put(`/mentor/courses/${id}`, payload);
        showToast('课程已更新', 'success');
      } else {
        await http.post('/mentor/courses', payload);
        showToast('课程创建成功', 'success');
      }
      navigate('/mentor/courses');
    } catch {
      showToast(isEdit ? '更新失败，请重试' : '创建失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (submitting) return; // 保存中禁止离开
    if (isDirty) {
      if (!window.confirm('表单内容尚未保存，确定要离开吗？')) return;
    }
    navigate('/mentor/courses');
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
            disabled={submitting}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? '编辑课程' : '创建新课程'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isEdit ? '修改课程信息后保存' : '填写课程信息并发布'}
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
          <BookOpen className="w-5 h-5 text-primary-500" />
          基本信息
        </h2>
        <div className="space-y-5">
          {/* 课程标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              课程标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none ${
                errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="如：校招简历怎么写才能过海选？"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.title}
              </p>
            )}
          </div>

          {/* 课程描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <FileText className="w-4 h-4 inline mr-1" />
              课程描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="介绍课程内容、适合人群、学习目标..."
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 课程分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                课程分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={e => updateField('category', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-primary-500 outline-none ${
                  errors.category ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <option value="">选择分类</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.category}
                </p>
              )}
            </div>

            {/* 难度等级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <BarChart3 className="w-4 h-4 inline mr-1" />
                难度等级
              </label>
              <select
                value={form.difficulty}
                onChange={e => updateField('difficulty', e.target.value as CourseFormData['difficulty'])}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {LOCAL_DIFFICULTY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 媒体与时长卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Video className="w-5 h-5 text-primary-500" />
          媒体与时长
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 封面图片 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Image className="w-4 h-4 inline mr-1" />
              封面图片
            </label>
            {form.cover ? (
              <div className="space-y-2">
                <div className="relative inline-block">
                  <img src={form.cover} alt="封面预览" className="w-40 h-24 object-cover rounded-lg border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <button
                    onClick={() => updateField('cover', '')}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="url"
                  value={form.cover}
                  onChange={e => updateField('cover', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="或输入封面图片 URL"
                />
              </div>
            ) : (
              <FileUpload
                category="cover"
                accept="image/*"
                placeholder="点击或拖拽上传封面图（JPG/PNG，最大5MB）"
                onSuccess={(result) => updateField('cover', result.url)}
              />
            )}
          </div>

          {/* 视频链接 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Video className="w-4 h-4 inline mr-1" />
              视频链接
            </label>
            <input
              type="url"
              value={form.video_url}
              onChange={e => updateField('video_url', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="输入视频 URL（可选）"
            />
          </div>

          {/* 课程价格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <DollarSign className="w-4 h-4 inline mr-1" />
              课程价格（元） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={e => updateField('price', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none ${
                errors.price ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="0 表示免费"
            />
            {errors.price && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.price}
              </p>
            )}
          </div>
        </div>

        {/* 封面预览 */}
        {form.cover && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">封面预览：</p>
            <div className="w-40 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={form.cover}
                alt="封面预览"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* 标签卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary-500" />
          课程标签
          <span className="text-sm font-normal text-gray-400">({form.tags.length}/10)</span>
        </h2>

        {/* 已添加的标签 */}
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
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
          placeholder="输入标签后按回车或逗号分隔，如：简历、面试技巧、求职"
          disabled={form.tags.length >= 10}
        />
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
          disabled={submitting}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {submitting ? '保存中...' : isEdit ? '保存修改' : '创建课程'}
        </button>
      </motion.div>
    </div>
  );
}
