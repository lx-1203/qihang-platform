const fs = require('fs');

let code = fs.readFileSync('src/pages/student/MyAppointments.tsx', 'utf8');

const regex = /statusConfig: Record<AppointmentStatus, \{ label: string; color: string; bg: string \}> = \{([\s\S]*?)\};/;

const replacement = `statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: '即将开始', color: 'text-primary-600', bg: 'bg-primary-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-100' },
  pending: { label: '待确认', color: 'text-amber-600', bg: 'bg-amber-100' },
  rejected: { label: '已拒绝', color: 'text-red-600', bg: 'bg-red-100' },
};`;

code = code.replace(regex, replacement);

const statusMappingRegex = /status: \(\['pending', 'confirmed'\]\.includes\(a\.status as string\) \? 'upcoming' : a\.status\) as AppointmentStatus,/;
const newStatusMapping = `status: (['confirmed'].includes(a.status as string) ? 'upcoming' : a.status) as AppointmentStatus,`;

code = code.replace(statusMappingRegex, newStatusMapping);

// Also need to fix the activeTab type and buttons because it only shows 'upcoming'
const tabsRegex = /const tabs: \{ key: AppointmentStatus; label: string \}\[\] = \[([\s\S]*?)\];/;
const newTabs = `const tabs: { key: string; label: string }[] = [
  { key: 'upcoming', label: '即将开始' },
  { key: 'pending', label: '待确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消/拒绝' },
];`;

code = code.replace(tabsRegex, newTabs);

const stateRegex = /const \[activeTab, setActiveTab\] = useState<AppointmentStatus>\('upcoming'\);/;
code = code.replace(stateRegex, "const [activeTab, setActiveTab] = useState<string>('upcoming');");

// Filter logic: group rejected with cancelled
const filterRegex = /const filtered = appointments\.filter\(app => app\.status === activeTab\);/;
const newFilter = `const filtered = appointments.filter(app => {
    if (activeTab === 'cancelled') return app.status === 'cancelled' || app.status === 'rejected';
    return app.status === activeTab;
  });`;

code = code.replace(filterRegex, newFilter);

// Fix counts
const countRegex = /acc\[app\.status\] = \(acc\[app\.status\] || 0\) \+ 1;/;
const newCount = `const key = app.status === 'rejected' ? 'cancelled' : app.status;
    acc[key] = (acc[key] || 0) + 1;`;

code = code.replace(countRegex, newCount);

// Default config fallback
const configRegex = /const config = statusConfig\[app\.status\];/;
const newConfig = `const config = statusConfig[app.status] || { label: app.status, color: 'text-gray-500', bg: 'bg-gray-100' };`;
code = code.replace(configRegex, newConfig);

fs.writeFileSync('src/pages/student/MyAppointments.tsx', code);
console.log('Patched MyAppointments');
