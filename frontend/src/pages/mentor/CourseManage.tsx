import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Eye, Star, ToggleLeft, ToggleRight,
  Edit3, Trash2, X, Search, Filter, Image,
  FileText, BarChart3, Users, Loader2
} from 'lucide-react';
import http from '@/api/http';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ====== 导师课程管理页 ======
// 课程列表、状态切换、创建/编辑课程

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  cover: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  views: number;
  rating: number;
  rating_count: number;
  status: 'active' | 'inactive' | 'review';
  created_at: string;
}

interface CourseForm {
  title: string;
  description: string;
  category: string;
  cover: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const mockCourses: Course[] = [
  {
    id: 1, title: '校招简历怎么写才能过海选？', description: '从0到1打造一份能通过AI筛选的高质量校招简历，包含模板下载。',
    category: '简历指导', cover: '', difficulty: 'beginner', views: 12400, rating: 4.9, rating_count: 850, status: 'active', created_at: '2026-02-15',
  },
  {
    id: 2, title: '大厂群面通关秘籍', description: '深度解析BAT、字节跳动等大厂群面环节，提供实战案例和话术模板。',
    category: '面试辅导', cover: '', difficulty: 'intermediate', views: 8500, rating: 4.8, rating_count: 420, status: 'active', created_at: '2026-03-01',
  },
  {
    id: 3, title: '1V1模拟面试录像回放', description: '真实模拟面试场景回放与点评，帮助学生发现面试中的问题。',
    category: '面试辅导', cover: '', difficulty: 'advanced', views: 3200, rating: 4.7, rating_count: 150, status: 'inactive', created_at: '2026-03-10',
  },
  {
    id: 4, title: '职业规划必修课：找到你的方向', description: '帮助大学生明确职业方向，制定3-5年职业发展路线图。',
    category: '职业规划', cover: '', difficulty: 'beginner', views: 6800, rating: 4.6, rating_count: 380, status: 'active', created_at: '2026-01-20',
  },
  {
    id: 5, title: '考研复试面试全攻略', description: '考研复试各环节深度解析，含英语口语、专业面试、综合素质面试技巧。',
    category: '考研指导', cover: '', difficulty: 'intermediate', views: 4500, rating: 4.8, rating_count: 260, status: 'active', created_at: '2026-03-25',
  },
];

const emptyForm: CourseForm = {
  title: '', description: '', category: '', cover: '', difficulty: 'beginner',
};

const categories = ['简历指导', '面试辅导', '职业规划', '考研指导', '创业指导', '留学规划'];
const difficultyMap = {
  beginner: { label: '入门', color: 'bg-green-50 text-green-700' },
  intermediate: { label: '进阶', color: 'bg-blue-50 text-blue-700' },
  advanced: { label: '高级', color: 'bg-purple-50 text-purple-700' },
};
const statusMap = {
  active: { label: '已上线', color: 'bg-green-50 text-green-700' },
  inactive: { label: '已下线', color: 'bg-gray-100 text-gray-600' },
  review: { label: '审核中', color: 'bg-orange-50 text-orange-700' },
};

export default function CourseManage() {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: number; name: string} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);
      const res = await http.get('/mentor/courses');
      if (res.data?.code === 200 && res.data.data) {
        setCourses(res.data.data.courses || res.data.data.list || res.data.data);
      }
    } catch {
      // 使用默认 Mock 数据
    } finally {
      setLoading(false);
    }
  }

  // 筛选课程
  const filteredCourses = courses.filter(c => {
    const matchSearch = !searchKeyword || c.title.includes(searchKeyword) || c.category.includes(searchKeyword);
    const matchCategory = filterCategory === 'all' || c.category === filterCategory;
    return matchSearch && matchCategory;
  });

  // 切换课程状态
  async function toggleStatus(id: number) {
    setCourses(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newStatus = c.status === 'active' ? 'inactive' : 'active';
      return { ...c, status: newStatus };
    }));
    try {
      const course = courses.find(c => c.id === id);
      const newStatus = course?.status === 'active' ? 'inactive' : 'active';
      await http.put(`/mentor/courses/${id}/status`, { status: newStatus });
    } catch {
      // 忽略错误，保持前端状态
    }
  }

  // 打开编辑模态框
  function openEdit(course: Course) {
    setEditingId(course.id);
    setForm({
      title: course.title,
      description: course.description,
      category: course.category,
      cover: course.cover,
      difficulty: course.difficulty,
    });
    setShowModal(true);
  }

  // 打开创建模态框
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  // 提交表单
  async function handleSubmit() {
    if (!form.title.trim() || !form.category) return;
    try {
      setSubmitting(true);
      if (editingId) {
        // 编辑
        await http.put(`/mentor/courses/${editingId}`, form);
        setCourses(prev => prev.map(c =>
          c.id === editingId ? { ...c, ...form } : c
        ));
      } else {
        // 创建
        const newCourse: Course = {
          id: Date.now(),
          ...form,
          views: 0,
          rating: 0,
          rating_count: 0,
          status: 'active',
          created_at: new Date().toISOString().split('T')[0],
        };
        try {
          const res = await http.post('/mentor/courses', form);
          if (res.data?.code === 200 && res.data.data) {
            newCourse.id = res.data.data.id || newCourse.id;
          }
        } catch {
          // 使用前端生成的数据
        }
        setCourses(prev => [newCourse, ...prev]);
      }
      setShowModal(false);
    } catch {
      // 忽略错误
    } finally {
      setSubmitting(false);
    }
  }

  // 删除课程
  async function handleDelete(id: number) {
    setCourses(prev => prev.filter(c => c.id !== id));
    try {
      await http.delete(`/mentor/courses/${id}`);
    } catch {
      // 忽略错误
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await handleDelete(deleteTarget.id);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  // 格式化浏览量
  function formatViews(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">课程管理</h1>
          <p className="text-gray-500 mt-1">管理您的所有课程内容</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          创建课程
        </button>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索课程名称..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">全部分类</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '全部课程', value: courses.length, icon: BookOpen, bg: 'bg-primary-50', color: 'text-primary-600' },
          { label: '已上线', value: courses.filter(c => c.status === 'active').length, icon: ToggleRight, bg: 'bg-green-50', color: 'text-green-600' },
          { label: '总浏览量', value: formatViews(courses.reduce((a, c) => a + c.views, 0)), icon: Eye, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: '总学员数', value: courses.reduce((a, c) => a + (c.rating_count || 0), 0).toLocaleString(), icon: Users, bg: 'bg-purple-50', color: 'text-purple-600' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 课程列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">课程信息</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">分类</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">浏览量</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">评分</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">难度</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCourses.map((course, i) => (
                <motion.tr
                  key={course.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* 课程封面 */}
                      <div className="w-14 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        {course.cover ? (
                          <img src={course.cover} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate max-w-xs">{course.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">评价: {course.rating_count} · {course.created_at?.slice(0, 10)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{course.category}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-700">{formatViews(course.views)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-gray-700">{course.rating || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyMap[course.difficulty].color}`}>
                      {difficultyMap[course.difficulty].label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusMap[course.status].color}`}>
                      {statusMap[course.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {course.status !== 'review' && (
                        <button
                          onClick={() => toggleStatus(course.id)}
                          title={course.status === 'active' ? '下线课程' : '上线课程'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {course.status === 'active' ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(course)}
                        title="编辑"
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: course.id, name: course.title })}
                        title="删除"
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCourses.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无课程数据</p>
          </div>
        )}
      </div>

      {/* 创建/编辑课程模态框 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg shadow-xl"
            >
              {/* 模态框头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingId ? '编辑课程' : '创建新课程'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* 模态框内容 */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    课程标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="输入课程标题"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    课程描述
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="介绍课程内容、适合人群..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      课程分类 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.category}
                      onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">选择分类</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <BarChart3 className="w-4 h-4 inline mr-1" />
                      难度等级
                    </label>
                    <select
                      value={form.difficulty}
                      onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value as CourseForm['difficulty'] }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="beginner">入门</option>
                      <option value="intermediate">进阶</option>
                      <option value="advanced">高级</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Image className="w-4 h-4 inline mr-1" />
                    封面图片链接
                  </label>
                  <input
                    type="url"
                    value={form.cover}
                    onChange={e => setForm(prev => ({ ...prev, cover: e.target.value }))}
                    placeholder="输入封面图片URL（可选）"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* 模态框底部 */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.title.trim() || !form.category}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? '保存修改' : '创建课程'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="确认删除课程"
        description={`确定要删除课程「${deleteTarget?.name}」吗？删除后无法恢复。`}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
