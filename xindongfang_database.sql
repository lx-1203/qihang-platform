-- ========================================================
-- 新东方前途出国官网数据 - SQL数据库脚本
-- 生成时间: 2026-04-17
-- 数据来源: https://goabroad.xdf.cn/
-- ========================================================

-- 删除已存在的表（如果存在）
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS consultants;
DROP TABLE IF EXISTS universities;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS website_info;

-- ========================================================
-- 1. 网站信息表
-- ========================================================
CREATE TABLE website_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '网站名称',
    url VARCHAR(200) NOT NULL COMMENT '网站URL',
    description TEXT COMMENT '网站描述',
    branches VARCHAR(50) COMMENT '分子公司数量',
    consultants VARCHAR(50) COMMENT '顾问数量',
    partner_schools VARCHAR(50) COMMENT '合作院校数量',
    total_offers VARCHAR(50) COMMENT '录取offer总数',
    contact_phone VARCHAR(50) COMMENT '联系电话',
    icp VARCHAR(100) COMMENT 'ICP备案号',
    beian VARCHAR(100) COMMENT '公安备案号',
    address VARCHAR(200) COMMENT '公司地址',
    company_name VARCHAR(200) COMMENT '公司名称',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站基本信息表';

INSERT INTO website_info (name, url, description, branches, consultants, partner_schools, total_offers, contact_phone, icp, beian, address, company_name) VALUES
('新东方前途出国', 'https://goabroad.xdf.cn/', '新东方留学-出国留学-留学费用-留学服务中心-新东方留学网', '48家分子公司', '2000+位服务导师', '1000+所合作院校', '250000+枚录取offer', '400 650 0116', '京ICP备05067667号-32', '京公网安备11010802021790号', '北京市海淀区海淀中街6号', '新东方教育科技集团有限公司/北京新东方前途出国咨询有限公司');

-- ========================================================
-- 2. 国家/地区表
-- ========================================================
CREATE TABLE countries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name_cn VARCHAR(50) NOT NULL COMMENT '中文名称',
    name_en VARCHAR(100) COMMENT '英文名称',
    region VARCHAR(50) COMMENT '所属大洲/区域',
    page_url VARCHAR(200) COMMENT '页面URL',
    introduction TEXT COMMENT '国家介绍',
    key_advantage TEXT COMMENT '核心优势',
    language_requirement TEXT COMMENT '语言要求',
    immigration_policy TEXT COMMENT '移民政策',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学国家/地区信息表';

INSERT INTO countries (name_cn, name_en, region, page_url, introduction, key_advantage, language_requirement, immigration_policy) VALUES
('美国', 'United States', '北美洲', 'https://liuxue.xdf.cn/usa/', '签证收紧下 用美国学位撬动多国就业', '92%诺贝尔奖得主在美国高校任教; MIT人工智能实验室年科研经费$1.2亿; 硅谷科技公司实习薪资$8,000+/月; 常春藤校友网络覆盖90%世界500强高管', '托福80或雅思6.5; 商科及管理类需要GMAT，其他需要GRE', 'OPT工作签证; H1B抽签; 绿卡申请'),
('英国', 'United Kingdom', '欧洲', 'https://liuxue.xdf.cn/uk/', '英国留学申请-英国留学院校', 'G5超级精英大学; 一年制硕士节省时间; PSW毕业生工作签证', '雅思6.0-7.0; 部分专业要求更高', 'PSW签证2年; 毕业生可留英工作'),
('加拿大', 'Canada', '北美洲', 'https://liuxue.xdf.cn/canada/', '加拿大留学申请-加拿大留学条件', '教育质量世界领先; 留学费用性价比高; 移民政策友好; 社会安全稳定', '雅思6.5(单项6.0); 托福90(单项20)', '毕业后1-3年工作签证; 经验类移民'),
('澳大利亚', 'Australia', '大洋洲', 'https://liuxue.xdf.cn/au/', '澳大利亚留学申请', '澳洲八大名校; 毕业后2-4年工作签证; 打分制技术移民', '雅思6.5(单项6.0); 部分专业要求更高', '485毕业生工作签证; 技术移民'),
('新西兰', 'New Zealand', '大洋洲', 'https://liuxue.xdf.cn/nz/', '新西兰留学申请', '全球和平指数排名第2; 八大公立大学均世界前500; 留学费用低', '雅思6.0-6.5', '毕业后工作签证; 移民政策友好'),
('日本', 'Japan', '亚洲', 'https://liuxue.xdf.cn/japan/', '日本留学申请', 'SGU英语授课项目; 国公立大学学费低; 动漫机器人汽车工程优势', '日语N1/N2; 英语授课雅思6.0+/托福80+', '毕业后工作签证; 技术人文签证'),
('中国香港', 'Hong Kong', '亚洲', 'https://liuxue.xdf.cn/hk/', '香港留学申请', '港三世界顶尖; 全英文授课; 离家近文化相似', '雅思6.0-7.0; 托福80-100', 'IANG签证留港工作'),
('新加坡', 'Singapore', '亚洲', 'https://liuxue.xdf.cn/singapore/', '新加坡留学申请', 'NUS亚洲第一; NTU世界前列; 政府奖学金机会多', '雅思6.0-7.0; 托福90-100', '毕业后工作签证; 就业率高'),
('韩国', 'South Korea', '亚洲', 'https://liuxue.xdf.cn/korea/', '韩国留学申请', 'SKY名校; 韩流文化影响; 学费相对低廉', '韩语TOPIK; 英语授课雅思/托福', '毕业后工作签证'),
('德国', 'Germany', '欧洲', 'https://liuxue.xdf.cn/germany/', '德国留学申请', '公立大学免学费; 工程强校; 工业发达', '德语TestDaF TDN4/DSH-2; 英语授课雅思6.0-6.5', '毕业后18个月找工作签证; 欧盟蓝卡'),
('法国', 'France', '欧洲', 'https://liuxue.xdf.cn/france/', '法国留学申请', '公立大学注册费低; 精英学校体系; 奢侈品管理艺术优势', '法语DELF B2/DALF C1; 英语授课雅思6.0-6.5', 'APS工作签证; 创业支持'),
('爱尔兰', 'Ireland', '欧洲', 'https://liuxue.xdf.cn/ireland/', '爱尔兰留学申请', '欧洲硅谷; 英语国家; 1年制硕士; 毕业2年工签', '雅思6.0-7.0; 托福80-100', 'Stamp 1G工作签证2年; 工作5年永居'),
('荷兰', 'Netherlands', '欧洲', 'https://liuxue.xdf.cn/netherlands/', '荷兰留学申请', '英语授课项目多; 国际化程度高', '雅思6.0-6.5; 托福80-90', '毕业后1年找工作签证'),
('意大利', 'Italy', '欧洲', 'https://liuxue.xdf.cn/italy/', '意大利留学申请', '公立大学免学费; 艺术设计建筑优势', '意语B2; 英语授课雅思5.5-6.0', '毕业后工作签证'),
('西班牙', 'Spain', '欧洲', 'https://liuxue.xdf.cn/spain/', '西班牙留学申请', '公立大学学费低廉; 旅游管理体育管理优势', '西语B2; 英语授课雅思6.0-6.5', '毕业后1年找工作签证');

-- ========================================================
-- 3. 院校表
-- ========================================================
CREATE TABLE universities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    country_id INT COMMENT '所属国家ID',
    name_cn VARCHAR(100) NOT NULL COMMENT '中文名称',
    name_en VARCHAR(200) COMMENT '英文名称',
    ranking_qs INT COMMENT 'QS世界排名',
    ranking_usnews INT COMMENT 'US News排名',
    ranking_local VARCHAR(50) COMMENT '本地排名',
    location VARCHAR(100) COMMENT '地理位置',
    university_type VARCHAR(50) COMMENT '院校类型(医博类/综合类/理工类等)',
    highlights TEXT COMMENT '优势专业/特色',
    tuition_undergraduate VARCHAR(100) COMMENT '本科学费范围',
    tuition_graduate VARCHAR(100) COMMENT '研究生学费范围',
    tuition_phd VARCHAR(100) COMMENT '博士学费范围',
    living_cost VARCHAR(100) COMMENT '生活费范围',
    language_requirement TEXT COMMENT '语言要求',
    admission_requirements TEXT COMMENT '录取要求',
    page_url VARCHAR(200) COMMENT '页面URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学院校信息表';

INSERT INTO universities (country_id, name_cn, name_en, ranking_qs, ranking_usnews, ranking_local, location, university_type, highlights) VALUES
-- 美国院校
(1, '哈佛大学', 'Harvard University', 4, 1, NULL, '剑桥,马萨诸塞州', '私立研究型', '法学、医学、商学、人文学科'),
(1, '麻省理工学院', 'Massachusetts Institute of Technology', 1, 2, NULL, '剑桥,马萨诸塞州', '私立理工', '工程、计算机、物理、经济学'),
(1, '斯坦福大学', 'Stanford University', 3, 3, NULL, '帕洛阿托,加利福尼亚州', '私立研究型', '计算机、工程、商学、法学'),
(1, '加州大学伯克利分校', 'University of California-Berkeley', 10, 6, NULL, '伯克利,加利福尼亚州', '公立研究型', '工程、计算机、经济学'),
(1, '哥伦比亚大学', 'Columbia University', 19, 10, NULL, '纽约市,纽约州', '私立研究型', '法学、商学、新闻学'),
(1, '加州理工学院', 'California Institute of Technology', 15, 23, NULL, '帕萨迪纳,加利福尼亚州', '私立理工', '物理、工程、天文学'),
(1, '约翰霍普金斯大学', 'Johns Hopkins University', 28, 14, NULL, '巴尔的摩,马里兰州', '私立研究型', '医学、公共卫生、国际关系'),
(1, '耶鲁大学', 'Yale University', 18, 9, NULL, '纽黑文,康涅狄格州', '私立研究型', '法学、人文、艺术'),
(1, '加州大学洛杉矶分校', 'University of California-Los Angeles', 29, 13, NULL, '洛杉矶,加利福尼亚州', '公立研究型', '医学、法学、电影'),
(1, '宾夕法尼亚大学', 'University of Pennsylvania', 12, 15, NULL, '费城,宾夕法尼亚州', '私立研究型', '沃顿商学院、法学、医学'),
(1, '普林斯顿大学', 'Princeton University', 17, 16, NULL, '普林斯顿,新泽西州', '私立研究型', '数学、物理、经济学'),
(1, '密歇根大学', 'University of Michigan', 33, 21, NULL, '安娜堡,密歇根州', '公立研究型', '工程、商学、医学'),
(1, '康奈尔大学', 'Cornell University', 20, 16, NULL, '伊萨卡,纽约州', '私立研究型', '工程、酒店管理、农业'),

-- 英国院校
(2, '牛津大学', 'University of Oxford', 3, 5, NULL, '牛津', '公立研究型', '人文、法学、医学、数学'),
(2, '剑桥大学', 'University of Cambridge', 5, 8, NULL, '剑桥', '公立研究型', '自然科学、工程、数学'),
(2, '帝国理工学院', 'Imperial College London', 2, 13, NULL, '伦敦', '公立理工', '工程、医学、商科、理科'),
(2, '伦敦大学学院', 'University College London', 9, 16, NULL, '伦敦', '公立研究型', '医学、建筑、教育、法学'),
(2, '爱丁堡大学', 'University of Edinburgh', 27, 34, NULL, '爱丁堡', '公立研究型', '医学、文学、工程'),
(2, '曼彻斯特大学', 'University of Manchester', 34, 63, NULL, '曼彻斯特', '公立研究型', '工程、商科、材料科学'),
(2, '伦敦国王学院', "King's College London", 40, 33, NULL, '伦敦', '公立研究型', '医学、法学、人文'),
(2, '伦敦政治经济学院', 'London School of Economics', 50, 239, NULL, '伦敦', '公立社科', '经济学、政治学、社会学'),

-- 加拿大院校
(3, '麦吉尔大学', 'McGill University', 31, 56, '医博类#1', '蒙特利尔,魁北克省', '医博类', '医学、法学、工程'),
(3, '多伦多大学', 'University of Toronto', 25, 18, '医博类#2', '多伦多,安大略省', '医博类', '医学、工程、商学、计算机'),
(3, '英属哥伦比亚大学', 'University of British Columbia', 38, 35, '医博类#3', '温哥华,不列颠哥伦比亚省', '医博类', '林业、海洋科学、工程'),
(3, '阿尔伯塔大学', 'University of Alberta', 96, 150, '医博类#4', '埃德蒙顿,阿尔伯塔省', '医博类', '工程、医学、能源'),
(3, '麦克马斯特大学', 'McMaster University', 176, 133, '医博类#5', '汉密尔顿,安大略省', '医博类', '医学、工程、健康科学'),
(3, '滑铁卢大学', 'University of Waterloo', 154, 191, '综合类#3', '滑铁卢,安大略省', '综合类', '计算机、数学、工程、Co-op'),
(3, '西蒙菲莎大学', 'Simon Fraser University', 328, 317, '综合类#1', '温哥华,不列颠哥伦比亚省', '综合类', '商科、计算机、传媒'),
(3, '女王大学', "Queen's University", 193, 419, '医博类#7', '金斯顿,安大略省', '医博类', '商学、法学、医学');

-- ========================================================
-- 4. 顾问表
-- ========================================================
CREATE TABLE consultants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '顾问姓名',
    title VARCHAR(100) COMMENT '职位',
    education_background VARCHAR(200) COMMENT '学历背景',
    experience_years VARCHAR(50) COMMENT '从业年限',
    specialty_countries VARCHAR(200) COMMENT '擅长国家/地区',
    success_cases TEXT COMMENT '成功案例院校',
    contact_info VARCHAR(200) COMMENT '联系方式',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学顾问信息表';

INSERT INTO consultants (name, title, education_background, experience_years, specialty_countries, success_cases) VALUES
-- 美国顾问
('范悦', '美国研究生留学申请主管', '211院校', '10-15年', '美国', '杜克大学,哥伦比亚大学,宾夕法尼亚大学,西北大学,芝加哥大学'),
('董郓泾', '美国研究生高级经理', '多伦多大学,QS前30,加拿大海归', '7-10年', '美国,加拿大', '多伦多大学,麦基尔大学,UBC'),
('冯婕', '美国研究生留学申请导师', '美国海归', '3-5年', '美国', '哥伦比亚大学等'),
('刘会强', '美国研究生留学申请导师', '211院校', '5-7年', '美国', '普林斯顿大学'),
('张丽敏', '美国研究生留学规划经理', '211院校', '10-15年', '美国', '哈佛大学,耶鲁大学,哥伦比亚大学,宾夕法尼亚大学,芝加哥大学'),
('王春昊', '美国本科中学留学规划导师', '211院校', '7-10年', '美国', '约翰霍普金斯,纽约大学,UCLA,里士满大学,密歇根安娜堡'),
('陈冠男', '美国研究生留学高级服务导师', '英语专八', '5-10年', '美国', '哥伦比亚大学,芝加哥大学,霍普金斯大学,康奈尔大学,杜克大学'),
('胡佳', '美国本科中学留学服务导师', '优秀院校毕业', NULL, '美国', '哈佛大学,哥伦比亚大学,杜克大学,宾夕法尼亚大学'),
('王璐琪', '美国本科中学留学规划导师', '211院校', '11年', '美国', 'UCB,UCLA,UW,UIUC,NYU'),
('刘俊萁', '美国研究生留学申请导师', '海归', '1-3年', '美国', '纽约大学,南加州大学'),
('白尔康', '美国本科中学留学申请主管', '美国海归,U.S.News前40', '5-7年', '美国', '圣路易斯华盛顿,华盛顿与李大学,里士满大学,南加州大学,纽约大学'),
('杨悦', '美国本科中学留学申请导师', '优秀院校毕业', '3-5年', '美国', '加州大学洛杉矶分校,史密斯学院,加州大学圣地亚哥分校'),
('钟瑞童', '美研留学规划导师', '美国华盛顿大学海归,U.S.News世界排名前10', '3-5年', '美国', '耶鲁大学,哥伦比亚大学,康奈尔大学'),
('宋佳霖', '美国本科中学部经理', '211院校,美国海归', '14年', '美国', '哈佛大学,哥伦比亚大学,杜克大学,宾夕法尼亚大学,康奈尔大学'),

-- 英国顾问
('苏鹏', '英国留学高级申请导师', '英国海归', '10年以上', '英国', '英国G5'),
('王丹', '英国留学申请导师', '211院校', '12年', '英国', '剑桥大学,帝国理工,布莱顿学院'),
('韩馥阳', '英国留学规划导师', '985院校', '5-7年', '英国,新加坡,香港', '新加坡国立大学,南洋理工,香港大学,香港中文大学,香港科技大学'),
('刘馨阳', '英国留学规划导师', '211院校', '7年', '英国', '剑桥大学,帝国理工学院,爱丁堡大学,LSE,UCL'),
('张莉', '欧亚中心总监', '211院校', '15年', '英国,新加坡,香港,日本,欧洲', '新加坡国立大学/南洋理工大学,香港大学/香港科技大学/香港中文大学,东京大学/京都大学/大阪大学,苏黎世联邦理工/慕尼黑工业大学,高丽大学/延世大学/澳门大学'),
('刘翔宇', '英澳新留学规划经理', '211院校', '10-15年', '英国,澳洲,新西兰', '剑桥大学,牛津大学,帝国理工学院,伦敦政经济学院'),
('李盈萱', '英国留学高级服务导师', '英国海归硕士,海外工作经历', '7-10年', '英国', '英国G5,爱丁堡,曼彻斯特,UAL,皇艺'),
('许慧卿', '英国留学规划导师', '211院校', '7-10年', '英国,澳洲', 'LSE,帝国理工学院,爱丁堡大学,曼彻斯特大学,墨尔本大学'),
('耿奕璇', '英国留学申请服务主管', '香港大学,硕士,QS前30', '5-7年', '英国,香港,新加坡', '新加坡国立大学,南洋理工大学,香港大学,香港中文大学,香港科技大学'),
('胡沛姗', '英国留学申请导师', '海归', '3-5年', '英国', '伦敦大学学院,爱丁堡大学,杜伦大学,格拉斯哥大学'),
('赵杰', '英国留学申请导师', '翻译硕士,英语专业八级', '3-5年', '英国', '帝国理工学院,伦敦政治经济学院,伦敦大学学院,爱丁堡大学,皇家艺术学院'),
('张鸣', '澳新留学规划导师', '海归硕士', '5-7年', '澳洲,新西兰,英国', '剑桥大学,牛津大学,曼彻斯特大学,墨尔本大学'),
('王佳钦', '英国中期顾问', '口译硕士,教资认证', '3-5年', '英国,澳洲,新加坡', '南洋理工大学,悉尼大学,伦敦大学学院,伦敦国王学院,爱丁堡大学'),

-- 加拿大顾问
('孙津', '加拿大留学申请经理', '海归硕士', '10-15年', '加拿大', 'UT, UBC, QU, HKU, NUS'),
('王泽红', '加拿大留学规划主管', '211院校', '15年以上', '加拿大', '多伦多大学,麦吉尔大学,UBC'),
('李彦呈', '加拿大留学规划导师', '985院校', '7-10年', '加拿大', '多伦多大学,UBC,滑铁卢大学'),
('尹令修', '加拿大留学规划导师', '加拿大海归', '3-5年', '加拿大', '多伦多大学,UBC,滑铁卢大学,麦克马斯特大学'),

-- 澳洲顾问
('刘婵', '澳新留学申请导师', '211院校', '7-10年', '澳洲,新西兰', '墨尔本大学,澳国立大学,悉尼大学,新南威尔士大学,昆士兰大学'),
('王静', '澳新留学申请导师', '海归', '10-15年', '澳洲,新西兰', '墨尔本大学,澳国立大学,新南威尔士大学'),
('杜顺秋', '澳新留学规划导师', '211院校', '7-10年', '澳洲,新西兰', '澳洲八大,新西兰八大'),
('叶怡妍', '澳新留学规划导师', '国际课程体系WACE澳洲高中,海本海硕', '7-10年', '澳洲,新西兰', '墨尔本大学,奥克兰大学,新南威尔士大学,昆士兰大学'),
('高超', '澳新部主管', '海归硕士', '10-15年', '澳洲,新西兰', '墨尔本大学,悉尼新南威尔士大学,悉尼大学,澳大利亚国立大学,奥克兰大学');

-- ========================================================
-- 5. 成功案例表
-- ========================================================
CREATE TABLE cases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_name VARCHAR(50) COMMENT '学生姓名/代号',
    university_cn VARCHAR(100) NOT NULL COMMENT '录取院校(中文)',
    university_en VARCHAR(200) COMMENT '录取院校(英文)',
    country VARCHAR(50) COMMENT '留学国家',
    major VARCHAR(100) COMMENT '专业',
    degree_level VARCHAR(50) COMMENT '学历层次(本科/硕士/博士/中学)',
    consultant_name VARCHAR(50) COMMENT '指导顾问',
    consultant_title VARCHAR(100) COMMENT '顾问职位',
    student_background TEXT COMMENT '学生背景',
    difficulty TEXT COMMENT '申请难点',
    solution TEXT COMMENT '解决方案',
    highlights TEXT COMMENT '案例亮点',
    difficulty_level INT COMMENT '难度等级(1-5)',
    is_elite_case BOOLEAN DEFAULT FALSE COMMENT '是否名校案例',
    case_date DATE COMMENT '案例日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学成功案例表';

INSERT INTO cases (student_name, university_cn, university_en, country, major, degree_level, consultant_name, consultant_title, student_background, difficulty, highlights, difficulty_level, is_elite_case) VALUES
('Z同学', '哈佛大学', 'Harvard University', '美国', '计算科学与工程', '硕士', '范悦', '美国研究生留学申请主管', 'GPA:3.9+, GRE:320+', '顶尖名校竞争激烈', '哈佛大学录取', 5, TRUE),
('G同学', '牛津大学', 'University of Oxford', '英国', '人文科学', '本科', '王丹', '英国留学申请导师', '托福:110+, SAT:1500, 10门AP满分', '英国G5本科申请难度极高', '牛津大学本科录取', 5, TRUE),
('L同学', '麻省理工学院', 'MIT', '美国', '土木工程', '博士', '张丽敏', '美国研究生留学规划经理', 'GPA:3.9+, GRE:330+', 'MIT博士全奖竞争激烈', 'MIT全奖博士录取', 5, TRUE),
('W同学', '耶鲁大学', 'Yale University', '美国', '生物医学工程', '博士', '钟瑞童', '美研留学规划导师', 'GPA:3.7+', 'Top30博士项目竞争激烈', '耶鲁大学博士录取', 5, TRUE),
('Q同学', '宾夕法尼亚大学', 'University of Pennsylvania', '美国', '传播学', '硕士', '范悦', '美国研究生留学申请主管', 'GPA:3.9, TOEFL:100+', '传媒名校竞争激烈', '宾大传播学录取', 4, TRUE),
('Z同学', '伦敦大学学院', 'University College London', '英国', '全球健康管理', '本科', '苏鹏', '英国留学高级申请导师', '2段ASDAN商赛', 'G5商科申请竞争激烈', 'UCL本科录取', 5, TRUE),
(NULL, '帝国理工学院', 'Imperial College London', '英国', '高级航空工程', '硕士', '王丹', '英国留学申请导师', NULL, '帝国理工全球排名第2，竞争强度远超常规院校', '英国G5硕士录取', 5, TRUE),
(NULL, '伦敦大学学院', 'University College London', '英国', '创意艺术及人文学科', '本科', '苏鹏', '英国留学高级申请导师', 'OSSD课程体系', 'OSSD申请G5需证明学术能力', '英国G5本科录取', 5, TRUE),
(NULL, '墨尔本大学', 'University of Melbourne', '澳大利亚', '商科', '本科/硕士', '刘婵', '澳新留学申请导师', NULL, '商学院学术背景及分数要求较高', '澳洲八大名校', 4, FALSE),
(NULL, '墨尔本大学', 'University of Melbourne', '澳大利亚', '管理(会计)', '硕士', '王静', '澳新留学申请导师', NULL, '家长对排名要求高，多轮沟通达成共识', '澳洲八大会计专业', 3, FALSE),
(NULL, '悉尼大学', 'University of Sydney', '澳大利亚', '数据科学', '硕士', '刘婵', '澳新留学申请导师', '国内普通高中在读，不参加高考，有SAT和A-Level成绩', '非常规路径申请', 'STEM热门专业', 4, FALSE),
(NULL, '米兰理工大学', 'Politecnico di Milano', '意大利', '机械工程', '硕士', '闫津', '欧亚留学申请主管', NULL, '学霸型，混申欧陆', '意大利顶尖理工', 2, FALSE),
(NULL, '蒙纳士大学', 'Monash University', '澳大利亚', '职业会计', '硕士', '王静', '澳新留学申请导师', NULL, '本科背景一般但家长期望高排名', '三重认证商学院', 4, FALSE),
(NULL, '北海道大学', 'Hokkaido University', '日本', '化学材料', '博士/硕士', '孔杨斌', '亚洲留学规划导师', '双非院校背景', '双非+无语言成绩冲刺帝国大学', '日本旧帝国大学', 5, FALSE),
(NULL, 'UBC', 'University of British Columbia', '加拿大', 'BSc', '本科', '孙津', '加拿大留学申请经理', NULL, '目标热门工程专业，背景活动弱', '加拿大Top3', 4, TRUE),
(NULL, '本拿比公立教育局', 'Burnaby School District', '加拿大', '中学', '中学', '刘馨阳', '英国留学规划导师', '国内7年级', '学制衔接问题', '低龄留学案例', 3, FALSE),
(NULL, '莱斯大学', 'Rice University', '美国', '生物科学', '本科', '王璐琪', '美国本科中学留学规划导师', NULL, '生物科学最热门专业，竞争极激烈', '美国Top30名校', 5, TRUE),
(NULL, '温莎大学', 'University of Windsor', '加拿大', 'MBA-供应链管理', '硕士', '刘会强', '美国研究生留学申请导师', NULL, '推荐人沟通困难', '毗邻底特律汽车工业中心', 3, FALSE),
(NULL, '麦克马斯特大学', 'McMaster University', '加拿大', '计算机与电气工程', '硕士', '孙津', '加拿大留学申请经理', NULL, 'GRE成绩较低', '加拿大医博类名校', 3, FALSE),
(NULL, '韦仕敦大学', 'Western University', '加拿大', '对外英语教学', '硕士', '张莉', '欧亚中心总监', NULL, 'GPA偏低，课外经历少', '加拿大医博类名校', 3, FALSE);

-- ========================================================
-- 6. 文章资讯表
-- ========================================================
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(300) NOT NULL COMMENT '文章标题',
    url VARCHAR(300) COMMENT '文章URL',
    category VARCHAR(50) COMMENT '文章分类',
    country VARCHAR(50) COMMENT '相关国家',
    summary TEXT COMMENT '文章摘要',
    publish_date DATE COMMENT '发布日期',
    author VARCHAR(50) COMMENT '作者',
    views INT DEFAULT 0 COMMENT '浏览量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学文章资讯表';

INSERT INTO articles (title, url, category, country, summary) VALUES
-- 美国文章
('【走进offer】从考研焦虑到梦校录取，他只花了 3 个月，逆袭 JHU 应用经济学硕士', 'https://liuxue.xdf.cn/news/xxx', '成功案例', '美国', 'JHU应用经济学硕士录取案例'),
('重磅揭晓！2026 U.S.News全美研究生院排名正式发布', 'https://liuxue.xdf.cn/news/xxx', '排名资讯', '美国', '2026年US News研究生院排名'),
('3月美研录取大爆发！超6500枚Offer来袭，名校录取详情全揭秘！', 'https://liuxue.xdf.cn/news/xxx', '录取资讯', '美国', '3月美研录取数据统计'),
('重磅｜2026QS 世界大学学科排名正式发布', 'https://liuxue.xdf.cn/news/xxx', '排名资讯', '全球', 'QS学科排名'),
('【走进offer】无跨专业基础，缘何康奈尔、卡内基梅隆等知名名校纷纷抛来橄榄枝？', 'https://liuxue.xdf.cn/news/xxx', '成功案例', '美国', '跨专业申请名校案例'),
('杜克、圣母、埃默里官宣27Fall"标化可选"：这届申请者的松口气背后，藏着哪些新机遇？', 'https://liuxue.xdf.cn/news/xxx', '申请政策', '美国', '标化可选政策分析'),
('2026 Niche美本公共卫生专业排名解密：除了JHU，这些"宝藏校"正在闷声发大财', 'https://liuxue.xdf.cn/news/xxx', '排名资讯', '美国', '公共卫生专业排名'),
('重磅加码！康奈尔获2500万美元专款：工程生的"实战时代"正式到来', 'https://liuxue.xdf.cn/news/xxx', '教育新闻', '美国', '康奈尔工程学院资金'),
('2026申请美国大学的流程全攻略：从选校策略到签证获批，一篇搞定所有疑问', 'https://liuxue.xdf.cn/news/xxx', '申请指导', '美国', '美本申请全流程'),
('2026申请美国研究生时间线全解析：从背景提升到offer到手，这份"赢战"攻略请查收', 'https://liuxue.xdf.cn/news/xxx', '申请指导', '美国', '美研申请时间线'),

-- 英国文章
('留学新动态：伦敦大学推出"可拆分"硕士课程，学习模式大革新！', 'https://liuxue.xdf.cn/news/xxx', '教育新闻', '英国', '伦敦大学新课程模式'),
('剑桥大学重磅官宣：新学院横空出世，引领未来人才培养新潮流！', 'https://liuxue.xdf.cn/news/xxx', '教育新闻', '英国', '剑桥大学新学院'),
('2026年度最受雇主青睐的英国大学排名揭晓，曼大强势回归榜首！', 'https://liuxue.xdf.cn/news/xxx', '排名资讯', '英国', '雇主青睐度排名'),
('跨学科逆袭：211、985学子斩获帝国理工传感器系统工程硕士录取', 'https://liuxue.xdf.cn/news/xxx', '成功案例', '英国', '帝国理工录取案例'),
('校企携手！爱丁堡大学与新东方交流中英教育合作新方向', 'https://liuxue.xdf.cn/news/xxx', '合作新闻', '英国', '爱丁堡大学合作'),
('深度解析：英国硕士学位等级划分及比例表，一份值得收藏的官方数据', 'https://liuxue.xdf.cn/news/xxx', '教育指南', '英国', '硕士学位等级'),
('倒计时开始！2026英国硕士申请截止日期全汇总：错过这些时间节点，再等一年！', 'https://liuxue.xdf.cn/news/xxx', '申请指导', '英国', '硕士申请截止日期'),
('不想读本专业？揭秘英国哪些专业可以跨专业申请，并助你实现名校逆袭', 'https://liuxue.xdf.cn/news/xxx', '申请指导', '英国', '跨专业申请指南'),

-- 加拿大文章
('全球留学政策持续释放红利：从加拿大到多国，把握机遇正当时', 'https://liuxue.xdf.cn/news/xxx', '政策资讯', '加拿大', '留学政策红利'),
('多伦多大学三轮放榜盛况：610枚offer+千万奖学金，开启留学新篇章！', 'https://liuxue.xdf.cn/news/xxx', '录取资讯', '加拿大', '多伦多大学录取数据'),
('加拿大留学大签和小签详解：核心区别、续签避坑与拒签红线（2026版）', 'https://liuxue.xdf.cn/news/xxx', '签证指南', '加拿大', '加拿大学签详解'),
('加拿大英法双语授课大学有哪些？深度盘点5所名校，附申请门槛与语言策略', 'https://liuxue.xdf.cn/news/xxx', '院校指南', '加拿大', '双语授课大学'),
('加拿大硕士留学如何申请全额奖学金？从套磁到录取，5步拿下年均30万资助', 'https://liuxue.xdf.cn/news/xxx', '奖学金', '加拿大', '硕士奖学金申请'),
('加拿大的哪所大学看重高考成绩？2026年最新清单与申请门槛全解析', 'https://liuxue.xdf.cn/news/xxx', '申请指导', '加拿大', '高考成绩要求'),
('2026加拿大bc省大学排名最新发布：UBC稳居榜首，SFU、维多利亚大学位次生变！', 'https://liuxue.xdf.cn/news/xxx', '排名资讯', '加拿大', 'BC省大学排名'),
('2026滑铁卢大学排名世界第几？深度解析"就业王者"为何综排"低调"', 'https://liuxue.xdf.cn/news/xxx', '院校分析', '加拿大', '滑铁卢大学分析');

-- ========================================================
-- 创建索引以提高查询效率
-- ========================================================
CREATE INDEX idx_universities_country ON universities(country_id);
CREATE INDEX idx_universities_ranking ON universities(ranking_qs);
CREATE INDEX idx_cases_country ON cases(country);
CREATE INDEX idx_cases_consultant ON cases(consultant_name);
CREATE INDEX idx_cases_elite ON cases(is_elite_case);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_country ON articles(country);
CREATE INDEX idx_consultants_specialty ON consultants(specialty_countries);

-- ========================================================
-- 创建视图方便查询
-- ========================================================

-- 名校案例视图（G5 + Top30）
CREATE VIEW elite_cases_view AS
SELECT 
    c.*,
    u.ranking_qs,
    u.ranking_usnews
FROM cases c
LEFT JOIN universities u ON c.university_cn = u.name_cn
WHERE c.is_elite_case = TRUE OR c.difficulty_level >= 4;

-- 顾问成功案例统计视图
CREATE VIEW consultant_stats_view AS
SELECT 
    consultant_name,
    consultant_title,
    COUNT(*) as total_cases,
    SUM(CASE WHEN is_elite_case THEN 1 ELSE 0 END) as elite_cases,
    AVG(difficulty_level) as avg_difficulty
FROM cases
GROUP BY consultant_name, consultant_title
ORDER BY elite_cases DESC;

-- ========================================================
-- 数据导入完成
-- ========================================================
SELECT '数据库初始化完成！' as message;
SELECT CONCAT('国家/地区数量: ', COUNT(*)) as info FROM countries;
SELECT CONCAT('院校数量: ', COUNT(*)) as info FROM universities;
SELECT CONCAT('顾问数量: ', COUNT(*)) as info FROM consultants;
SELECT CONCAT('成功案例数量: ', COUNT(*)) as info FROM cases;
SELECT CONCAT('文章数量: ', COUNT(*)) as info FROM articles;