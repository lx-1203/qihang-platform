const fs = require('fs');
let code = fs.readFileSync('routes/admin.js', 'utf8');

const newRoleDist = `
    const colors = { student: 'bg-primary-500', company: 'bg-blue-500', mentor: 'bg-emerald-500', admin: 'bg-amber-500' };
    const labels = { student: '学生', company: '企业', mentor: '导师', admin: '管理员' };
    const roleDistribution = roleRows.map(r => ({
      role: labels[r.role] || r.role,
      count: r.count,
      pct: Math.round((r.count / totalRows[0].total) * 100),
      color: colors[r.role] || 'bg-gray-500'
    }));
`;

code = code.replace(/const roleDistribution = \{\};[\s\S]*?for \(const r of roleRows\) \{[\s\S]*?roleDistribution\[r\.role\] = r\.count;[\s\S]*?\}/, newRoleDist);
fs.writeFileSync('routes/admin.js', code);
console.log('Patched roleDistribution');
