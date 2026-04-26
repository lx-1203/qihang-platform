const fs = require('fs');
let code = fs.readFileSync('src/pages/DevNav.tsx', 'utf8');

if (!code.includes('import { useState }')) {
  code = code.replace("import { Link } from 'react-router-dom';", "import { useState } from 'react';\nimport { Link } from 'react-router-dom';");
}
if (!code.includes("import http from '@/api/http';")) {
  code = code.replace("import { useAuthStore } from '@/store/auth';", "import { useAuthStore } from '@/store/auth';\nimport http from '@/api/http';");
}

const oldFunc = `  function switchRole(role: 'admin' | 'company' | 'mentor' | 'student') {
    const mockUsers = {
      admin: { id: 1, email: 'admin@example.com', nickname: '超级管理员', role: 'admin' as const, avatar: '', phone: '', status: 1, created_at: '' },
      company: { id: 170, email: 'hr@bytedance.com', nickname: '字节跳动HR', role: 'company' as const, avatar: '', phone: '', status: 1, created_at: '' },
      mentor: { id: 177, email: 'chen@mentor.com', nickname: '陈教授', role: 'mentor' as const, avatar: '', phone: '', status: 1, created_at: '' },
      student: { id: 182, email: 'student1@example.com', nickname: '王小明', role: 'student' as const, avatar: '', phone: '', status: 1, created_at: '' },
    };
    setAuth('dev-token-' + role, mockUsers[role]);
  }`;

const newFunc = `  const [switching, setSwitching] = useState(false);
  async function switchRole(role: 'admin' | 'company' | 'mentor' | 'student') {
    if (switching) return;
    setSwitching(true);
    try {
      if (isAuthenticated) {
        await logout();
      }
      const DEV_ACCOUNTS = {
        admin:   { email: 'admin@example.com',       password: 'admin123' },
        company: { email: 'hr@bytedance.com',        password: 'password123' },
        mentor:  { email: 'chen@mentor.com',         password: 'password123' },
        student: { email: 'student1@example.com',    password: 'password123' },
      };
      const res = await http.post('/auth/login', DEV_ACCOUNTS[role]);
      const { token, refreshToken, user: loginUser } = res.data.data;
      setAuth(token, loginUser, refreshToken);
      alert('角色切换成功: ' + loginUser.nickname);
    } catch (err: any) {
      console.error('[DEV] 角色切换失败:', err);
      alert('切换失败: 请确认后端已启动且种子数据正确');
    } finally {
      setSwitching(false);
    }
  }`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/pages/DevNav.tsx', code);
console.log('Patched DevNav.tsx');
