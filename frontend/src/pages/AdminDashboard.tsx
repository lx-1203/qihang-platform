import {
  Users,
  Building2,
  ShieldCheck,
  Video,
  TrendingUp,
  AlertCircle,
  Search,
  BarChart,
} from "lucide-react";

const STATS = [
  {
    label: "注册学生总数",
    value: "145,200",
    change: "+1,200",
    icon: Users,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    label: "入驻企业总数",
    value: "3,450",
    change: "+45",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    label: "认证导师总数",
    value: "890",
    change: "+12",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    label: "平台课程总数",
    value: "4,520",
    change: "+150",
    icon: Video,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];

const PENDING_APPROVALS = [
  {
    id: 1,
    type: "导师入驻",
    name: "王XX",
    detail: "申请成为[产品经理]方向导师",
    time: "10分钟前",
    status: "待审核",
  },
  {
    id: 2,
    type: "企业入驻",
    name: "上海XX科技有限公司",
    detail: "提交营业执照与法人信息",
    time: "半小时前",
    status: "待审核",
  },
  {
    id: 3,
    type: "课程发布",
    name: "李导师",
    detail: "提交《Java高并发实战》视频课",
    time: "2小时前",
    status: "待审核",
  },
  {
    id: 4,
    type: "职位发布",
    name: "字节跳动",
    detail: "前端开发工程师 (2026届)",
    time: "3小时前",
    status: "系统已自动过审",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台数据总览</h1>
          <p className="text-gray-500 mt-1">
            系统运行平稳，目前有 15 项重要事项待您审批。
          </p>
        </div>
      </div>

      {/* 数据概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                {stat.label}
              </p>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <span className="text-emerald-500 font-medium">
                  <TrendingUp className="w-4 h-4 inline-block" />
                  {stat.change}
                </span>
                <span className="text-gray-400">本月新增</span>
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}
            >
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* 待办审核列表 (占 2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              待处理审批事项
            </h3>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              进入审核中心
            </button>
          </div>

          <div className="divide-y divide-gray-100 flex-1">
            {PENDING_APPROVALS.map((item) => (
              <div
                key={item.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-indigo-50/30 transition-colors gap-4"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`px-2.5 py-1 rounded text-xs font-bold border shrink-0 ${
                      item.type === "导师入驻"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : item.type === "企业入驻"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : item.type === "课程发布"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {item.type}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">{item.detail}</p>
                    <span className="text-xs text-gray-400">
                      {item.time}提交
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  {item.status === "待审核" ? (
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
                        去审核
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded border border-green-100">
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 快捷操作区 (占 1/3) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">
              快捷入口 & 全局搜索
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用户ID、手机号、企业名"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <h4 className="font-bold text-gray-900 mb-4 text-sm">常用功能</h4>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors border border-transparent hover:border-indigo-100 gap-2">
                  <ShieldCheck size={24} />
                  <span className="text-sm font-medium">权限配置</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors border border-transparent hover:border-indigo-100 gap-2">
                  <BarChart size={24} />
                  <span className="text-sm font-medium">数据导出</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors border border-transparent hover:border-indigo-100 gap-2">
                  <Video size={24} />
                  <span className="text-sm font-medium">轮播图设置</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors border border-transparent hover:border-indigo-100 gap-2">
                  <AlertCircle size={24} />
                  <span className="text-sm font-medium">违规处理</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
