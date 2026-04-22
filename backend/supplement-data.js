/**
 * 启航平台 - 数据补充脚本
 *
 * 用于填补数据库中的数据缺口，达到目标数据量：
 * - 学生用户: 13 -> 50 (+37)
 * - 企业账号: 7 -> 20 (+13)
 * - 导师账号: 5 -> 15 (+10)
 * - 预约记录: 30 -> 200 (+170)
 * - 投递记录: 35 -> 500 (+465)
 * - 课程数量: 8 -> 30 (+22)
 *
 * 用法: cd backend && node supplement-data.js
 */

import pool from './db.js';
import bcrypt from 'bcryptjs';

// ============================================================
// 工具函数
// ============================================================
function log(tag, msg) {
  console.log(`  [${tag}] ${msg}`);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function pickMultiple(arr, min, max) {
  const count = randInt(min, max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================
// 数据定义
// ============================================================

// 学校列表（30所）
const SCHOOLS = [
  '北京大学', '清华大学', '复旦大学', '上海交通大学', '浙江大学',
  '南京大学', '中国科学技术大学', '武汉大学', '华中科技大学', '中山大学',
  '四川大学', '西安交通大学', '哈尔滨工业大学', '北京航空航天大学',
  '同济大学', '南开大学', '天津大学', '山东大学', '中南大学', '厦门大学',
  '东南大学', '大连理工大学', '吉林大学', '湖南大学', '华东师范大学',
  '北京理工大学', '华南理工大学', '重庆大学', '电子科技大学', '兰州大学'
];

// 专业列表
const MAJORS = [
  '计算机科学与技术', '软件工程', '人工智能', '数据科学', '电子信息',
  '金融学', '会计学', '工商管理', '市场营销', '法学',
  '新闻传播学', '英语', '数学与应用数学', '物理学', '化学工程与工艺',
  '机械工程', '自动化', '统计学', '经济学', '国际商务'
];

// 年级列表
const GRADES = ['大一', '大二', '大三', '大四', '研一', '研二'];

// 技能池
const SKILL_POOL = [
  'React', 'Vue', 'Angular', 'Python', 'Java', 'Go', 'TypeScript',
  'JavaScript', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
  'Kubernetes', 'Git', 'Node.js', 'Spring Boot', 'Django', 'Flask',
  'TensorFlow', 'PyTorch', 'Linux', 'AWS', 'Excel', 'PowerPoint',
  'Photoshop', 'Figma', 'SEO', '数据分析', '机器学习', 'NLP',
  'C++', 'Rust', 'Swift', 'Kotlin'
];

// 求职意向
const JOB_INTENTIONS = [
  '前端开发工程师', '后端开发工程师', '数据分析师', '产品经理',
  'UI/UX设计师', '算法工程师', '全栈工程师', '运维工程师',
  '测试开发工程师', '嵌入式工程师', '金融分析师', '市场专员',
  '人力资源专员', '运营专员', '项目经理', '技术支持工程师'
];

// 新增企业数据（13家）
const NEW_COMPANIES = [
  { name: '阿里巴巴', industry: '互联网', scale: '10000人以上', city: '杭州', description: '全球领先的互联网公司' },
  { name: '网易', industry: '互联网', scale: '5000-10000人', city: '杭州', description: '中国领先互联网技术公司' },
  { name: '京东', industry: '电商', scale: '10000人以上', city: '北京', description: '自营式电商企业' },
  { name: '美团', industry: '本地生活', scale: '10000人以上', city: '北京', description: '吃喝玩乐全都有' },
  { name: '华为', industry: '通信', scale: '100000人以上', city: '深圳', description: '全球ICT基础设施提供商' },
  { name: '小米', industry: '智能硬件', scale: '10000人以上', city: '北京', description: '智能手机与IoT生态' },
  { name: '携程', industry: '在线旅游', scale: '10000人以上', city: '上海', description: '一站式旅行服务平台' },
  { name: '快手', industry: '短视频', scale: '10000人以上', city: '北京', description: '短视频社交平台' },
  { name: '滴滴出行', industry: '交通出行', scale: '10000人以上', city: '北京', description: '一站式移动出行平台' },
  { name: 'OPPO', industry: '智能硬件', scale: '10000人以上', city: '东莞', description: '智能终端制造商' },
  { name: 'VIVO', industry: '智能硬件', scale: '10000人以上', city: '东莞', description: '智能移动设备品牌' },
  { name: 'Shopee', industry: '电商', scale: '5000-10000人', city: '新加坡', description: '东南亚电商平台' },
  { name: '平安集团', industry: '金融', scale: '100000人以上', city: '深圳', description: '综合金融服务集团' }
];

// 新增导师数据（10人）
const NEW_MENTORS = [
  { name: '刘博士', email: 'liu@mentor.com', title: '前阿里P8架构师', bio: '12年大厂经验，专注于分布式系统设计', expertise: '["系统架构","微服务","高并发"]' },
  { name: '孙老师', email: 'sun@mentor.com', title: '资深HRD', bio: '15年招聘经验，曾服务500强企业', expertise: '["职业规划","简历优化","薪资谈判"]' },
  { name: '周导师', email: 'zhou@mentor.com', title: '前字节产品总监', bio: '8年产品经验，从0到1多款千万级产品', expertise: '["产品经理","需求分析","数据分析"]' },
  { name: '吴教授', email: 'wu@mentor.com', title: '考研辅导专家', bio: '10年考研辅导经验，帮助200+学员上岸985', expertise: '["考研规划","专业课辅导","复试指导"]' },
  { name: '郑女士', email: 'zheng@mentor.com', title: '留学申请顾问', bio: '前新东方留学金牌顾问，擅长英美名校申请', expertise: '["留学文书","选校定位","签证指导"]' },
  { name: '钱老师', email: 'qian@mentor.com', title: 'AI算法专家', bio: '前Google AI研究员，发表顶会论文10+', expertise: '["机器学习","深度学习","NLP"]' },
  { name: '冯顾问', email: 'feng@mentor.com', title: '创业导师', bio: '连续创业者，2次成功退出，天使投资人', expertise: '["创业规划","融资路演","商业模式"]' },
  { name: '陈设计师', email: 'chen2@mentor.com', title: '资深UI/UX设计', bio: '前腾讯设计专家，服务过微信/QQ等产品', expertise: '["UI设计","UX研究","设计系统"]' },
  { name: '韩老师', email: 'han@mentor.com', title: '公务员考试培训师', bio: '8年公考培训经验，行测申论双科名师', expertise: '["行测","申论","面试技巧"]' },
  { name: '杨导师', email: 'yang@mentor.com', title: '心理咨询师', bio: '国家二级心理咨询师，专注职业心理辅导', expertise: '["职业咨询","压力管理","沟通技巧"]' }
];

// 新增课程数据（22门）
const NEW_COURSES = [
  // 技术类 (40% ≈ 9门)
  { title: 'Vue3 + TypeScript 企业级实战', desc: '掌握Vue3 Composition API与TS最佳实践', category: '技术', price: 349 },
  { title: 'Go语言高并发编程精讲', desc: '从入门到精通Golang并发编程', category: '技术', price: 399 },
  { title: '云原生架构设计与实践', desc: 'Docker/Kubernetes/Service Mesh全面解析', category: '技术', price: 499 },
  { title: '前端性能优化深度指南', desc: '从加载到渲染的全链路优化方案', category: '技术', price: 299 },
  { title: 'React Native跨平台开发实战', desc: '一套代码构建iOS/Android应用', category: '技术', price: 379 },
  { title: '数据库设计与SQL调优', desc: '从表结构设计到慢查询优化的完整路径', category: '技术', price: 279 },
  { title: 'DevOps工程化实践', desc: 'CI/CD流水线搭建与自动化运维', category: '技术', price: 449 },
  { title: '网络安全基础与渗透测试', desc: 'Web安全漏洞原理与防护策略', category: '技术', price: 359 },
  { title: '大数据处理技术栈入门', desc: 'Hadoop/Spark/Flink数据处理体系', category: '技术', price: 429 },

  // 求职类 (30% ≈ 7门)
  { title: '秋招冲刺：大厂面试真题解析', desc: '覆盖BAT/TMD等一线互联网公司面试题', category: '求职', price: 599 },
  { title: 'STAR法则：行为面试满分攻略', desc: '用结构化方法回答所有行为面试问题', category: '求职', price: 199 },
  { title: '群面无领导小组讨论技巧', desc: '从角色定位到发言策略的全方位指导', category: '求职', price: 249 },
  { title: 'Offer谈判与薪资评估指南', desc: '了解市场行情，争取最优薪酬包', category: '求职', price: 179 },
  { title: 'LinkedIn个人品牌打造', desc: '如何让猎头和HR主动找到你', category: '求职', price: 159 },
  { title: '实习转正成功率提升秘籍', desc: '从实习生到正式员工的关键动作', category: '求职', price: 229 },
  { title: '行业选择与赛道分析方法论', desc: '如何判断一个行业是否值得进入', category: '求职', price: 269 },

  // 学术类 (15% ≈ 3-4门)
  { title: '考研英语长难句突破', desc: '拆解考研阅读中的核心语法难点', category: '学术', price: 299 },
  { title: '高等数学考研重点精讲', desc: '覆盖数一/数二/数三核心考点', category: '学术', price: 349 },
  { title: '科研论文写作入门', desc: '从选题到发表的全流程指导', category: '学术', price: 399 },
  { title: '文献检索与管理工具使用', desc: 'EndNote/Zotero高效科研利器', category: '学术', price: 149 },

  // 留学类 (10% ≈ 2门)
  { title: 'PS/SOP文书写作工作坊', desc: '打造脱颖而出的申请文书', category: '留学', price: 499 },
  { title: '雅思7分备考冲刺计划', desc: '听说读写四科专项突破', category: '留学', price: 599 },

  // 软技能 (5% ≈ 1门)
  { title: '职场情商与向上管理', desc: '提升职场人际敏感度与影响力', category: '软技能', price: 199 }
];

// 服务类型（预约用）
const SERVICE_TYPES = [
  { type: '职业规划', weight: 30 },
  { type: '简历优化', weight: 25 },
  { type: '面试辅导', weight: 25 },
  { type: '模拟面试', weight: 15 },
  { type: '其他咨询', weight: 5 }
];

// 预约状态分布
const APPOINTMENT_STATUSES = [
  { status: 'completed', weight: 50 },
  { status: 'confirmed', weight: 27 },
  { status: 'cancelled', weight: 17 },
  { status: 'pending', weight: 6 }
];

// 投递状态分布
const RESUME_STATUSES = [
  { status: 'pending', weight: 30 },
  { status: 'viewed', weight: 25 },
  { status: 'interview', weight: 20 },
  { status: 'offered', weight: 15 },
  { status: 'rejected', weight: 10 }
];

// 学生备注模板
const STUDENT_NOTES = [
  '希望了解互联网行业发展方向',
  '需要优化简历突出项目经历',
  '准备秋招面试，想了解大厂面试流程',
  '纠结考研还是直接就业',
  '想转行到技术岗位，需要规划建议',
  '对AI方向感兴趣，想了解入行门槛',
  '想了解外企和国内公司的区别',
  '需要提升面试表达能力',
  '想了解远程工作和自由职业的可能性',
  '对创业感兴趣，想听取建议'
];

// 导师评语模板（已完成预约）
const MENTOR_REMARKS = [
  '学生基础不错，建议多参与实际项目',
  '简历内容丰富但排版需要优化',
  '面试表现良好，注意回答的结构性',
  '目标明确，执行力强，保持即可',
  '建议补充相关领域的实习经历',
  '沟通能力优秀，技术栈需要补强',
  '对行业有深入了解，可以尝试更高目标',
  '需要加强算法和数据结构基础',
  '项目经验丰富，但缺乏系统性的总结',
  '态度积极，学习能力很强，未来可期'
];

// 评价内容模板
const REVIEW_CONTENTS = [
  '收获很大，导师专业有耐心，解答了我的很多困惑',
  '非常满意！导师给出的建议很实用，已经按照建议开始行动了',
  '导师经验丰富，一针见血地指出了我的问题所在',
  '性价比很高，比预期收获更多，强烈推荐',
  '导师很nice，氛围轻松，聊完之后思路清晰了很多',
  '专业度高，针对性强，帮我理清了职业发展方向',
  '时间利用充分，每个问题都得到了详细解答',
  '导师分享了很多行业内幕，对我帮助很大',
  '整体体验很好，会考虑继续预约其他服务',
  '非常专业的辅导，感觉自己的认知提升了一个层次'
];

// ============================================================
// 主函数
// ============================================================
async function main() {
  console.log('\n========================================');
  console.log('  启航平台 - 数据补充脚本');
  console.log('========================================\n');

  let successCount = { students: 0, companies: 0, mentors: 0, courses: 0, appointments: 0, resumes: 0 };
  let errorCount = { students: 0, companies: 0, mentors: 0, courses: 0, appointments: 0, resumes: 0 };

  try {
    // 获取当前密码哈希
    log('初始化', '生成密码哈希...');
    const passwordHash = await bcrypt.hash('password123', 10);

    // ========================================
    // 1. 补充学生数据 (+37人，student14-student50)
    // ========================================
    log('学生', '开始插入37条学生数据...');

    // 先获取现有最大student编号
    const [existingStudents] = await pool.query(
      "SELECT email FROM users WHERE role='student' AND email REGEXP '^student[0-9]+@'"
    );
    let maxStudentNum = 13; // 已有13个学生
    for (const s of existingStudents) {
      const match = s.email.match(/^student(\d+)@/);
      if (match && parseInt(match[1]) > maxStudentNum) {
        maxStudentNum = parseInt(match[1]);
      }
    }

    const newStudentUserIds = [];
    for (let i = maxStudentNum + 1; i <= 50; i++) {
      try {
        const skills = JSON.stringify(pickMultiple(SKILL_POOL, 3, 5));
        const school = randChoice(SCHOOLS);
        const major = randChoice(MAJORS);
        const grade = randChoice(GRADES);
        const intention = randChoice(JOB_INTENTIONS);

        const [ur] = await pool.query(
          `INSERT INTO users (email, password, nickname, role, phone) VALUES (?,?,?,?,?)`,
          [`student${i}@test.com`, passwordHash, `测试学生${i.toString().padStart(2, '0')}`, 'student',
           `137${randInt(10000000, 99999999)}`]
        );
        newStudentUserIds.push(ur.insertId);

        await pool.query(
          `INSERT INTO students (user_id, school, major, grade, skills, job_intention, bio) VALUES (?,?,?,?,?,?,?)`,
          [ur.insertId, school, major, grade, skills, intention,
           `${school}${major}专业${grade}学生，对${intention}方向有浓厚兴趣。`]
        );
        successCount.students++;
      } catch (e) {
        errorCount.students++;
        log('学生', `插入 student${i} 失败: ${e.message}`);
      }
    }
    log('学生', `成功插入 ${successCount.students} 条，失败 ${errorCount.students} 条`);

    // ========================================
    // 2. 补充企业数据 (+13家)
    // ========================================
    log('企业', '开始插入13条企业数据...');

    // 企业名称到英文标识的映射（用于生成唯一邮箱）
    const COMPANY_EMAIL_MAP = {
      '阿里巴巴': 'alibaba', '网易': 'netease', '京东': 'jd',
      '美团': 'meituan', '华为': 'huawei', '小米': 'xiaomi',
      '携程': 'ctrip', '快手': 'kuaishou', '滴滴出行': 'didi',
      'OPPO': 'oppo', 'VIVO': 'vivo', 'Shopee': 'shopee',
      '平安集团': 'pingan'
    };

    let companyIndex = 0;
    for (const comp of NEW_COMPANIES) {
      try {
        const emailPrefix = COMPANY_EMAIL_MAP[comp.name] || `company${companyIndex}`;
        const companyEmail = `${emailPrefix}@company.com`;
        companyIndex++;
        const [ur] = await pool.query(
          `INSERT INTO users (email, password, nickname, role, phone) VALUES (?,?,?,?,?)`,
          [companyEmail, passwordHash, `${comp.name}HR`, 'company',
           `138${randInt(10000000, 99999999)}`]
        );

        await pool.query(
          `INSERT INTO companies (user_id, company_name, logo, industry, scale, website, description, verify_status)
           VALUES (?,?,?,?,?,?,?,'approved')`,
          [ur.insertId, comp.name, '', comp.industry, comp.scale,
           `https://www.${emailPrefix}.com`, comp.description]
        );
        successCount.companies++;
      } catch (e) {
        errorCount.companies++;
        log('企业', `插入 ${comp.name} 失败: ${e.message}`);
      }
    }
    log('企业', `成功插入 ${successCount.companies} 条，失败 ${errorCount.companies} 条`);

    // ========================================
    // 3. 补充导师数据 (+10人)
    // ========================================
    log('导师', '开始插入10条导师数据...');

    for (const mentor of NEW_MENTORS) {
      try {
        const [ur] = await pool.query(
          `INSERT INTO users (email, password, nickname, role, phone) VALUES (?,?,?,?,?)`,
          [mentor.email, passwordHash, mentor.name, 'mentor',
           `139${randInt(10000000, 99999999)}`]
        );

        await pool.query(
          `INSERT INTO mentor_profiles (user_id, name, title, bio, expertise, rating, verify_status, status)
           VALUES (?,?,?,?,?,?,'approved',1)`,
          [ur.insertId, mentor.name, mentor.title, mentor.bio, mentor.expertise,
           parseFloat((randInt(45, 50) / 10).toFixed(1))]
        );
        successCount.mentors++;
      } catch (e) {
        errorCount.mentors++;
        log('导师', `插入 ${mentor.name} 失败: ${e.message}`);
      }
    }
    log('导师', `成功插入 ${successCount.mentors} 条，失败 ${errorCount.mentors} 条`);

    // ========================================
    // 4. 补充课程数据 (+22门)
    // ========================================
    log('课程', '开始插入22条课程数据...');

    const [allMentorIds] = await pool.query("SELECT user_id, name FROM mentor_profiles WHERE status=1");
    if (allMentorIds.length === 0) {
      log('课程', '警告: 无可用导师，跳过课程创建');
    } else {
      for (const course of NEW_COURSES) {
        try {
          const mentor = randChoice(allMentorIds);
          await pool.query(
            `INSERT INTO courses (mentor_id, mentor_name, title, description, category, difficulty, status, rating, rating_count, views)
             VALUES (?,?,?,?,?,?,'active',?,?,?)`,
            [mentor.user_id, mentor.name, course.title, course.desc, course.category,
             randChoice(['beginner', 'intermediate', 'advanced']),
             parseFloat((randInt(38, 49) / 10).toFixed(1)),
             randInt(15, 180), randInt(200, 8000)]
          );
          successCount.courses++;
        } catch (e) {
          errorCount.courses++;
          log('课程', `插入 ${course.title} 失败: ${e.message}`);
        }
      }
    }
    log('课程', `成功插入 ${successCount.courses} 条，失败 ${errorCount.courses} 条`);

    // ========================================
    // 5. 补充预约数据 (+170条)
    // ========================================
    log('预约', '开始插入170条预约数据...');

    // 获取所有学生ID（包括已有的和新插入的）
    const [allStudentIds] = await pool.query("SELECT user_id FROM students");
    if (allStudentIds.length === 0 || allMentorIds.length === 0) {
      log('预约', '警告: 无学生或导师数据，跳过预约创建');
    } else {
      // 为每个学生生成3-8条预约
      for (const student of allStudentIds) {
        const numAppts = randInt(3, 8);
        for (let a = 0; a < numAppts; a++) {
          try {
            // 加权随机选择状态
            const statusRand = Math.random() * 100;
            let cumulative = 0;
            let selectedStatus = APPOINTMENT_STATUSES[0].status;
            for (const s of APPOINTMENT_STATUSES) {
              cumulative += s.weight;
              if (statusRand <= cumulative) {
                selectedStatus = s.status;
                break;
              }
            }

            // 加权随机选择服务类型
            const serviceRand = Math.random() * 100;
            cumulative = 0;
            let selectedService = SERVICE_TYPES[0].type;
            for (const svc of SERVICE_TYPES) {
              cumulative += svc.weight;
              if (serviceRand <= cumulative) {
                selectedService = svc.type;
                break;
              }
            }

            const daysAgo = randInt(0, 90);
            const dt = new Date();
            dt.setDate(dt.getDate() - daysAgo);
            dt.setHours(randInt(9, 20), randChoice([0, 30]), 0, 0);

            const fee = randChoice([99, 149, 199, 249, 299, 399]);
            const isCompleted = selectedStatus === 'completed';

            await pool.query(
              `INSERT INTO appointments (student_id, mentor_id, appointment_time, duration, status, note, mentor_remark, service_title, fee, review_rating, review_content)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              [
                student.user_id,
                randChoice(allMentorIds).user_id,
                dt.toISOString().slice(0, 19).replace('T', ' '),
                randChoice([30, 45, 60, 90]),
                selectedStatus,
                randChoice(STUDENT_NOTES),
                isCompleted ? randChoice(MENTOR_REMARKS) : null,
                selectedService,
                fee,
                isCompleted ? parseFloat((randInt(40, 50) / 10).toFixed(1)) : null,
                isCompleted ? randChoice(REVIEW_CONTENTS) : null
              ]
            );
            successCount.appointments++;

            // 达到目标数量后停止
            if (successCount.appointments >= 170) break;
          } catch (e) {
            errorCount.appointments++;
          }
        }
        if (successCount.appointments >= 170) break;
      }
    }
    log('预约', `成功插入 ${successCount.appointments} 条，失败 ${errorCount.appointments} 条`);

    // ========================================
    // 6. 补充投递数据 (+465条)
    // ========================================
    log('投递', '开始插入465条投递数据...');

    const [jobIds] = await pool.query("SELECT id FROM jobs WHERE status='active'");
    if (allStudentIds.length === 0 || jobIds.length === 0) {
      log('投递', '警告: 无学生或职位数据，跳过投递创建');
    } else {
      // 为每个学生投递10-20个职位
      for (const student of allStudentIds) {
        const numApps = randInt(10, 20);
        const usedJobs = new Set();

        for (let a = 0; a < numApps && usedJobs.size < jobIds.length; a++) {
          try {
            // 选择未使用过的职位
            let jobId;
            let attempts = 0;
            do {
              jobId = randChoice(jobIds).id;
              attempts++;
            } while (usedJobs.has(jobId) && attempts < 50);

            if (usedJobs.has(jobId)) continue;
            usedJobs.add(jobId);

            // 加权随机选择状态
            const statusRand = Math.random() * 100;
            let cumulative = 0;
            let selectedStatus = RESUME_STATUSES[0].status;
            for (const s of RESUME_STATUSES) {
              cumulative += s.weight;
              if (statusRand <= cumulative) {
                selectedStatus = s.status;
                break;
              }
            }

            await pool.query(
              `INSERT INTO resumes (student_id, job_id, status) VALUES (?,?,?)`,
              [student.user_id, jobId, selectedStatus]
            );
            successCount.resumes++;

            // 达到目标数量后停止
            if (successCount.resumes >= 465) break;
          } catch (e) {
            errorCount.resumes++;
          }
        }
        if (successCount.resumes >= 465) break;
      }
    }
    log('投递', `成功插入 ${successCount.resumes} 条，失败 ${errorCount.resumes} 条`);

  } catch (err) {
    console.error('\n  脚本执行出错:', err.message);
    process.exit(1);
  }

  // ========================================
  // 最终统计
  // ========================================
  console.log('\n========================================');
  console.log('  数据补充完成 - 统计汇总');
  console.log('========================================\n');

  const stats = [
    { label: '学生用户', target: '+37', actual: `+${successCount.students}`, errors: errorCount.students },
    { label: '企业账号', target: '+13', actual: `+${successCount.companies}`, errors: errorCount.companies },
    { label: '导师账号', target: '+10', actual: `+${successCount.mentors}`, errors: errorCount.mentors },
    { label: '课程数量', target: '+22', actual: `+${successCount.courses}`, errors: errorCount.courses },
    { label: '预约记录', target: '+170', actual: `+${successCount.appointments}`, errors: errorCount.appointments },
    { label: '投递记录', target: '+465', actual: `+${successCount.resumes}`, errors: errorCount.resumes },
  ];

  console.log(`  ${'数据类型'.padEnd(12)} ${'目标'.padEnd(10)} ${'实际插入'.padEnd(12)} ${'失败'.padEnd(8)}`);
  console.log('  ' + '-'.repeat(46));
  for (const s of stats) {
    console.log(`  ${s.label.padEnd(12)} ${s.target.padEnd(10)} ${s.actual.padEnd(12)} ${String(s.errors).padEnd(8)}`);
  }

  console.log('\n  数据补充脚本执行完毕!\n');

  // 关闭连接池
  await pool.end();
}

// 执行主函数
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
