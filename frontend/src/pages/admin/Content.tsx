import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Briefcase, Video, Eye, EyeOff,
  MoreVertical, Loader2, ChevronLeft, ChevronRight,
  X, MessageSquare, FileText, BookOpen, Calendar,
  Plus, Trash2, Edit3, CheckCircle, XCircle, Clock,
  Tag as TagIcon, GraduationCap, Globe,
  Navigation, ArrowUp, ArrowDown, Save, ToggleLeft, ToggleRight
} from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';
import { showToast } from '@/components/ui/ToastContainer';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ====== 内容管理（职位+课程+文章+资源+招聘时间线） ======
// 数据从 /api/admin/ 下各接口获取

type Tab = 'jobs' | 'courses' | 'articles' | 'resources' | 'timelines' | 'offers' | 'study_timelines' | 'nav_config';

interface JobItem {
  id: number;
  title: string;
  company_name: string;
  location: string;
  salary: string;
  type: string;
  status: string;
  view_count?: number;
  created_at: string;
}

interface CourseItem {
  id: number;
  title: string;
  mentor_name: string;
  category: string;
  status: string;
  views: number;
  rating: number;
  created_at: string;
}

interface ArticleItem {
  id: number;
  title: string;
  summary: string;
  category: string;
  author: string;
  status: string;
  cover: string;
  created_at: string;
}

interface ResourceItem {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  file_url: string;
  created_at: string;
}

interface TimelineItem {
  id: number;
  company_name: string;
  event_type: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  apply_link: string;
  status: string;
  sort_order: number;
  created_at: string;
}

interface OfferItem {
  id: number;
  student_name: string;
  background: string;
  gpa: string;
  ielts: number | null;
  toefl: number | null;
  gre: number | null;
  result: string;
  country: string;
  school: string;
  program: string;
  scholarship: string;
  date: string;
  status: string;
  tags: string[];
  likes: number;
  created_at: string;
}

interface StudyTimelineItem {
  id: number;
  date: string;
  title: string;
  description: string;
  type: string;
  category: string;
  icon: string;
  color: string;
  status: string;
  created_at: string;
}

interface NavItem {
  id: number;
  label: string;
  path: string;
  icon_name: string;
  sort_order: number;
  enabled: boolean;
  is_external: boolean;
}

const ARTICLE_STATUS_MAP: Record<string, { label: string; variant: 'green' | 'yellow' | 'gray' }> = {
  published: { label: '已发布', variant: 'green' },
  draft: { label: '草稿', variant: 'yellow' },
  archived: { label: '已归档', variant: 'gray' },
};

const RESOURCE_STATUS_MAP: Record<string, { label: string; variant: 'green' | 'yellow' | 'gray' }> = {
  published: { label: '已发布', variant: 'green' },
  draft: { label: '草稿', variant: 'yellow' },
  archived: { label: '已归档', variant: 'gray' },
};

const EVENT_TYPE_MAP: Record<string, string> = {
  campus: '校招',
  internship: '实习',
  social: '社招',
  other: '其他',
};

export default function AdminContent() {
  const [tab, setTab] = useState<Tab>('jobs');
  const [search, setSearch] = useState('');
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  // 职位
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsTotalPages, setJobsTotalPages] = useState(1);

  // 课程
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesTotal, setCoursesTotal] = useState(0);
  const [coursesTotalPages, setCoursesTotalPages] = useState(1);

  // 文章
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesPage, setArticlesPage] = useState(1);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [articlesTotalPages, setArticlesTotalPages] = useState(1);

  // 资源库
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesPage, setResourcesPage] = useState(1);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [resourcesTotalPages, setResourcesTotalPages] = useState(1);

  // 招聘时间线
  const [timelines, setTimelines] = useState<TimelineItem[]>([]);
  const [timelinesLoading, setTimelinesLoading] = useState(true);
  const [timelinesPage, setTimelinesPage] = useState(1);
  const [timelinesTotal, setTimelinesTotal] = useState(0);
  const [timelinesTotalPages, setTimelinesTotalPages] = useState(1);

  // 成功案例
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersPage, setOffersPage] = useState(1);
  const [offersTotal, setOffersTotal] = useState(0);
  const [offersTotalPages, setOffersTotalPages] = useState(1);

  // 升学时间线
  const [studyTimelines, setStudyTimelines] = useState<StudyTimelineItem[]>([]);
  const [studyTimelinesLoading, setStudyTimelinesLoading] = useState(true);
  const [studyTimelinesPage, setStudyTimelinesPage] = useState(1);
  const [studyTimelinesTotal, setStudyTimelinesTotal] = useState(0);
  const [studyTimelinesTotalPages, setStudyTimelinesTotalPages] = useState(1);

  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [navEditingId, setNavEditingId] = useState<number | null>(null);
  const [navEditForm, setNavEditForm] = useState<Partial<NavItem>>({});
  const [navSaving, setNavSaving] = useState(false);
  const [navAddMode, setNavAddMode] = useState(false);
  const [navNewForm, setNavNewForm] = useState<Partial<NavItem>>({ label: '', path: '', icon_name: 'Navigation', sort_order: 0, enabled: true, is_external: false });

  const [error, setError] = useState('');
  const pageSize = 20;

  // 详情弹窗
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  // 删除确认弹窗
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: number }>({ open: false, type: '', id: 0 });
  const [deleting, setDeleting] = useState(false);

  // 编辑/新建弹窗（招聘时间线）
  const [timelineModal, setTimelineModal] = useState<{ open: boolean; item: TimelineItem | null }>({ open: false, item: null });
  const [timelineForm, setTimelineForm] = useState({
    company_name: '', event_type: 'campus', title: '', description: '',
    start_date: '', end_date: '', apply_link: '', status: 'active', sort_order: 0,
  });
  const [timelineSaving, setTimelineSaving] = useState(false);

  // ====== 数据加载函数 ======

  async function fetchJobs(keyword = '', page = 1) {
    setJobsLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/jobs', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setJobs(res.data.data?.jobs || []);
        const pagination = res.data.data?.pagination;
        if (pagination) { setJobsTotal(pagination.total); setJobsTotalPages(pagination.totalPages); setJobsPage(pagination.page); }
      }
    } catch { setError('加载职位数据失败'); setJobs([]); }
    finally { setJobsLoading(false); }
  }

  async function fetchCourses(keyword = '', page = 1) {
    setCoursesLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/courses', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setCourses(res.data.data?.courses || []);
        const pagination = res.data.data?.pagination;
        if (pagination) { setCoursesTotal(pagination.total); setCoursesTotalPages(pagination.totalPages); setCoursesPage(pagination.page); }
      }
    } catch { setError('加载内容资源数据失败'); setCourses([]); }
    finally { setCoursesLoading(false); }
  }

  async function fetchArticles(keyword = '', page = 1) {
    setArticlesLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/articles', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setArticles(res.data.data?.articles || []);
        const pagination = res.data.data?.pagination;
        if (pagination) { setArticlesTotal(pagination.total); setArticlesTotalPages(pagination.totalPages); setArticlesPage(pagination.page); }
      }
    } catch { setError('加载文章数据失败'); setArticles([]); }
    finally { setArticlesLoading(false); }
  }

  async function fetchResources(keyword = '', page = 1) {
    setResourcesLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/resource-library', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setResources(res.data.data?.list || res.data.data?.items || []);
        const pagination = res.data.data?.pagination;
        if (pagination) { setResourcesTotal(pagination.total); setResourcesTotalPages(pagination.totalPages); setResourcesPage(pagination.page); }
      }
    } catch { setError('加载资源数据失败'); setResources([]); }
    finally { setResourcesLoading(false); }
  }

  async function fetchTimelines(keyword = '', page = 1) {
    setTimelinesLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/recruitment-timelines', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setTimelines(res.data.data?.list || res.data.data?.items || []);
        const pagination = res.data.data?.pagination;
        if (pagination) { setTimelinesTotal(pagination.total); setTimelinesTotalPages(pagination.totalPages); setTimelinesPage(pagination.page); }
      }
    } catch { setError('加载招聘时间线数据失败'); setTimelines([]); }
    finally { setTimelinesLoading(false); }
  }

  async function fetchOffers(keyword = '', page = 1) {
    setOffersLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/study-abroad-offers', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setOffers(res.data.data?.list || []);
        const pagination = res.data.data;
        if (pagination) { setOffersTotal(pagination.total); setOffersTotalPages(Math.ceil(pagination.total / pageSize)); setOffersPage(pagination.page); }
      }
    } catch { setError('加载成功案例数据失败'); setOffers([]); }
    finally { setOffersLoading(false); }
  }

  async function fetchStudyTimelines(keyword = '', page = 1) {
    setStudyTimelinesLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/study-abroad-timeline', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setStudyTimelines(res.data.data?.list || []);
        const pagination = res.data.data;
        if (pagination) { setStudyTimelinesTotal(pagination.total); setStudyTimelinesTotalPages(Math.ceil(pagination.total / pageSize)); setStudyTimelinesPage(pagination.page); }
      }
    } catch { setError('加载升学时间线数据失败'); setStudyTimelines([]); }
    finally { setStudyTimelinesLoading(false); }
  }

  // 初始加载
  useEffect(() => {
    fetchJobs();
    fetchCourses();
    fetchArticles();
    fetchResources();
    fetchTimelines();
    fetchOffers();
    fetchStudyTimelines();
    fetchNavConfig();
  }, []);

  // 搜索触发
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'nav_config') return;
      if (tab === 'jobs') { setJobsPage(1); fetchJobs(search, 1); }
      else if (tab === 'courses') { setCoursesPage(1); fetchCourses(search, 1); }
      else if (tab === 'articles') { setArticlesPage(1); fetchArticles(search, 1); }
      else if (tab === 'resources') { setResourcesPage(1); fetchResources(search, 1); }
      else if (tab === 'timelines') { setTimelinesPage(1); fetchTimelines(search, 1); }
      else if (tab === 'offers') { setOffersPage(1); fetchOffers(search, 1); }
      else if (tab === 'study_timelines') { setStudyTimelinesPage(1); fetchStudyTimelines(search, 1); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tab]);

  // ====== 操作函数 ======

  async function toggleJobStatus(id: number) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    const newStatus = job.status === 'active' ? 'inactive' : 'active';
    try {
      await http.put(`/admin/jobs/${id}/status`, { status: newStatus });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
      showToast({ type: 'success', title: newStatus === 'active' ? '职位已上架' : '职位已下架' });
    } catch { showToast({ type: 'error', title: '操作失败，请重试' }); }
    setActionMenu(null);
  }

  async function toggleCourseStatus(id: number) {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    const newStatus = course.status === 'active' ? 'inactive' : 'active';
    try {
      await http.put(`/admin/courses/${id}/status`, { status: newStatus });
      setCourses(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      showToast({ type: 'success', title: newStatus === 'active' ? '内容资源已上架' : '内容资源已下架' });
    } catch { showToast({ type: 'error', title: '操作失败，请重试' }); }
    setActionMenu(null);
  }

  // 文章状态变更
  async function updateArticleStatus(id: number, status: string) {
    try {
      await http.put(`/admin/articles/${id}`, { status });
      setArticles(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      const statusLabel = status === 'published' ? '已发布' : status === 'archived' ? '已归档' : '已设为草稿';
      showToast({ type: 'success', title: `文章${statusLabel}` });
    } catch { showToast({ type: 'error', title: '操作失败，请重试' }); }
    setActionMenu(null);
  }

  // 删除文章
  async function deleteArticle(id: number) {
    try {
      setDeleting(true);
      await http.delete(`/admin/articles/${id}`);
      setArticles(prev => prev.filter(a => a.id !== id));
      showToast({ type: 'success', title: '文章已删除' });
    } catch { showToast({ type: 'error', title: '删除失败，请重试' }); }
    finally { setDeleting(false); setDeleteDialog({ open: false, type: '', id: 0 }); }
  }

  // 资源状态变更
  async function updateResourceStatus(id: number, status: string) {
    try {
      await http.put(`/admin/resource-library/${id}/status`, { status });
      setResources(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      const statusLabel = status === 'published' ? '已发布' : status === 'archived' ? '已归档' : '已设为草稿';
      showToast({ type: 'success', title: `资源${statusLabel}` });
    } catch { showToast({ type: 'error', title: '操作失败，请重试' }); }
    setActionMenu(null);
  }

  // 删除资源
  async function deleteResource(id: number) {
    try {
      setDeleting(true);
      await http.delete(`/admin/resource-library/${id}`);
      setResources(prev => prev.filter(r => r.id !== id));
      showToast({ type: 'success', title: '资源已删除' });
    } catch { showToast({ type: 'error', title: '删除失败，请重试' }); }
    finally { setDeleting(false); setDeleteDialog({ open: false, type: '', id: 0 }); }
  }

  // 招聘时间线保存（新建/编辑）
  async function saveTimeline() {
    setTimelineSaving(true);
    try {
      if (timelineModal.item) {
        // 编辑
        await http.put(`/admin/recruitment-timelines/${timelineModal.item.id}`, timelineForm);
        showToast({ type: 'success', title: '时间线事件已更新' });
      } else {
        // 新建
        await http.post('/admin/recruitment-timelines', timelineForm);
        showToast({ type: 'success', title: '时间线事件已创建' });
      }
      setTimelineModal({ open: false, item: null });
      fetchTimelines(search, timelinesPage);
    } catch { showToast({ type: 'error', title: '保存失败，请重试' }); }
    finally { setTimelineSaving(false); }
  }

  // 删除招聘时间线
  async function deleteTimeline(id: number) {
    try {
      setDeleting(true);
      await http.delete(`/admin/recruitment-timelines/${id}`);
      setTimelines(prev => prev.filter(t => t.id !== id));
      showToast({ type: 'success', title: '时间线事件已删除' });
    } catch { showToast({ type: 'error', title: '删除失败，请重试' }); }
    finally { setDeleting(false); setDeleteDialog({ open: false, type: '', id: 0 }); }
  }

  async function deleteOffer(id: number) {
    try {
      setDeleting(true);
      await http.delete(`/admin/study-abroad-offers/${id}`);
      setOffers(prev => prev.filter(o => o.id !== id));
      showToast({ type: 'success', title: '成功案例已删除' });
    } catch { showToast({ type: 'error', title: '删除失败，请重试' }); }
    finally { setDeleting(false); setDeleteDialog({ open: false, type: '', id: 0 }); }
  }

  async function deleteStudyTimeline(id: number) {
    try {
      setDeleting(true);
      await http.delete(`/admin/study-abroad-timeline/${id}`);
      setStudyTimelines(prev => prev.filter(t => t.id !== id));
      showToast({ type: 'success', title: '升学时间线事件已删除' });
    } catch { showToast({ type: 'error', title: '删除失败，请重试' }); }
    finally { setDeleting(false); setDeleteDialog({ open: false, type: '', id: 0 }); }
  }

  async function fetchNavConfig() {
    setNavLoading(true);
    try {
      const res = await http.get('/config/all');
      if (res.data?.code === 200 && Array.isArray(res.data.data)) {
        const navConfigItem = res.data.data.find((c: any) => c.config_key === 'site_nav_config');
        if (navConfigItem?.config_value) {
          try {
            const parsed = JSON.parse(navConfigItem.config_value);
            setNavItems(Array.isArray(parsed) ? parsed.map((item: any, idx: number) => ({
              id: item.id || idx + 1,
              label: item.label || '',
              path: item.path || '',
              icon_name: item.icon_name || 'Navigation',
              sort_order: item.sort_order != null ? item.sort_order : idx,
              enabled: item.enabled !== false,
              is_external: item.is_external || false,
            })) : []);
          } catch { setNavItems([]); }
        } else {
          setNavItems([]);
        }
      }
    } catch { setNavItems([]); }
    finally { setNavLoading(false); }
  }

  async function saveNavConfig(items: NavItem[]) {
    setNavSaving(true);
    try {
      const configValue = JSON.stringify(items.map(item => ({
        id: item.id,
        label: item.label,
        path: item.path,
        icon_name: item.icon_name,
        sort_order: item.sort_order,
        enabled: item.enabled,
        is_external: item.is_external,
      })));
      await http.put('/config/site_nav_config', { value: configValue });
      showToast({ type: 'success', title: '导航配置已保存' });
    } catch { showToast({ type: 'error', title: '保存导航配置失败' }); }
    finally { setNavSaving(false); }
  }

  function handleNavEdit(item: NavItem) {
    setNavEditingId(item.id);
    setNavEditForm({ ...item });
  }

  function handleNavEditSave() {
    if (!navEditForm.id) return;
    setNavItems(prev => prev.map(n => n.id === navEditForm.id ? { ...n, ...navEditForm } as NavItem : n));
    setNavEditingId(null);
    saveNavConfigSilent(navEditForm as NavItem);
  }

  function handleNavEditCancel() {
    setNavEditingId(null);
    setNavEditForm({});
  }

  function handleNavToggle(item: NavItem) {
    const updated = { ...item, enabled: !item.enabled };
    setNavItems(prev => prev.map(n => n.id === item.id ? updated : n));
    saveNavConfigSilent(updated);
  }

  async function saveNavConfigSilent(updatedItem?: NavItem) {
    try {
      const currentItems = updatedItem
        ? navItems.map(n => n.id === updatedItem.id ? {
            id: n.id, label: updatedItem.label, path: updatedItem.path,
            icon_name: updatedItem.icon_name, sort_order: n.sort_order,
            enabled: updatedItem.enabled, is_external: updatedItem.is_external,
          } : {
            id: n.id, label: n.label, path: n.path,
            icon_name: n.icon_name, sort_order: n.sort_order,
            enabled: n.enabled, is_external: n.is_external,
          })
        : navItems.map(n => ({
            id: n.id, label: n.label, path: n.path,
            icon_name: n.icon_name, sort_order: n.sort_order,
            enabled: n.enabled, is_external: n.is_external,
          }));
      await http.put('/config/site_nav_config', { value: JSON.stringify(currentItems) });
    } catch { /* silent */ }
  }

  function handleNavMove(index: number, direction: 'up' | 'down') {
    const newItems = [...navItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    const reordered = newItems.map((item, idx) => ({ ...item, sort_order: idx }));
    setNavItems(reordered);
    saveNavConfigSilent();
  }

  function handleNavAdd() {
    const newItem: NavItem = {
      id: Math.max(0, ...navItems.map(n => n.id)) + 1,
      label: navNewForm.label || '新导航项',
      path: navNewForm.path || '/',
      icon_name: navNewForm.icon_name || 'Navigation',
      sort_order: navItems.length,
      enabled: navNewForm.enabled !== false,
      is_external: navNewForm.is_external || false,
    };
    const updatedItems = [...navItems, newItem];
    setNavItems(updatedItems);
    setNavAddMode(false);
    setNavNewForm({ label: '', path: '', icon_name: 'Navigation', sort_order: 0, enabled: true, is_external: false });
    saveNavConfigSilent();
  }

  function handleNavDelete(id: number) {
    setDeleteDialog({ open: true, type: 'nav', id });
  }

  async function deleteNavItem(id: number) {
    try {
      setDeleting(true);
      const updatedItems = navItems.filter(n => n.id !== id).map((item, idx) => ({ ...item, sort_order: idx }));
      setNavItems(updatedItems);
      showToast({ type: 'success', title: '导航项已删除' });
      await http.put('/config/site_nav_config', { value: JSON.stringify(updatedItems.map(n => ({
        id: n.id, label: n.label, path: n.path, icon_name: n.icon_name,
        sort_order: n.sort_order, enabled: n.enabled, is_external: n.is_external,
      }))) });
    } catch { showToast({ type: 'error', title: '删除失败' }); }
    finally { setDeleting(false); setDeleteDialog({ open: false, type: '', id: 0 }); }
  }

  // 查看详情
  async function viewDetail(type: string, id: number) {
    setDetailLoading(true);
    try {
      const endpoint = type === 'job' ? `/admin/jobs/${id}`
        : type === 'course' ? `/admin/courses/${id}`
        : type === 'article' ? `/admin/articles/${id}`
        : `/admin/resource-library/${id}`;
      const res = await http.get(endpoint);
      if (res.data?.code === 200) {
        setDetailItem({ ...res.data.data, _type: type });
      }
    } catch { showToast({ type: 'error', title: '获取详情失败' }); }
    finally { setDetailLoading(false); }
  }

  // 发送反馈
  async function sendFeedback() {
    if (!detailItem || !feedbackText.trim()) return;
    const userId = detailItem._type === 'job' ? detailItem.company_user_id : detailItem.mentor_user_id;
    if (!userId) { showToast({ type: 'error', title: '无法发送反馈：未找到用户信息' }); return; }
    setFeedbackSending(true);
    try {
      await http.post('/admin/feedback', {
        userId,
        title: `关于「${detailItem.title}」的审核反馈`,
        content: feedbackText,
      });
      showToast({ type: 'success', title: '反馈已发送' });
      setFeedbackText('');
    } catch { showToast({ type: 'error', title: '发送失败，请重试' }); }
    finally { setFeedbackSending(false); }
  }

  // 分页处理
  const isLoading = tab === 'nav_config' ? navLoading
    : tab === 'jobs' ? jobsLoading
    : tab === 'courses' ? coursesLoading
    : tab === 'articles' ? articlesLoading
    : tab === 'resources' ? resourcesLoading
    : tab === 'timelines' ? timelinesLoading
    : tab === 'offers' ? offersLoading
    : studyTimelinesLoading;

  const currentPage = tab === 'nav_config' ? 1
    : tab === 'jobs' ? jobsPage
    : tab === 'courses' ? coursesPage
    : tab === 'articles' ? articlesPage
    : tab === 'resources' ? resourcesPage
    : tab === 'timelines' ? timelinesPage
    : tab === 'offers' ? offersPage
    : studyTimelinesPage;

  const currentTotalPages = tab === 'nav_config' ? 1
    : tab === 'jobs' ? jobsTotalPages
    : tab === 'courses' ? coursesTotalPages
    : tab === 'articles' ? articlesTotalPages
    : tab === 'resources' ? resourcesTotalPages
    : tab === 'timelines' ? timelinesTotalPages
    : tab === 'offers' ? offersTotalPages
    : studyTimelinesTotalPages;

  const currentTotal = tab === 'nav_config' ? navItems.length
    : tab === 'jobs' ? jobsTotal
    : tab === 'courses' ? coursesTotal
    : tab === 'articles' ? articlesTotal
    : tab === 'resources' ? resourcesTotal
    : tab === 'timelines' ? timelinesTotal
    : tab === 'offers' ? offersTotal
    : studyTimelinesTotal;

  const handlePageChange = (newPage: number) => {
    if (tab === 'nav_config') return;
    if (tab === 'jobs') { setJobsPage(newPage); fetchJobs(search, newPage); }
    else if (tab === 'courses') { setCoursesPage(newPage); fetchCourses(search, newPage); }
    else if (tab === 'articles') { setArticlesPage(newPage); fetchArticles(search, newPage); }
    else if (tab === 'resources') { setResourcesPage(newPage); fetchResources(search, newPage); }
    else if (tab === 'timelines') { setTimelinesPage(newPage); fetchTimelines(search, newPage); }
    else if (tab === 'offers') { setOffersPage(newPage); fetchOffers(search, newPage); }
    else { setStudyTimelinesPage(newPage); fetchStudyTimelines(search, newPage); }
  };

  // 打开编辑时间线弹窗
  function openTimelineEdit(item: TimelineItem | null) {
    if (item) {
      setTimelineForm({
        company_name: item.company_name, event_type: item.event_type, title: item.title,
        description: item.description, start_date: item.start_date?.slice(0, 10) || '',
        end_date: item.end_date?.slice(0, 10) || '', apply_link: item.apply_link,
        status: item.status, sort_order: item.sort_order,
      });
    } else {
      setTimelineForm({
        company_name: '', event_type: 'campus', title: '', description: '',
        start_date: '', end_date: '', apply_link: '', status: 'active', sort_order: 0,
      });
    }
    setTimelineModal({ open: true, item });
  }

  const tabConfig: { key: Tab; label: string; icon: typeof Briefcase; count: number }[] = [
    { key: 'jobs', label: '职位管理', icon: Briefcase, count: jobsTotal },
    { key: 'courses', label: '内容资源', icon: Video, count: coursesTotal },
    { key: 'articles', label: '文章审核', icon: FileText, count: articlesTotal },
    { key: 'resources', label: '资料资源库', icon: BookOpen, count: resourcesTotal },
    { key: 'timelines', label: '招聘时间线', icon: Calendar, count: timelinesTotal },
    { key: 'offers', label: '成功案例', icon: GraduationCap, count: offersTotal },
    { key: 'study_timelines', label: '升学时间线', icon: Globe, count: studyTimelinesTotal },
    { key: 'nav_config', label: '导航配置', icon: Navigation, count: navItems.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
        <p className="text-gray-500 mt-1">管理平台所有内容板块，支持审核、发布、删除操作</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {/* Tab切换 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {tabConfig.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="content-search"
              name="content-search"
              placeholder={
                tab === 'jobs' ? '搜索职位名称、公司...'
                : tab === 'courses' ? '搜索资源名称、发布者...'
                : tab === 'articles' ? '搜索文章标题、作者...'
                : tab === 'resources' ? '搜索资源标题...'
                : tab === 'timelines' ? '搜索企业名称、事件标题...'
                : tab === 'offers' ? '搜索学生姓名、院校、项目...'
                : '搜索标题、描述...'
              }
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          {tab === 'timelines' && (
            <button
              onClick={() => openTimelineEdit(null)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增事件
            </button>
          )}
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* ====== 职位列表 ====== */}
      {tab === 'jobs' && !jobsLoading && jobs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">职位</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">公司</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">薪资</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job, i) => (
                <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.location}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{job.company_name}</td>
                  <td className="px-6 py-4">
                    <Tag variant={job.type === '校招' ? 'blue' : job.type === '实习' ? 'green' : 'gray'} size="sm">{job.type}</Tag>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{job.salary}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${job.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                      {job.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {job.status === 'active' ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={() => setActionMenu(actionMenu === job.id ? null : job.id)} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === job.id && (
                      <div className="absolute right-6 top-12 w-36 bg-white rounded-lg shadow-lg border py-1 z-10">
                        <button onClick={() => { viewDetail('job', job.id); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Eye className="w-4 h-4" />查看详情
                        </button>
                        <button onClick={() => toggleJobStatus(job.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          {job.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {job.status === 'active' ? '下架' : '上架'}
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== 内容资源列表 ====== */}
      {tab === 'courses' && !coursesLoading && courses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">资源</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">发布者</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">浏览</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">评分</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course, i) => (
                <motion.tr key={course.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{course.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.mentor_name}</td>
                  <td className="px-6 py-4"><Tag variant="purple" size="sm">{course.category}</Tag></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{course.views >= 10000 ? `${(course.views / 10000).toFixed(1)}万` : course.views}</td>
                  <td className="px-6 py-4 text-sm text-amber-600 font-medium">{course.rating || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${course.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                      {course.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {course.status === 'active' ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={() => setActionMenu(actionMenu === course.id + 1000 ? null : course.id + 1000)} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === course.id + 1000 && (
                      <div className="absolute right-6 top-12 w-36 bg-white rounded-lg shadow-lg border py-1 z-10">
                        <button onClick={() => { viewDetail('course', course.id); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Eye className="w-4 h-4" />查看详情
                        </button>
                        <button onClick={() => toggleCourseStatus(course.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          {course.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {course.status === 'active' ? '下架' : '上架'}
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== 文章审核列表 ====== */}
      {tab === 'articles' && !articlesLoading && articles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">文章标题</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">作者</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((article, i) => {
                const statusInfo = ARTICLE_STATUS_MAP[article.status] || { label: article.status, variant: 'gray' as const };
                return (
                  <motion.tr key={article.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{article.title}</p>
                      {article.summary && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">{article.summary}</p>}
                    </td>
                    <td className="px-6 py-4"><Tag variant="blue" size="sm">{article.category}</Tag></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{article.author}</td>
                    <td className="px-6 py-4"><Tag variant={statusInfo.variant} size="sm">{statusInfo.label}</Tag></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(article.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="px-6 py-4 text-right relative">
                      <button onClick={() => setActionMenu(actionMenu === article.id + 2000 ? null : article.id + 2000)} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {actionMenu === article.id + 2000 && (
                        <div className="absolute right-6 top-12 w-40 bg-white rounded-lg shadow-lg border py-1 z-10">
                          <button onClick={() => { viewDetail('article', article.id); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Eye className="w-4 h-4" />查看详情
                          </button>
                          {article.status !== 'published' && (
                            <button onClick={() => updateArticleStatus(article.id, 'published')} className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />发布
                            </button>
                          )}
                          {article.status !== 'draft' && (
                            <button onClick={() => updateArticleStatus(article.id, 'draft')} className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                              <Clock className="w-4 h-4" />设为草稿
                            </button>
                          )}
                          {article.status !== 'archived' && (
                            <button onClick={() => updateArticleStatus(article.id, 'archived')} className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                              <EyeOff className="w-4 h-4" />归档
                            </button>
                          )}
                          <button onClick={() => { setDeleteDialog({ open: true, type: 'article', id: article.id }); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />删除
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== 资源库列表 ====== */}
      {tab === 'resources' && !resourcesLoading && resources.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">资源标题</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resources.map((resource, i) => {
                const statusInfo = RESOURCE_STATUS_MAP[resource.status] || { label: resource.status, variant: 'gray' as const };
                return (
                  <motion.tr key={resource.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{resource.title}</p>
                      {resource.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">{resource.description}</p>}
                    </td>
                    <td className="px-6 py-4"><Tag variant="purple" size="sm">{resource.category || '未分类'}</Tag></td>
                    <td className="px-6 py-4"><Tag variant={statusInfo.variant} size="sm">{statusInfo.label}</Tag></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(resource.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="px-6 py-4 text-right relative">
                      <button onClick={() => setActionMenu(actionMenu === resource.id + 3000 ? null : resource.id + 3000)} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {actionMenu === resource.id + 3000 && (
                        <div className="absolute right-6 top-12 w-40 bg-white rounded-lg shadow-lg border py-1 z-10">
                          <button onClick={() => { viewDetail('resource', resource.id); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Eye className="w-4 h-4" />查看详情
                          </button>
                          {resource.status !== 'published' && (
                            <button onClick={() => updateResourceStatus(resource.id, 'published')} className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />发布
                            </button>
                          )}
                          {resource.status !== 'draft' && (
                            <button onClick={() => updateResourceStatus(resource.id, 'draft')} className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                              <Clock className="w-4 h-4" />设为草稿
                            </button>
                          )}
                          {resource.status !== 'archived' && (
                            <button onClick={() => updateResourceStatus(resource.id, 'archived')} className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                              <EyeOff className="w-4 h-4" />归档
                            </button>
                          )}
                          <button onClick={() => { setDeleteDialog({ open: true, type: 'resource', id: resource.id }); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />删除
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== 招聘时间线列表 ====== */}
      {tab === 'timelines' && !timelinesLoading && timelines.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">企业名称</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">事件类型</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">标题</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timelines.map((tl, i) => (
                <motion.tr key={tl.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tl.company_name}</td>
                  <td className="px-6 py-4">
                    <Tag variant={tl.event_type === 'campus' ? 'blue' : tl.event_type === 'internship' ? 'green' : 'gray'} size="sm">
                      {EVENT_TYPE_MAP[tl.event_type] || tl.event_type}
                    </Tag>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 truncate max-w-[250px]">{tl.title}</p>
                    {tl.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[250px]">{tl.description}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tl.start_date ? new Date(tl.start_date).toLocaleDateString('zh-CN') : '-'}
                    {tl.end_date ? ` ~ ${new Date(tl.end_date).toLocaleDateString('zh-CN')}` : ''}
                  </td>
                  <td className="px-6 py-4">
                    <Tag variant={tl.status === 'active' ? 'green' : 'gray'} size="sm">
                      {tl.status === 'active' ? '生效' : '停用'}
                    </Tag>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openTimelineEdit(tl)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600" title="编辑">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteDialog({ open: true, type: 'timeline', id: tl.id })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== 成功案例列表 ====== */}
      {tab === 'offers' && !offersLoading && offers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">学生姓名</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">目标院校·项目</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">背景</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">录取结果</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((offer, i) => (
                <motion.tr key={offer.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{offer.student_name}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 truncate max-w-[200px]">{offer.school}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{offer.program}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-gray-500">{offer.background} | GPA {offer.gpa}</p>
                    {offer.ielts && <span className="text-xs text-blue-600 mr-2">IELTS {offer.ielts}</span>}
                    {offer.toefl && <span className="text-xs text-blue-600 mr-2">TOEFL {offer.toefl}</span>}
                    {offer.gre && <span className="text-xs text-blue-600">GRE {offer.gre}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <Tag variant="green" size="sm">{offer.result}</Tag>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{offer.date ? new Date(offer.date).toLocaleDateString('zh-CN') : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDeleteDialog({ open: true, type: 'offer', id: offer.id })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== 升学时间线列表 ====== */}
      {tab === 'study_timelines' && !studyTimelinesLoading && studyTimelines.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">标题</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studyTimelines.map((stl, i) => (
                <motion.tr key={stl.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{stl.date ? new Date(stl.date).toLocaleDateString('zh-CN') : '-'}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{stl.title}</p>
                    {stl.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[250px]">{stl.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <Tag variant={stl.type === 'milestone' ? 'blue' : 'gray'} size="sm">
                      {stl.category || stl.type || '-'}
                    </Tag>
                  </td>
                  <td className="px-6 py-4">
                    <Tag variant={stl.status === 'active' ? 'green' : 'gray'} size="sm">
                      {stl.status === 'active' ? '生效' : '停用'}
                    </Tag>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDeleteDialog({ open: true, type: 'study_timeline', id: stl.id })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== 导航配置 ====== */}
      {tab === 'nav_config' && !navLoading && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">导航项管理</h3>
                <p className="text-xs text-gray-500 mt-0.5">配置站点主导航菜单，修改后保存立即生效</p>
              </div>
              <button
                onClick={() => setNavAddMode(!navAddMode)}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />新增导航
              </button>
            </div>

            {navAddMode && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">名称</label>
                  <input type="text" value={navNewForm.label || ''} onChange={e => setNavNewForm(prev => ({ ...prev, label: e.target.value }))} placeholder="导航名称" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">路径</label>
                  <input type="text" value={navNewForm.path || ''} onChange={e => setNavNewForm(prev => ({ ...prev, path: e.target.value }))} placeholder="/path" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">图标名称</label>
                  <input type="text" value={navNewForm.icon_name || ''} onChange={e => setNavNewForm(prev => ({ ...prev, icon_name: e.target.value }))} placeholder="Navigation" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={handleNavAdd} disabled={!navNewForm.label || !navNewForm.path} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm flex items-center gap-1 transition-colors">
                    <Save className="w-4 h-4" />添加
                  </button>
                  <button onClick={() => setNavAddMode(false)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 text-sm transition-colors">取消</button>
                </div>
              </div>
            )}

            {navItems.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Navigation className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">暂无导航配置</p>
                <p className="text-xs text-gray-500 mt-1">点击「新增导航」添加导航项</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-10">排序</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">名称</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">路径</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">图标</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-20">状态</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase w-32">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {navItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {navEditingId === item.id ? (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => handleNavMove(idx, 'up')} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30" title="上移">
                                <ArrowUp className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <span className="text-xs text-gray-500 w-5 text-center">{idx}</span>
                              <button onClick={() => handleNavMove(idx, 'down')} disabled={idx === navItems.length - 1} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30" title="下移">
                                <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={navEditForm.label || ''} onChange={e => setNavEditForm(prev => ({ ...prev, label: e.target.value }))} className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={navEditForm.path || ''} onChange={e => setNavEditForm(prev => ({ ...prev, path: e.target.value }))} className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={navEditForm.icon_name || ''} onChange={e => setNavEditForm(prev => ({ ...prev, icon_name: e.target.value }))} className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setNavEditForm(prev => ({ ...prev, enabled: !prev.enabled }))}>
                              {navEditForm.enabled ? <ToggleRight className="w-8 h-5 text-green-500" /> : <ToggleLeft className="w-8 h-5 text-gray-300" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={handleNavEditSave} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="保存">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={handleNavEditCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="取消">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => handleNavMove(idx, 'up')} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30" title="上移">
                                <ArrowUp className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <span className="text-xs text-gray-500 w-5 text-center">{idx}</span>
                              <button onClick={() => handleNavMove(idx, 'down')} disabled={idx === navItems.length - 1} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30" title="下移">
                                <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <p className="text-sm text-gray-600 font-mono text-xs">{item.path}</p>
                              {item.is_external && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">外链</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-500 font-mono">{item.icon_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleNavToggle(item)}>
                              {item.enabled ? <ToggleRight className="w-8 h-5 text-green-500" /> : <ToggleLeft className="w-8 h-5 text-gray-300" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleNavEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600" title="编辑">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleNavDelete(item.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600" title="删除">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && (
        (tab === 'jobs' && jobs.length === 0) ||
        (tab === 'courses' && courses.length === 0) ||
        (tab === 'articles' && articles.length === 0) ||
        (tab === 'resources' && resources.length === 0) ||
        (tab === 'timelines' && timelines.length === 0)
      ) && !error && (
        <EmptyState
          icon={tab === 'jobs' ? Briefcase : tab === 'courses' ? Video : tab === 'articles' ? FileText : tab === 'resources' ? BookOpen : Calendar}
          title={`暂无${tab === 'jobs' ? '职位' : tab === 'courses' ? '资源' : tab === 'articles' ? '文章' : tab === 'resources' ? '资源' : '招聘时间线'}数据`}
          description={tab === 'timelines' ? '点击「新增事件」添加大厂招聘时间线' : ''}
        />
      )}

      {/* 分页控件 */}
      {!isLoading && currentTotal > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
          <span className="text-sm text-gray-500">共 {currentTotal} 条记录，第 {currentPage} / {currentTotalPages} 页</span>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700">{currentPage}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= currentTotalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {(detailItem || detailLoading) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => { setDetailItem(null); setFeedbackText(''); }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
            ) : detailItem && (
              <>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                  <h3 className="text-lg font-bold text-gray-900">
                    {detailItem._type === 'job' ? '职位详情' : detailItem._type === 'course' ? '资源详情' : detailItem._type === 'article' ? '文章详情' : '资源详情'}
                  </h3>
                  <button onClick={() => { setDetailItem(null); setFeedbackText(''); }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{detailItem.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {detailItem._type === 'job' ? detailItem.company_name : detailItem._type === 'course' ? detailItem.mentor_name : detailItem.author || ''}
                      {detailItem.location && ` · ${detailItem.location}`}
                    </p>
                  </div>
                  {detailItem._type === 'job' && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {detailItem.type && <Tag variant="blue" size="sm">{detailItem.type}</Tag>}
                      {detailItem.salary && <Tag variant="green" size="sm">{detailItem.salary}</Tag>}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${detailItem.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                        {detailItem.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {detailItem.status === 'active' ? '上架中' : '已下架'}
                      </span>
                    </div>
                  )}
                  {detailItem._type === 'course' && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {detailItem.category && <Tag variant="purple" size="sm">{detailItem.category}</Tag>}
                      {detailItem.rating > 0 && <span className="text-amber-600 font-medium">评分: {detailItem.rating}</span>}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${detailItem.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                        {detailItem.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {detailItem.status === 'active' ? '上架中' : '已下架'}
                      </span>
                    </div>
                  )}
                  {detailItem._type === 'article' && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {detailItem.category && <Tag variant="blue" size="sm">{detailItem.category}</Tag>}
                      <Tag variant={ARTICLE_STATUS_MAP[detailItem.status]?.variant || 'gray'} size="sm">
                        {ARTICLE_STATUS_MAP[detailItem.status]?.label || detailItem.status}
                      </Tag>
                    </div>
                  )}
                  {detailItem.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">详细描述</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detailItem.description}</p>
                    </div>
                  )}
                  {detailItem.requirements && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">岗位要求</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detailItem.requirements}</p>
                    </div>
                  )}
                  {detailItem.content && detailItem._type === 'article' && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">文章内容</p>
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto whitespace-pre-wrap">{detailItem.content}</div>
                    </div>
                  )}
                  {detailItem.tags && detailItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {detailItem.tags.map((tag: string) => (
                        <Tag key={tag} variant="gray" size="sm">{tag}</Tag>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">创建时间：{new Date(detailItem.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {/* 审核反馈 */}
                {(detailItem._type === 'job' || detailItem._type === 'course') && (
                  <div className="px-6 py-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />发送审核反馈
                    </p>
                    <textarea id="admin-feedback" name="admin-feedback" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="输入反馈内容，将以通知形式发送给发布者..." rows={3} className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
                    <button onClick={sendFeedback} disabled={!feedbackText.trim() || feedbackSending} className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 text-sm font-medium flex items-center gap-1">
                      {feedbackSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}发送反馈
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="确定要删除吗？"
        description={deleteDialog.type === 'article' ? '删除后文章将无法恢复，请确认操作。' : deleteDialog.type === 'resource' ? '删除后资源将无法恢复，请确认操作。' : '删除后时间线事件将无法恢复，请确认操作。'}
        variant="danger"
        confirmText="确认删除"
        loading={deleting}
        onConfirm={() => {
          if (deleteDialog.type === 'article') deleteArticle(deleteDialog.id);
          else if (deleteDialog.type === 'resource') deleteResource(deleteDialog.id);
          else if (deleteDialog.type === 'timeline') deleteTimeline(deleteDialog.id);
          else if (deleteDialog.type === 'offer') deleteOffer(deleteDialog.id);
          else if (deleteDialog.type === 'study_timeline') deleteStudyTimeline(deleteDialog.id);
          else if (deleteDialog.type === 'nav') deleteNavItem(deleteDialog.id);
        }}
        onCancel={() => setDeleteDialog({ open: false, type: '', id: 0 })}
      />

      {/* 招聘时间线编辑/新建弹窗 */}
      {timelineModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setTimelineModal({ open: false, item: null })}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{timelineModal.item ? '编辑招聘时间线事件' : '新增招聘时间线事件'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">企业名称 <span className="text-red-500">*</span></label>
                <input type="text" value={timelineForm.company_name} onChange={e => setTimelineForm(prev => ({ ...prev, company_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="例如：字节跳动" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事件类型 <span className="text-red-500">*</span></label>
                <select value={timelineForm.event_type} onChange={e => setTimelineForm(prev => ({ ...prev, event_type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="campus">校招</option>
                  <option value="internship">实习</option>
                  <option value="social">社招</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事件标题 <span className="text-red-500">*</span></label>
                <input type="text" value={timelineForm.title} onChange={e => setTimelineForm(prev => ({ ...prev, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="例如：2025届秋招正式批" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事件描述</label>
                <textarea value={timelineForm.description} onChange={e => setTimelineForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="事件详细描述..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                  <input type="date" value={timelineForm.start_date} onChange={e => setTimelineForm(prev => ({ ...prev, start_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                  <input type="date" value={timelineForm.end_date} onChange={e => setTimelineForm(prev => ({ ...prev, end_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">申请链接</label>
                <input type="url" value={timelineForm.apply_link} onChange={e => setTimelineForm(prev => ({ ...prev, apply_link: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={timelineForm.status} onChange={e => setTimelineForm(prev => ({ ...prev, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="active">生效</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序权重</label>
                  <input type="number" value={timelineForm.sort_order} onChange={e => setTimelineForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" min={0} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setTimelineModal({ open: false, item: null })} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button onClick={saveTimeline} disabled={timelineSaving || !timelineForm.company_name || !timelineForm.title} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 text-sm font-medium flex items-center gap-1 transition-colors">
                {timelineSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {timelineModal.item ? '保存修改' : '创建事件'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
