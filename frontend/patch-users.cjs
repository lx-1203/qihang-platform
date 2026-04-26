const fs = require('fs');

let code = fs.readFileSync('src/pages/admin/Users.tsx', 'utf8');

// We add a state for the detailed user
if (!code.includes('const [detailUser, setDetailUser] =')) {
  code = code.replace(
    'const [actionMenu, setActionMenu] = useState<number | null>(null);',
    'const [actionMenu, setActionMenu] = useState<number | null>(null);\n  const [detailUser, setDetailUser] = useState<User | null>(null);'
  );
}

// We replace the "查看详情" onClick
code = code.replace(
  "onClick={() => { showToast({ type: 'info', title: '功能开发中', message: '该功能正在开发中，敬请期待' }); setActionMenu(null); }}",
  "onClick={() => { setDetailUser(user); setActionMenu(null); }}"
);

// We add the Modal at the bottom
const modalCode = `
      {/* 导出功能弹窗 */}
      <ConfirmDialog
        open={false}
        title="1"
        description="1"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
      {/* 用户详情弹窗 */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">用户详情</h3>
              <button onClick={() => setDetailUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary-100 text-primary-700 font-bold rounded-full flex items-center justify-center text-2xl">
                  {detailUser.nickname?.charAt(0) || detailUser.email.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{detailUser.nickname || '未设置昵称'}</h4>
                  <p className="text-sm text-gray-500">{detailUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">ID</p>
                  <p className="font-medium text-gray-900">{detailUser.id}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">角色</p>
                  <p className="font-medium text-gray-900">{detailUser.role}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">状态</p>
                  <p className="font-medium text-gray-900">{detailUser.status === 1 ? '正常' : '已禁用'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">注册时间</p>
                  <p className="font-medium text-gray-900">{new Date(detailUser.created_at).toLocaleString()}</p>
                </div>
                {detailUser.phone && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">手机号</p>
                    <p className="font-medium text-gray-900">{detailUser.phone}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setDetailUser(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/m, modalCode + '\n    </div>\n  );\n}');

fs.writeFileSync('src/pages/admin/Users.tsx', code);
console.log('Patched Users.tsx');
