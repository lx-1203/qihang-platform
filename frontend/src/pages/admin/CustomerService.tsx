import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Headphones, User, Phone, MessageCircle, Mail,
  Plus, Trash2, Edit3, Check, X, Loader2,
  ToggleLeft, ToggleRight, Save, Image,
  AlertCircle
} from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';
import { showToast } from '@/components/ui/ToastContainer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface ServiceAgent {
  id: number;
  name: string;
  avatar_url: string;
  is_online: boolean;
  phone: string;
  wechat: string;
  email: string;
  sort_order: number;
  created_at: string;
}

interface ContactConfig {
  service_phone: string;
  service_wechat: string;
  contact_email: string;
  service_online_enabled: boolean;
}

export default function AdminCustomerService() {
  const [agents, setAgents] = useState<ServiceAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceAgent>>({});
  const [saving, setSaving] = useState(false);

  const [addMode, setAddMode] = useState(false);
  const [addForm, setAddForm] = useState<Partial<ServiceAgent>>({
    name: '', avatar_url: '', is_online: true,
    phone: '', wechat: '', email: '', sort_order: 0,
  });

  const [contactConfig, setContactConfig] = useState<ContactConfig>({
    service_phone: '',
    service_wechat: '',
    contact_email: '',
    service_online_enabled: false,
  });
  const [configSaving, setConfigSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number }>({ open: false, id: 0 });
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgents();
    fetchConfig();
  }, []);

  async function fetchAgents() {
    setAgentsLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/customer-service');
      if (res.data?.code === 200 && res.data.data) {
        setAgents(res.data.data.agents || []);
      }
    } catch {
      setAgents([]);
    }
    finally { setAgentsLoading(false); }
  }

  async function fetchConfig() {
    try {
      const res = await http.get('/admin/customer-service/config');
      if (res.data?.code === 200 && res.data.data) {
        setContactConfig({
          service_phone: res.data.data.service_phone || '',
          service_wechat: res.data.data.service_wechat || '',
          contact_email: res.data.data.contact_email || '',
          service_online_enabled: res.data.data.service_online_enabled === '1' || res.data.data.service_online_enabled === true,
        });
      }
    } catch {
      try {
        const fallbackRes = await http.get('/config/all');
        if (fallbackRes.data?.code === 200 && Array.isArray(fallbackRes.data.data)) {
          const getVal = (key: string) => fallbackRes.data.data.find((c: any) => c.config_key === key)?.config_value || '';
          setContactConfig(prev => ({
            ...prev,
            service_phone: getVal('service_phone'),
            service_wechat: getVal('service_wechat'),
            contact_email: getVal('contact_email'),
            service_online_enabled: getVal('service_online_enabled') === '1' || getVal('service_online_enabled') === 'true',
          }));
        }
      } catch { /* ignore */ }
    }
  }

  async function saveContactConfig() {
    setConfigSaving(true);
    try {
      await http.put('/admin/customer-service/config', {
        service_phone: contactConfig.service_phone,
        service_wechat: contactConfig.service_wechat,
        contact_email: contactConfig.contact_email,
        service_online_enabled: contactConfig.service_online_enabled ? '1' : '0',
      });
      showToast({ type: 'success', title: '联系信息已保存' });
    } catch {
      try {
        await http.put('/config/service_online_enabled', { value: contactConfig.service_online_enabled ? '1' : '0' });
        await http.put('/config/service_phone', { value: contactConfig.service_phone });
        await http.put('/config/service_wechat', { value: contactConfig.service_wechat });
        await http.put('/config/contact_email', { value: contactConfig.contact_email });
        showToast({ type: 'success', title: '联系信息已保存' });
      } catch {
        showToast({ type: 'error', title: '保存失败' });
      }
    }
    finally { setConfigSaving(false); }
  }

  async function toggleOnlineService() {
    const newVal = !contactConfig.service_online_enabled;
    setContactConfig(prev => ({ ...prev, service_online_enabled: newVal }));
    try {
      await http.put('/config/service_online_enabled', { value: newVal ? '1' : '0' });
    } catch {
      showToast({ type: 'error', title: '切换失败' });
      setContactConfig(prev => ({ ...prev, service_online_enabled: !newVal }));
    }
  }

  function handleEdit(agent: ServiceAgent) {
    setEditingId(agent.id);
    setEditForm({ ...agent });
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditForm({});
  }

  async function handleEditSave() {
    if (!editForm.id) return;
    setSaving(true);
    try {
      const payload = {
        name: editForm.name,
        avatar_url: editForm.avatar_url,
        is_online: editForm.is_online,
        phone: editForm.phone,
        wechat: editForm.wechat,
        email: editForm.email,
        sort_order: editForm.sort_order,
      };
      await http.put(`/admin/customer-service/${editForm.id}`, payload);
      setAgents(prev => prev.map(a => a.id === editForm.id ? { ...a, ...editForm } as ServiceAgent : a));
      setEditingId(null);
      showToast({ type: 'success', title: '客服信息已更新' });
    } catch {
      setAgents(prev => prev.map(a => a.id === editForm.id ? { ...a, ...editForm } as ServiceAgent : a));
      setEditingId(null);
      showToast({ type: 'success', title: '已本地更新（后端同步失败）' });
    }
    finally { setSaving(false); }
  }

  async function handleAdd() {
    if (!addForm.name) return;
    setSaving(true);
    try {
      const res = await http.post('/admin/customer-service', {
        name: addForm.name,
        avatar_url: addForm.avatar_url || '',
        is_online: addForm.is_online !== false,
        phone: addForm.phone || '',
        wechat: addForm.wechat || '',
        email: addForm.email || '',
        sort_order: addForm.sort_order || 0,
      });
      if (res.data?.code === 200 && res.data.data) {
        const newAgent: ServiceAgent = {
          id: res.data.data.id || Date.now(),
          name: addForm.name || '',
          avatar_url: addForm.avatar_url || '',
          is_online: addForm.is_online !== false,
          phone: addForm.phone || '',
          wechat: addForm.wechat || '',
          email: addForm.email || '',
          sort_order: addForm.sort_order || 0,
          created_at: new Date().toISOString(),
        };
        setAgents(prev => [...prev, newAgent]);
      } else {
        const newAgent: ServiceAgent = {
          id: Date.now(),
          name: addForm.name || '',
          avatar_url: addForm.avatar_url || '',
          is_online: addForm.is_online !== false,
          phone: addForm.phone || '',
          wechat: addForm.wechat || '',
          email: addForm.email || '',
          sort_order: addForm.sort_order || 0,
          created_at: new Date().toISOString(),
        };
        setAgents(prev => [...prev, newAgent]);
      }
      setAddMode(false);
      setAddForm({ name: '', avatar_url: '', is_online: true, phone: '', wechat: '', email: '', sort_order: 0 });
      showToast({ type: 'success', title: '客服已添加' });
    } catch {
      showToast({ type: 'error', title: '添加失败' });
    }
    finally { setSaving(false); }
  }

  function handleDelete(id: number) {
    setDeleteDialog({ open: true, id });
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await http.delete(`/admin/customer-service/${deleteDialog.id}`);
      setAgents(prev => prev.filter(a => a.id !== deleteDialog.id));
      showToast({ type: 'success', title: '客服已删除' });
    } catch {
      setAgents(prev => prev.filter(a => a.id !== deleteDialog.id));
      showToast({ type: 'success', title: '已本地删除（后端同步失败）' });
    }
    finally {
      setDeleting(false);
      setDeleteDialog({ open: false, id: 0 });
    }
  }

  async function toggleAgentOnline(agent: ServiceAgent) {
    const updated = { ...agent, is_online: !agent.is_online };
    setAgents(prev => prev.map(a => a.id === agent.id ? updated : a));
    try {
      await http.put(`/admin/customer-service/${agent.id}`, { is_online: updated.is_online });
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">客服管理</h1>
        <p className="text-gray-500 mt-1">管理在线客服人员、联系方式及客服开关</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {/* ====== 在线客服开关 ====== */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Headphones className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">在线客服开关</h3>
              <p className="text-xs text-gray-500">{contactConfig.service_online_enabled ? '客服窗口已开启，用户端可见' : '客服窗口已关闭，用户端隐藏'}</p>
            </div>
          </div>
          <button onClick={toggleOnlineService} className="focus:outline-none">
            {contactConfig.service_online_enabled
              ? <ToggleRight className="w-12 h-6 text-green-500" />
              : <ToggleLeft className="w-12 h-6 text-gray-300" />}
          </button>
        </div>
      </div>

      {/* ====== 客服人员管理 ====== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">客服人员</h3>
            <p className="text-xs text-gray-500 mt-0.5">管理在线客服团队成员，配置姓名、头像和在线状态</p>
          </div>
          <button
            onClick={() => setAddMode(!addMode)}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />新增客服
          </button>
        </div>

        {addMode && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">姓名 <span className="text-red-500">*</span></label>
                <input type="text" value={addForm.name || ''} onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))} placeholder="客服姓名" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">头像URL</label>
                <input type="text" value={addForm.avatar_url || ''} onChange={e => setAddForm(prev => ({ ...prev, avatar_url: e.target.value }))} placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">在线状态</label>
                <select value={addForm.is_online ? 'true' : 'false'} onChange={e => setAddForm(prev => ({ ...prev, is_online: e.target.value === 'true' }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="true">在线</option>
                  <option value="false">离线</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={handleAdd} disabled={!addForm.name || saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm flex items-center gap-1 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}添加
                </button>
                <button onClick={() => { setAddMode(false); setAddForm({ name: '', avatar_url: '', is_online: true, phone: '', wechat: '', email: '', sort_order: 0 }); }} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 text-sm transition-colors">取消</button>
              </div>
            </div>
          </div>
        )}

        {agentsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Headphones className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">暂无客服人员</p>
            <p className="text-xs text-gray-500 mt-1">点击「新增客服」添加客服人员</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">客服</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">头像</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">联系信息</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <motion.tr key={agent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                  {editingId === agent.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input type="text" value={editForm.name || ''} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="w-36 border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      </td>
                      <td className="px-6 py-4">
                        <input type="text" value={editForm.avatar_url || ''} onChange={e => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))} className="w-48 border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => setEditForm(prev => ({ ...prev, is_online: !prev.is_online }))}>
                          {editForm.is_online ? <ToggleRight className="w-8 h-5 text-green-500" /> : <ToggleLeft className="w-8 h-5 text-gray-300" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <input type="text" value={editForm.phone || ''} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="电话" className="w-32 border border-gray-200 rounded px-2 py-0.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none" />
                          <input type="text" value={editForm.wechat || ''} onChange={e => setEditForm(prev => ({ ...prev, wechat: e.target.value }))} placeholder="微信" className="w-32 border border-gray-200 rounded px-2 py-0.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none" />
                          <input type="text" value={editForm.email || ''} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} placeholder="邮箱" className="w-32 border border-gray-200 rounded px-2 py-0.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={handleEditSave} disabled={saving} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="保存">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={handleEditCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="取消">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        {agent.avatar_url ? (
                          <img src={agent.avatar_url} alt={agent.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => toggleAgentOnline(agent)}>
                          {agent.is_online ? <ToggleRight className="w-8 h-5 text-green-500" /> : <ToggleLeft className="w-8 h-5 text-gray-300" />}
                        </button>
                        <span className={`ml-2 text-xs ${agent.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                          {agent.is_online ? '在线' : '离线'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {agent.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{agent.phone}</p>}
                          {agent.wechat && <p className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{agent.wechat}</p>}
                          {agent.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{agent.email}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(agent)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600" title="编辑">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(agent.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ====== 联系信息配置 ====== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">联系信息配置</h3>
              <p className="text-xs text-gray-500 mt-0.5">配置客服联系方式，将在客服窗口和联系页面展示</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1 text-gray-400" />
                客服电话
              </label>
              <input
                type="text"
                value={contactConfig.service_phone}
                onChange={e => setContactConfig(prev => ({ ...prev, service_phone: e.target.value }))}
                placeholder="如：400-650-0116"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MessageCircle className="w-4 h-4 inline mr-1 text-gray-400" />
                客服微信
              </label>
              <input
                type="text"
                value={contactConfig.service_wechat}
                onChange={e => setContactConfig(prev => ({ ...prev, service_wechat: e.target.value }))}
                placeholder="如：xdf_advisor"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1 text-gray-400" />
                联系邮箱
              </label>
              <input
                type="email"
                value={contactConfig.contact_email}
                onChange={e => setContactConfig(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="如：service@xdf.cn"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveContactConfig}
              disabled={configSaving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存联系信息
            </button>
          </div>
        </div>
      </div>

      {/* ====== 删除确认弹窗 ====== */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="确定要删除吗？"
        description="删除后客服人员信息将无法恢复，请确认操作。"
        variant="danger"
        confirmText="确认删除"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ open: false, id: 0 })}
      />
    </div>
  );
}