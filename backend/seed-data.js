/**
 * 启航平台 - 全量数据导入脚本
 *
 * 从 D:\6\xiangmu1\database\ 的4个新东方SQL文件提取真实数据，
 * 导入到 qihang_platform 数据库，同时生成完整的种子数据。
 *
 * 用法: cd backend && node seed-data.js
 */

import pool from './db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = 'D:\\6\\xiangmu1\\database';

const MYSQL = '"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe"';
const DB_PASS = '@Hyp5022940';
const DB_NAME = 'qihang_platform';

// ============================================================
// 工具函数
// ============================================================
function log(tag, msg) { console.log(`  [${tag}] ${msg}`); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    .toISOString().split('T')[0];
}

// 根据职位标题智能推断分类（与前端 CATEGORY_TAGS 保持一致：技术/产品/运营/设计/市场/销售/职能）
function inferJobCategory(title) {
  const t = String(title);
  if (/前端|后端|Java|Python|算法|开发|架构师|测试|运维|DevOps|嵌入式|安全|大数据|AI|人工智能|深度学习|NLP|机器学习|C\+\+|Golang|Rust|全栈|数据库|云计算|数据工程|后端|移动端|iOS|Android|Go |PHP|Node|Ruby/.test(t)) return '技术';
  if (/产品|PM |产品经理|Product/.test(t)) return '产品';
  if (/运营|内容运营|社群|用户增长|活动策划|新媒体|社区|SEO|SEM/.test(t)) return '运营';
  if (/设计|UI|UX|视觉|交互|创意|美术|动效/.test(t)) return '设计';
  if (/市场|品牌|营销|推广|公关|媒介/.test(t)) return '市场';
  if (/销售|BD|商务拓展|客户经理|大客户|渠道|Sales/.test(t)) return '销售';
  if (/人力|行政|财务|法务|合规|HR|行政|秘书|助理|前台|人事|总助|总裁办/.test(t)) return '职能';
  if (/教育|教学|老师|讲师|管培|培训/.test(t)) return '职能';
  return '技术'; // 默认归入技术
}

// 解析SQL文件中的所有 INSERT INTO tableName (...) VALUES ...; 块
function extractInsertBlocks(sqlContent, tableName) {
  const blocks = [];
  const regex = new RegExp(
    `INSERT\\s+INTO\\s+${tableName}\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);`,
    'gi'
  );
  let m;
  while ((m = regex.exec(sqlContent)) !== null) {
    blocks.push({ columns: m[1], values: m[2] });
  }
  return blocks;
}

// 从 INSERT 值块中解析出每一行 (支持 NULL 和嵌套引号)
function parseRows(valuesBlock) {
  const rows = [];
  let depth = 0, inQuote = false, row = '', i = 0;
  while (i < valuesBlock.length) {
    const ch = valuesBlock[i];
    if (ch === "'" && !inQuote) { inQuote = true; row += ch; }
    else if (ch === "'" && inQuote) {
      if (valuesBlock[i + 1] === "'") { row += "''"; i++; }
      else { inQuote = false; row += ch; }
    }
    else if (ch === '(' && !inQuote) { depth++; if (depth === 1) row = ''; else row += ch; }
    else if (ch === ')' && !inQuote) { depth--; if (depth === 0) rows.push(row.trim()); else row += ch; }
    else if (depth > 0) { row += ch; }
    i++;
  }
  return rows;
}

// 解析单行值为数组 (支持 'str', NULL, 数字, TRUE/FALSE)
function parseValues(rowStr) {
  const vals = [];
  let i = 0;
  while (i < rowStr.length) {
    // 跳过空白和逗号
    while (i < rowStr.length && /[\s,]/.test(rowStr[i])) i++;
    if (i >= rowStr.length) break;

    if (rowStr[i] === "'") {
      // 字符串
      let s = '';
      i++; // skip opening quote
      while (i < rowStr.length) {
        if (rowStr[i] === "'" && rowStr[i + 1] === "'") { s += "'"; i += 2; }
        else if (rowStr[i] === "'") { i++; break; }
        else { s += rowStr[i]; i++; }
      }
      vals.push(s);
    } else if (rowStr.substring(i, i + 4) === 'NULL') {
      vals.push(null);
      i += 4;
    } else if (rowStr.substring(i, i + 4) === 'TRUE') {
      vals.push(true);
      i += 4;
    } else if (rowStr.substring(i, i + 5) === 'FALSE') {
      vals.push(false);
      i += 5;
    } else {
      // 数字或其他
      let tok = '';
      while (i < rowStr.length && !/[,)\s]/.test(rowStr[i])) { tok += rowStr[i]; i++; }
      vals.push(tok.trim());
    }
  }
  return vals;
}

// 从列名列表获取字段名数组
function parseColumns(colStr) {
  return colStr.split(',').map(c => c.trim().replace(/`/g, ''));
}

// ============================================================
// Phase 0: 清空数据（保留表结构）
// ============================================================
async function truncateAll() {
  const tag = '清空';
  log(tag, '清空所有业务数据表...');

  // 按外键依赖顺序清空
  const tables = [
    'favorites', 'notifications', 'resumes', 'appointments',
    'study_abroad_offers', 'study_abroad_consultants', 'study_abroad_timeline',
    'articles', 'testimonials', 'resources', 'competitions',
    'students', 'mentor_profiles', 'jobs', 'courses', 'companies',
    'universities', 'programs', 'audit_logs', 'search_histories',
    'chat_messages', 'chat_conversations', 'mentor_resources',
    'token_blacklist', 'student_portraits', 'platform_features',
    'article_categories', 'campus_timeline', 'site_configs',
  ];

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tables) {
    try { await pool.query(`TRUNCATE TABLE ${t}`); } catch {}
  }
  // users 表保留 admin 账号
  try { await pool.query("DELETE FROM users WHERE id > 1"); } catch {}
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  log(tag, '所有表已清空');
}

// ============================================================
// Phase 1: 从 xindongfang_COMPLETE_DATABASE.sql 导入
// ============================================================
async function importXindongfang() {
  const tag = '新东方';
  log(tag, '读取 xindongfang_COMPLETE_DATABASE.sql ...');
  const content = fs.readFileSync(path.join(DB_DIR, 'xindongfang_COMPLETE_DATABASE.sql'), 'utf-8');

  // --- 1a. 大学 ---
  log(tag, '导入大学...');
  const countryMap = {
    1:'us',2:'uk',3:'ca',4:'au',5:'nz',6:'jp',7:'kr',8:'hk',9:'sg',
    10:'de',11:'fr',12:'nl',13:'ie',14:'it',15:'es',16:'ch',17:'ru'
  };
  const regionMap = {
    'us':'北美','uk':'欧洲','ca':'北美','au':'大洋洲','nz':'大洋洲',
    'jp':'亚洲','kr':'亚洲','hk':'亚洲','sg':'亚洲','de':'欧洲',
    'fr':'欧洲','nl':'欧洲','ie':'欧洲','it':'欧洲','es':'欧洲',
    'ch':'欧洲','ru':'欧洲','my':'亚洲'
  };

  let uniCount = 0;
  for (const block of extractInsertBlocks(content, 'universities')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };
      const countryId = get('country_id');
      const country = countryMap[Number(countryId)] || 'us';
      const region = regionMap[country] || '其他';
      const qs = get('ranking_qs');
      const usnews = get('ranking_usnews');
      try {
        await pool.query(
          `INSERT INTO universities (name_zh, name_en, region, country, city, qs_ranking, us_news_ranking, description, highlights, status)
           VALUES (?,?,?, ?,?, ?,?, ?,?,'active')`,
          [
            get('name_cn') || '', get('name_en') || '', region, country,
            get('location') || '', qs == null ? null : Number(qs), usnews == null ? null : Number(usnews),
            `${get('university_type') || ''}大学`,
            JSON.stringify((get('highlights') || '').split(/[、,;]/).filter(Boolean).slice(0, 5)),
          ]
        );
        uniCount++;
      } catch (e) { /* 跳过重复 */ }
    }
  }
  log(tag, `导入 ${uniCount} 所大学`);

  // --- 1b. 顾问 ---
  log(tag, '导入留学顾问...');
  const cn2code = {'美国':'us','英国':'uk','加拿大':'ca','澳大利亚':'au','新西兰':'nz','日本':'jp','韩国':'kr','中国香港':'hk','香港':'hk','新加坡':'sg','德国':'de','法国':'fr','荷兰':'nl','爱尔兰':'ie','欧洲':'eu','亚洲':'sg','马来西亚':'my'};
  let consulCount = 0;
  for (const block of extractInsertBlocks(content, 'consultants')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };
      const countries = (get('specialty_countries') || '').split(',');
      const mainCountry = cn2code[(countries[0] || '').trim()] || 'us';
      const schoolList = (get('success_cases') || '').split(',');
      try {
        await pool.query(
          `INSERT INTO study_abroad_consultants (name, title, specialty, experience, education, success_cases, country, description, status)
           VALUES (?,?,?,?,?,?,?,?,'active')`,
          [
            get('name') || '', get('title') || '',
            JSON.stringify(countries.map(c => c.trim()).slice(0, 6)),
            get('experience_years') || '5年', get('education_background') || '',
            schoolList.length * randInt(15, 40), mainCountry,
            `${get('title')||''}，${get('education_background')||''}背景，擅长${get('specialty_countries')||''}留学申请`,
          ]
        );
        consulCount++;
      } catch (e) {}
    }
  }
  log(tag, `导入 ${consulCount} 位顾问`);

  // --- 1c. 录取案例 ---
  log(tag, '导入录取案例...');
  const caseCn2code = {'美国':'us','英国':'uk','加拿大':'ca','澳大利亚':'au','新西兰':'nz','日本':'jp','韩国':'kr','中国香港':'hk','香港':'hk','新加坡':'sg','德国':'de','法国':'fr','荷兰':'nl','爱尔兰':'ie'};
  let caseCount = 0;
  for (const block of extractInsertBlocks(content, 'case_details')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };
      const country = get('country') || '';
      const code = caseCn2code[country] || 'us';
      const bg = get('student_background') || '';
      const gpaM = String(bg).match(/GPA[:\s]*([\d.]+)/);
      const toeflM = String(bg).match(/托福[:\s]*(\d+)/);
      const ieltsM = String(bg).match(/雅思[:\s]*([\d.]+)/);
      const greM = String(bg).match(/GRE[:\s]*(\d+)/);
      try {
        await pool.query(
          `INSERT INTO study_abroad_offers (student_name, background, gpa, toefl, ielts, gre, result, country, school, program, scholarship, story, date, tags, likes, status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')`,
          [
            get('student_name') || '同学', bg, gpaM ? gpaM[1] : '',
            toeflM ? Number(toeflM[1]) : null, ieltsM ? parseFloat(ieltsM[1]) : null,
            greM ? Number(greM[1]) : null,
            `${get('university_cn')||''} ${get('major')||''}录取`, code,
            get('university_cn') || '', `${get('major')||''} (${get('degree_level')||'硕士'})`,
            get('is_elite_case') === true ? '优秀奖学金' : '',
            `${get('highlights')||''}。${get('difficulty')||''}`,
            randDate(new Date('2025-06-01'), new Date('2026-03-31')),
            JSON.stringify([get('degree_level')||'硕士', country, get('is_elite_case') === true ? '精英案例' : '成功案例']),
            randInt(5, 200),
          ]
        );
        caseCount++;
      } catch (e) {}
    }
  }
  log(tag, `导入 ${caseCount} 条录取案例`);

  // --- 1d. 文章 ---
  log(tag, '导入文章...');
  const catMap = {'成功案例':'留学资讯','排名资讯':'留学资讯','申请攻略':'留学攻略','院校解读':'院校解读','签证政策':'留学资讯','专业解析':'专业解读','考试备考':'考试攻略','生活指南':'留学攻略','录取资讯':'留学资讯','院校介绍':'院校解读','签证指南':'留学资讯'};
  let artCount = 0;
  for (const block of extractInsertBlocks(content, 'articles')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };
      try {
        await pool.query(
          `INSERT INTO articles (title, summary, content, category, author, view_count, status)
           VALUES (?,?,?,?,?,?,'published')`,
          [
            get('title') || '', get('summary') || '',
            `${get('summary')||''}。本文将为您详细解析${get('country')||''}留学相关的${get('category')||''}信息，包括申请流程、注意事项、时间规划等关键要点，帮助您更好地准备留学申请。`,
            catMap[get('category')] || '留学资讯',
            `${get('country')||''}留学编辑部`, randInt(100, 5000),
          ]
        );
        artCount++;
      } catch (e) {}
    }
  }
  log(tag, `导入 ${artCount} 篇文章`);
}

// ============================================================
// Phase 2: 从 XDF_CAMPUS_ULTIMATE_DATABASE.sql 导入职位
// ============================================================
async function importCampusJobs() {
  const tag = '校园招聘';
  log(tag, '读取 XDF_CAMPUS_ULTIMATE_DATABASE.sql ...');
  const content = fs.readFileSync(path.join(DB_DIR, 'XDF_CAMPUS_ULTIMATE_DATABASE.sql'), 'utf-8');

  // 先解析 location 和 category 映射
  const locations = {}, categories = {}, departments = {};
  for (const block of extractInsertBlocks(content, 'locations')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const idx = cols.indexOf('city');
      if (idx >= 0 && v[0]) locations[v[0]] = v[0];
    }
  }
  for (const block of extractInsertBlocks(content, 'job_categories')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const nameIdx = cols.indexOf('category_name');
      if (nameIdx >= 0 && v[nameIdx]) categories[v[0]] = v[nameIdx];
    }
  }

  // 新东方作为企业 — 需要先创建企业用户
  // 查是否有新东方企业
  const [xdfCompCheck] = await pool.query("SELECT id FROM companies WHERE company_name LIKE '%新东方%' LIMIT 1");
  let companyId;
  if (xdfCompCheck.length > 0) {
    companyId = xdfCompCheck[0].id;
  } else {
    // 创建新东方企业用户
    const [xdfUser] = await pool.query(
      `INSERT INTO users (email, password, nickname, role, phone) VALUES (?,?,?,?,?)`,
      ['hr@xdf.cn', '$2a$10$NxJ9KHGxYqLz8qI5WQOKeuPzQYLQxH5F3k6W1W7Z9KxJPQhGQCLSC', '新东方HR', 'company', '13800000001']
    );
    const [xdfComp] = await pool.query(
      `INSERT INTO companies (user_id, company_name, logo, industry, scale, website, description, verify_status)
       VALUES (?,?,?,?,?,?,?,'approved')`,
      [xdfUser.insertId, '新东方教育科技集团', '', '教育', '10000人以上', 'https://www.xdf.cn', '新东方教育科技集团是中国著名的教育机构']
    );
    companyId = xdfComp.insertId;
  }

  const jobTypeMap = { '全职': '社招', '26校招': '校招', '校园招聘': '校招', '实习': '实习', '实习生招聘': '实习', '社会招聘': '社招' };

  let jobCount = 0;
  for (const block of extractInsertBlocks(content, 'campus_jobs')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };

      const title = get('job_title');
      if (!title) continue;

      // 从标题中提取城市
      const cityMatch = String(title).match(/^([^-]+)/);
      const city = cityMatch ? cityMatch[1] : '北京';
      const recruitmentType = get('recruitment_type') || '校园招聘';
      const jobType = jobTypeMap[recruitmentType] || '校招';

      try {
        await pool.query(
          `INSERT INTO jobs (title, company_id, company_name, location, salary, type, category, description, requirements, urgent, status, view_count)
           VALUES (?,?,?,?,?,?,?,?,?,?,'active',?)`,
          [
            title, companyId, '新东方教育科技集团', city,
            get('salary_range') || '12K-20K', jobType,
            inferJobCategory(title), get('job_description') || '', get('requirements') || '',
            randInt(0, 1), randInt(50, 5000),
          ]
        );
        jobCount++;
      } catch (e) {}
    }
  }
  log(tag, `导入 ${jobCount} 个职位`);
}

// ============================================================
// Phase 3: 从 XDF_ULTIMATE_DATABASE.sql 导入大文件数据
// ============================================================
async function importUltimate() {
  const tag = '终极版';
  log(tag, '读取 XDF_ULTIMATE_DATABASE.sql (8.2MB)...');
  const content = fs.readFileSync(path.join(DB_DIR, 'XDF_ULTIMATE_DATABASE.sql'), 'utf-8');

  // --- 3a. 大学（增强版） ---
  log(tag, '导入增强版大学...');
  const countryMap = {
    1:'us',2:'uk',3:'ca',4:'au',5:'nz',6:'jp',7:'kr',8:'hk',9:'sg',
    10:'de',11:'fr',12:'nl',13:'ie',14:'it',15:'es',16:'ch',17:'ru',18:'my'
  };
  const regionMap = {
    'us':'北美','uk':'欧洲','ca':'北美','au':'大洋洲','nz':'大洋洲',
    'jp':'亚洲','kr':'亚洲','hk':'亚洲','sg':'亚洲','de':'欧洲',
    'fr':'欧洲','nl':'欧洲','ie':'欧洲','it':'欧洲','es':'欧洲',
    'ch':'欧洲','ru':'欧洲','my':'亚洲'
  };

  // 获取已有大学名称
  const [existing] = await pool.query('SELECT name_zh FROM universities');
  const existingNames = new Set(existing.map(u => u.name_zh));

  let uniCount = 0;
  for (const block of extractInsertBlocks(content, 'universities')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };
      const nameCn = get('name_cn');
      if (!nameCn || existingNames.has(nameCn)) continue;
      existingNames.add(nameCn);

      const countryId = get('country_id');
      const country = countryMap[Number(countryId)] || 'us';
      const region = regionMap[country] || '其他';
      const qs = get('ranking_qs');

      try {
        await pool.query(
          `INSERT INTO universities (name_zh, name_en, region, country, city, qs_ranking, us_news_ranking, description, highlights, status)
           VALUES (?,?,?,?,?,?,?,?,?,'active')`,
          [
            nameCn, get('name_en') || '', region, country,
            get('location') || '', qs == null ? null : Number(qs),
            get('ranking_usnews') == null ? null : Number(get('ranking_usnews')),
            `${get('university_type')||''}大学，建校${get('founded_year')||''}年`,
            JSON.stringify((get('key_majors') || '').split(/[、,]/).filter(Boolean).slice(0, 5)),
          ]
        );
        uniCount++;
      } catch (e) {}
    }
  }
  log(tag, `导入 ${uniCount} 所增强版大学`);

  // --- 3b. 录取案例（大量） ---
  log(tag, '导入大量录取案例...');
  const cn2code = {'美国':'us','英国':'uk','加拿大':'ca','澳大利亚':'au','新西兰':'nz','日本':'jp','韩国':'kr','中国香港':'hk','香港':'hk','新加坡':'sg','德国':'de','法国':'fr','荷兰':'nl','爱尔兰':'ie'};
  let caseCount = 0;
  const batchSize = 500;
  let batchValues = [];

  for (const block of extractInsertBlocks(content, 'case_details')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };

      const country = get('country') || '';
      const code = cn2code[country] || 'us';
      const major = get('major') || '';
      const degree = get('degree_level') || '硕士';
      const gpa = get('gpa') || '';
      const langScore = get('language_score') || '';
      const testScore = get('standardized_test') || '';

      batchValues.push([
        get('student_name') || '同学',
        get('student_background') || `GPA:${gpa}, ${langScore}`,
        gpa, langScore ? Number(String(langScore).match(/\d+/)?.[0]) : null, null,
        testScore ? Number(String(testScore).match(/\d+/)?.[0]) : null,
        `${get('university_cn')||''} ${major} ${degree}录取`, code,
        get('university_cn') || '', `${major} (${degree})`, '',
        `${get('difficulty')||''}`, randDate(new Date('2025-01-01'), new Date('2026-03-31')),
        JSON.stringify([degree, country]), randInt(5, 200),
      ]);

      if (batchValues.length >= batchSize) {
        const placeholders = batchValues.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'active\')').join(',');
        try {
          await pool.query(
            `INSERT INTO study_abroad_offers (student_name,background,gpa,toefl,ielts,gre,result,country,school,program,scholarship,story,date,tags,likes,status) VALUES ${placeholders}`,
            batchValues.flat()
          );
          caseCount += batchValues.length;
        } catch (e) {}
        batchValues = [];
      }
    }
  }
  // flush remaining
  if (batchValues.length > 0) {
    const placeholders = batchValues.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'active\')').join(',');
    try {
      await pool.query(
        `INSERT INTO study_abroad_offers (student_name,background,gpa,toefl,ielts,gre,result,country,school,program,scholarship,story,date,tags,likes,status) VALUES ${placeholders}`,
        batchValues.flat()
      );
      caseCount += batchValues.length;
    } catch (e) {}
  }
  log(tag, `导入 ${caseCount} 条录取案例`);

  // --- 3c. 文章（大量） ---
  log(tag, '导入大量文章...');
  const artCatMap = {'申请攻略':'留学攻略','院校介绍':'院校解读','签证指南':'留学资讯','排名资讯':'留学资讯','成功案例':'留学资讯','生活指南':'留学攻略','专业解析':'专业解读','考试攻略':'考试攻略'};
  let artCount = 0;
  batchValues = [];

  for (const block of extractInsertBlocks(content, 'articles')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };

      batchValues.push([
        get('title') || '', get('content') ? String(get('content')).substring(0, 500) : '',
        get('content') || '', artCatMap[get('category')] || '留学资讯',
        get('author') || '编辑部', Number(get('view_count')) || randInt(100, 5000),
      ]);

      if (batchValues.length >= batchSize) {
        const placeholders = batchValues.map(() => '(?,?,?,?,?,?,\'published\')').join(',');
        try {
          await pool.query(
            `INSERT INTO articles (title,summary,content,category,author,view_count,status) VALUES ${placeholders}`,
            batchValues.flat()
          );
          artCount += batchValues.length;
        } catch (e) {}
        batchValues = [];
      }
    }
  }
  if (batchValues.length > 0) {
    const placeholders = batchValues.map(() => '(?,?,?,?,?,?,\'published\')').join(',');
    try {
      await pool.query(
        `INSERT INTO articles (title,summary,content,category,author,view_count,status) VALUES ${placeholders}`,
        batchValues.flat()
      );
      artCount += batchValues.length;
    } catch (e) {}
  }
  log(tag, `导入 ${artCount} 篇文章`);
}

// ============================================================
// Phase 4: 基础种子数据
// ============================================================
async function seedBaseData() {
  const tag = '种子';

  // --- 4a. 用户 ---
  log(tag, '创建用户...');

  // admin 已存在 (id=1)
  // 创建企业用户
  const companies = [
    { email: 'hr@bytedance.com', nick: '字节跳动HR', role: 'company', company: '字节跳动', industry: '互联网', scale: '10000人以上', loc: '北京', web: 'https://www.bytedance.com' },
    { email: 'hr@tencent.com', nick: '腾讯HR', role: 'company', company: '腾讯', industry: '互联网', scale: '10000人以上', loc: '深圳', web: 'https://www.tencent.com' },
    { email: 'hr@baidu.com', nick: '百度HR', role: 'company', company: '百度', industry: '互联网', scale: '10000人以上', loc: '北京', web: 'https://www.baidu.com' },
    { email: 'hr@mihoyo.com', nick: '米哈游HR', role: 'company', company: '米哈游', industry: '游戏', scale: '5000-10000人', loc: '上海', web: 'https://www.mihoyo.com' },
    { email: 'hr@xiaohongshu.com', nick: '小红书HR', role: 'company', company: '小红书', industry: '互联网', scale: '5000-10000人', loc: '上海', web: 'https://www.xiaohongshu.com' },
    { email: 'hr@unilever.com', nick: '联合利华HR', role: 'company', company: '联合利华', industry: '快消', scale: '10000人以上', loc: '上海', web: 'https://www.unilever.com' },
  ];

  // 实时生成密码哈希
  const passwordHash = await bcrypt.hash('password123', 10);

  for (const c of companies) {
    const [ur] = await pool.query(
      `INSERT INTO users (email, password, nickname, role, phone) VALUES (?,?,?,?,?)`,
      [c.email, passwordHash, c.nick, c.role, `138${randInt(10000000, 99999999)}`]
    );
    await pool.query(
      `INSERT INTO companies (user_id, company_name, industry, scale, website, description, verify_status)
       VALUES (?,?,?,?,?,?,'approved')`,
      [ur.insertId, c.company, c.industry, c.scale, c.web, `${c.company}是中国领先的${c.industry}企业`]
    );
  }

  // 导师用户
  const mentors = [
    { email: 'chen@mentor.com', nick: '陈教授', bio: '清华大学计算机系教授，AI方向专家' },
    { email: 'zhang@mentor.com', nick: '张博士', bio: '北大金融学博士，10年行业经验' },
    { email: 'wang@mentor.com', nick: '王总监', bio: '前字节跳动技术总监，15年互联网经验' },
    { email: 'li@mentor.com', nick: '李老师', bio: '资深考研辅导专家，辅导学员超过500人' },
    { email: 'zhao@mentor.com', nick: '赵女士', bio: '海归MBA，职业规划与面试辅导专家' },
  ];
  for (const m of mentors) {
    const [ur] = await pool.query(
      `INSERT INTO users (email, password, nickname, role, phone) VALUES (?,?,?,?,?)`,
      [m.email, passwordHash, m.nick, 'mentor', `139${randInt(10000000, 99999999)}`]
    );
    await pool.query(
      `INSERT INTO mentor_profiles (user_id, name, title, bio, expertise, rating, verify_status, status)
       VALUES (?,?,?,?,?,?,'approved',1)`,
      [ur.insertId, m.nick, '资深导师', m.bio,
       JSON.stringify(['职业规划','面试辅导','简历优化','技术指导']),
       randInt(45, 50)/10]
    );
  }

  // 学生用户
  const schools = ['北京大学','清华大学','浙江大学','复旦大学','上海交通大学','南京大学','武汉大学','中山大学','华中科技大学','同济大学','东南大学','厦门大学'];
  const majors = ['计算机科学与技术','软件工程','数据科学','人工智能','电子信息工程','金融学','会计学','市场营销','工商管理','英语','法学','机械工程'];
  const grades = ['大一','大二','大三','大四','研一','研二'];
  const skillPool = ['React','Vue','Python','Java','Go','TypeScript','MySQL','Docker','Git','Node.js','Spring Boot','TensorFlow'];
  const intentions = ['前端开发工程师','后端开发工程师','数据分析师','产品经理','UI设计师','算法工程师','全栈工程师','运维工程师'];
  const studentNames = ['王小明','李思琪','张伟','刘洋','陈晨','杨帆','赵雨晴','孙磊','周佳','吴昊天','郑思远','黄梓涵'];

  const studentUserIds = [];
  for (let i = 0; i < 12; i++) {
    const [ur] = await pool.query(
      `INSERT INTO users (email, password, nickname, role, phone) VALUES (?,?,?,?,?)`,
      [`student${i+1}@example.com`, passwordHash, studentNames[i], 'student', `137${randInt(10000000, 99999999)}`]
    );
    studentUserIds.push(ur.insertId);
    const skills = JSON.stringify(Array.from({length: randInt(2, 5)}, () => randChoice(skillPool)));
    await pool.query(
      `INSERT INTO students (user_id, school, major, grade, skills, job_intention, bio) VALUES (?,?,?,?,?,?,?)`,
      [ur.insertId, randChoice(schools), randChoice(majors), randChoice(grades), skills, randChoice(intentions),
       `${schools[i]}${majors[i]}专业学生，对${randChoice(intentions)}方向有浓厚兴趣。`]
    );
  }

  // --- 4b. 课程 ---
  log(tag, '创建课程...');
  const courseData = [
    { title: 'React 19 全栈开发实战', price: 299, desc: '从零到一学习React 19', category: '技术' },
    { title: 'Python数据分析入门到精通', price: 199, desc: '掌握数据分析核心技能', category: '技术' },
    { title: '秋招面试突击班', price: 499, desc: '大厂面试技巧与真题讲解', category: '求职' },
    { title: '简历优化与职业规划', price: 99, desc: '打造HR一眼看中的简历', category: '求职' },
    { title: 'Spring Boot企业级开发', price: 349, desc: '企业级Java后端开发', category: '技术' },
    { title: '产品经理入门指南', price: 199, desc: '从学生到产品经理的进阶之路', category: '求职' },
    { title: '算法与数据结构精讲', price: 399, desc: '面试必考算法题精讲', category: '技术' },
    { title: '职场沟通与表达技巧', price: 149, desc: '提升职场软实力', category: '职场' },
  ];
  const [mentorIds] = await pool.query("SELECT user_id FROM mentor_profiles");
  for (let i = 0; i < courseData.length; i++) {
    const c = courseData[i];
    const mentor = randChoice(mentorIds);
    const [mentorInfo] = await pool.query('SELECT name FROM mentor_profiles WHERE user_id = ?', [mentor.user_id]);
    const mentorName = mentorInfo[0]?.name || '导师';
    await pool.query(
      `INSERT INTO courses (mentor_id, mentor_name, title, description, category, difficulty, status, rating, rating_count, views)
       VALUES (?,?,?,?,?,?,'active',?,?,?)`,
      [mentor.user_id, mentorName, c.title, c.desc, c.category,
        randChoice(['beginner','intermediate','advanced']),
        randInt(35, 50)/10, randInt(20, 200), randInt(100, 5000)]
    );
  }

  // --- 4c. 更多职位 ---
  log(tag, '创建企业职位...');
  const [companyIds] = await pool.query("SELECT id, company_name FROM companies");
  const jobTitles = ['前端开发工程师','Java后端开发','Python开发','算法工程师','数据分析师','产品经理','UI设计师','测试工程师','DevOps工程师','全栈工程师','运营专员','市场专员','人力资源专员','财务分析师','嵌入式开发工程师','安全工程师','游戏开发工程师','深度学习工程师','NLP工程师','商业分析师','品牌营销经理','大客户销售经理','渠道销售经理','市场推广专员','新媒体运营','客户成功经理'];
  const jobLocations = ['北京','上海','广州','深圳','杭州','成都','武汉','南京','西安','苏州'];
  const salaries = ['8K-15K','10K-18K','12K-20K','15K-25K','18K-30K','20K-35K','25K-40K'];
  const jobTypes = ['校招', '实习', '社招'];

  for (const title of jobTitles) {
    const comp = randChoice(companyIds);
    const cat = inferJobCategory(title);
    await pool.query(
      `INSERT INTO jobs (title, company_id, company_name, location, salary, type, category, description, requirements, urgent, view_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title, comp.id, comp.company_name, randChoice(jobLocations), randChoice(salaries),
        randChoice(jobTypes), cat,
        `【${comp.company_name}】诚聘${title}，负责核心业务开发与运营，提供完善培训体系。`,
        `本科及以上学历，相关专业背景，良好的沟通能力和团队协作精神。`,
        randInt(0, 1), randInt(50, 5000),
      ]
    );
  }

  // --- 4d. 留学专业 ---
  log(tag, '创建留学专业...');
  const [uniIds] = await pool.query('SELECT id, country FROM universities LIMIT 30');
  const programData = [
    { cat: '计算机科学', deg: '硕士', lang: '英语', dur: '2年' },
    { cat: '数据科学', deg: '硕士', lang: '英语', dur: '1.5年' },
    { cat: '人工智能', deg: '硕士', lang: '英语', dur: '2年' },
    { cat: '商业分析', deg: '硕士', lang: '英语', dur: '1年' },
    { cat: '金融工程', deg: '硕士', lang: '英语', dur: '2年' },
    { cat: '电子工程', deg: '硕士', lang: '英语', dur: '2年' },
    { cat: '机械工程', deg: '硕士', lang: '英语', dur: '2年' },
    { cat: '市场营销', deg: '硕士', lang: '英语', dur: '1年' },
    { cat: '传媒与传播', deg: '硕士', lang: '英语', dur: '1年' },
    { cat: '教育学', deg: '硕士', lang: '英语', dur: '1年' },
    { cat: '法学', deg: '硕士', lang: '英语', dur: '1年' },
    { cat: '建筑学', deg: '硕士', lang: '英语', dur: '2年' },
    { cat: '生物医学', deg: '硕士', lang: '英语', dur: '2年' },
    { cat: '环境工程', deg: '硕士', lang: '英语', dur: '2年' },
  ];
  const langMap = { us: '英语', uk: '英语', ca: '英语', au: '英语', de: '德语/英语', fr: '法语/英语', jp: '日语/英语' };
  for (const uni of uniIds) {
    const numPrograms = randInt(2, 4);
    for (let p = 0; p < numPrograms; p++) {
      const prog = randChoice(programData);
      try {
        await pool.query(
          `INSERT INTO programs (university_id, name_zh, name_en, degree, category, duration, language, gpa_min, toefl_min, ielts_min, tuition_total, status, view_count)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?)`,
          [uni.id, prog.cat, prog.cat, prog.deg, prog.cat, prog.dur,
           langMap[uni.country] || '英语', (randInt(28, 38)/10), randInt(80, 110), randInt(6, 7.5),
           `${randInt(10, 50)}万元/年`, randInt(100, 5000)]
        );
      } catch {}
    }
  }

  // --- 4e. 预约 ---
  log(tag, '创建预约...');
  const services = ['职业规划辅导','简历优化指导','面试技巧培训','考研院校选择','留学申请指导','模拟面试','技术面试准备','薪资谈判技巧'];
  const apptStatuses = ['pending','confirmed','completed','completed','completed','cancelled'];
  const [mentorUserIds] = await pool.query("SELECT user_id FROM mentor_profiles");

  for (let i = 0; i < 30; i++) {
    const daysAgo = randInt(0, 60);
    const dt = new Date(); dt.setDate(dt.getDate() - daysAgo);
    dt.setHours(randInt(9, 20), randChoice([0, 30]));
    const status = randChoice(apptStatuses);
    const fee = randChoice([99, 149, 199, 249, 299]);
    await pool.query(
      `INSERT INTO appointments (student_id, mentor_id, appointment_time, duration, status, note, mentor_remark, service_title, fee, review_rating, review_content)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        randChoice(studentUserIds), randChoice(mentorUserIds).user_id,
        dt.toISOString().slice(0, 19).replace('T', ' '),
        randChoice([30, 45, 60, 90]), status,
        randChoice(['希望了解互联网行业','需要优化简历','准备秋招面试','纠结考研还是就业']),
        status === 'completed' ? randChoice(['学生基础不错','建议补充实习经历','面试表现良好']) : null,
        randChoice(services), fee,
        status === 'completed' ? randInt(40, 50)/10 : null,
        status === 'completed' ? '收获很大，导师专业有耐心' : null,
      ]
    );
  }

  // --- 4f. 投递 ---
  log(tag, '创建投递...');
  const [jobIds] = await pool.query("SELECT id FROM jobs WHERE status='active'");
  const resumeStatuses = ['pending','pending','viewed','viewed','interview','offered','rejected'];
  for (const sid of studentUserIds) {
    const num = randInt(2, 5);
    const used = new Set();
    for (let j = 0; j < num && used.size < jobIds.length; j++) {
      const jid = randChoice(jobIds).id;
      if (used.has(jid)) continue;
      used.add(jid);
      await pool.query(
        `INSERT INTO resumes (student_id, job_id, status) VALUES (?,?,?)`,
        [sid, jid, randChoice(resumeStatuses)]
      );
    }
  }

  // --- 4g. 通知 ---
  log(tag, '创建通知...');
  const [allUsers] = await pool.query('SELECT id, role FROM users');
  const notifTemplates = {
    student: [
      { type:'system', title:'欢迎使用启航平台', content:'完善个人资料可提高求职匹配率' },
      { type:'appointment', title:'预约已确认', content:'你的导师预约已确认，请查看日程' },
      { type:'job', title:'新职位推荐', content:'根据你的意向，为你推荐了匹配职位' },
      { type:'course', title:'课程更新', content:'你关注的课程有新内容更新' },
      { type:'system', title:'简历完善提醒', content:'完善简历可以提高投递成功率' },
    ],
    company: [
      { type:'system', title:'企业账号已激活', content:'可以开始发布职位和筛选简历' },
      { type:'job', title:'收到新的简历', content:'你发布的职位收到了新的投递' },
    ],
    mentor: [
      { type:'system', title:'导师账号已激活', content:'可以开始管理课程和预约' },
      { type:'appointment', title:'新的预约请求', content:'有学生提交了辅导预约' },
      { type:'course', title:'课程审核通过', content:'你提交的课程已上线' },
      { type:'system', title:'收到学生评价', content:'有学生对你的辅导给出了评价' },
    ],
    admin: [
      { type:'system', title:'系统运行正常', content:'各项服务运行正常' },
      { type:'system', title:'新企业注册待审核', content:'请及时审核' },
    ],
  };
  for (const user of allUsers) {
    const tmpls = notifTemplates[user.role] || notifTemplates.student;
    for (const tpl of tmpls) {
      const daysAgo = randInt(0, 30);
      const dt = new Date(); dt.setDate(dt.getDate() - daysAgo);
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, content, is_read, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
        [user.id, tpl.type, tpl.title, tpl.content, randInt(0, 1), dt.toISOString().slice(0,19).replace('T',' '), dt.toISOString().slice(0,19).replace('T',' ')]
      );
    }
  }

  // --- 4h. 收藏 ---
  log(tag, '创建收藏...');
  for (const sid of studentUserIds) {
    for (let i = 0; i < randInt(1, 3) && jobIds.length; i++) {
      try {
        await pool.query('INSERT INTO favorites (user_id, target_type, target_id) VALUES (?,\'job\',?)',
          [sid, randChoice(jobIds).id]);
      } catch {}
    }
  }

  log(tag, '种子数据创建完成');
}

// ============================================================
// Phase 5: 从 XDF_COMPLETE_ZHAOPIN.sql 导入更多职位
// ============================================================
async function importZhaopin() {
  const tag = '社会招聘';
  log(tag, '读取 XDF_COMPLETE_ZHAOPIN.sql ...');
  const content = fs.readFileSync(path.join(DB_DIR, 'XDF_COMPLETE_ZHAOPIN.sql'), 'utf-8');

  const [xdfComp] = await pool.query("SELECT id FROM companies WHERE company_name LIKE '%新东方%' LIMIT 1");
  const companyId = xdfComp[0]?.id || 1;

  const jobTypeMap = { '校园招聘': '校招', '社会招聘': '社招', '实习生招聘': '实习' };
  let jobCount = 0;
  const batchSize = 200;
  let batch = [];

  for (const block of extractInsertBlocks(content, 'all_jobs')) {
    const cols = parseColumns(block.columns);
    for (const rowStr of parseRows(block.values)) {
      const v = parseValues(rowStr);
      const get = (col) => { const idx = cols.indexOf(col); return idx >= 0 ? v[idx] : null; };

      const title = get('job_title');
      if (!title) continue;
      const recType = get('recruitment_type') || '社会招聘';
      const jobType = jobTypeMap[recType] || '社招';

      batch.push([
        title, companyId, '新东方教育科技集团',
        String(title).match(/^([^-]+)/)?.[1] || '北京',
        get('salary_range') || '12K-20K', jobType,
        inferJobCategory(title), get('job_description') || '',
        get('requirements') || '', randInt(0, 1), randInt(50, 5000),
      ]);

      if (batch.length >= batchSize) {
        const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,"active",?)').join(',');
        try {
          await pool.query(
            `INSERT INTO jobs (title,company_id,company_name,location,salary,type,category,description,requirements,urgent,status,view_count) VALUES ${placeholders}`,
            batch.flat()
          );
          jobCount += batch.length;
        } catch {}
        batch = [];
      }
    }
  }
  if (batch.length > 0) {
    const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,"active",?)').join(',');
    try {
      await pool.query(
        `INSERT INTO jobs (title,company_id,company_name,location,salary,type,category,description,requirements,urgent,status,view_count) VALUES ${placeholders}`,
        batch.flat()
      );
      jobCount += batch.length;
    } catch {}
  }
  log(tag, `导入 ${jobCount} 个职位`);
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('\n========================================');
  console.log('  启航平台 - 全量数据导入');
  console.log('========================================\n');

  // 测试连接
  try {
    const conn = await pool.getConnection();
    console.log('  ✅ MySQL 数据库连接成功');
    conn.release();
  } catch (err) {
    console.error('  ❌ MySQL 连接失败:', err.message);
    process.exit(1);
  }

  try {
    // Phase 0: 清空
    console.log('\n--- Phase 0: 清空数据 ---');
    await truncateAll();

    // Phase 1: 新东方留学数据
    console.log('\n--- Phase 1: 新东方留学数据 ---');
    await importXindongfang();

    // Phase 2: 校园招聘
    console.log('\n--- Phase 2: 校园招聘职位 ---');
    await importCampusJobs();

    // Phase 3: 终极版大数据
    console.log('\n--- Phase 3: 终极版大数据(8MB) ---');
    await importUltimate();

    // Phase 4: 种子数据
    console.log('\n--- Phase 4: 基础种子数据 ---');
    await seedBaseData();

    // Phase 5: 社会招聘
    console.log('\n--- Phase 5: 社会招聘职位 ---');
    await importZhaopin();

    // 汇总
    console.log('\n========================================');
    console.log('  数据导入完成！');
    console.log('========================================');

    const tables = ['users','students','jobs','courses','companies','mentor_profiles','appointments','resumes','notifications','favorites','universities','programs','articles','testimonials','study_abroad_consultants','study_abroad_offers','resources','competitions'];
    for (const t of tables) {
      try {
        const [rows] = await pool.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
        console.log(`  ${t.padEnd(28)} ${String(rows[0].cnt).padStart(6)} 行`);
      } catch {}
    }
    console.log('');

  } catch (err) {
    console.error('导入失败:', err);
  } finally {
    await pool.end();
  }
}

main();
