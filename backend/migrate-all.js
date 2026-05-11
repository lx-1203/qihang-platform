import pool from './db.js';

async function migrate() {
  const alterStatements = [
    {
      table: 'identity_verifications',
      column: 'reject_reason',
      sql: "ALTER TABLE identity_verifications ADD COLUMN reject_reason VARCHAR(500) DEFAULT '' COMMENT '驳回原因' AFTER status",
    },
    {
      table: 'identity_verifications',
      column: 'reviewer_id',
      sql: "ALTER TABLE identity_verifications ADD COLUMN reviewer_id INT DEFAULT NULL COMMENT '审核人 ID' AFTER reject_reason",
    },
    {
      table: 'identity_verifications',
      column: 'reviewed_at',
      sql: "ALTER TABLE identity_verifications ADD COLUMN reviewed_at TIMESTAMP NULL COMMENT '审核时间' AFTER reviewer_id",
    },
    {
      table: 'site_nav_items',
      column: 'open_in_new_tab',
      sql: "ALTER TABLE site_nav_items ADD COLUMN open_in_new_tab TINYINT NOT NULL DEFAULT 0 COMMENT '是否在新标签页打开' AFTER is_external",
    },
    {
      table: 'site_nav_items',
      column: 'section_type',
      sql: "ALTER TABLE site_nav_items ADD COLUMN section_type VARCHAR(50) DEFAULT '' COMMENT '板块类型 (primary_board/admin_tool/external_link)' AFTER open_in_new_tab",
    },
    {
      table: 'site_nav_items',
      column: 'visibility_scope',
      sql: "ALTER TABLE site_nav_items ADD COLUMN visibility_scope VARCHAR(50) DEFAULT 'all' COMMENT '可见范围 (all/authenticated/admin_only/student_only)' AFTER section_type",
    },
    {
      table: 'career_guidance_links',
      column: 'platform',
      sql: "ALTER TABLE career_guidance_links ADD COLUMN platform VARCHAR(50) DEFAULT 'bilibili' AFTER external_url",
    },
    {
      table: 'career_guidance_links',
      column: 'cover_url',
      sql: "ALTER TABLE career_guidance_links ADD COLUMN cover_url VARCHAR(500) DEFAULT '' AFTER platform",
    },
    {
      table: 'career_guidance_links',
      column: 'category',
      sql: "ALTER TABLE career_guidance_links ADD COLUMN category VARCHAR(50) DEFAULT '' AFTER cover_url",
    },
    {
      table: 'career_guidance_links',
      column: 'sort_order',
      sql: "ALTER TABLE career_guidance_links ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER category",
    },
    {
      table: 'career_guidance_links',
      column: 'status',
      sql: "ALTER TABLE career_guidance_links ADD COLUMN status ENUM('active','inactive') DEFAULT 'active' AFTER sort_order",
    },
    {
      table: 'resource_library_items',
      column: 'slug',
      sql: "ALTER TABLE resource_library_items ADD COLUMN slug VARCHAR(200) NOT NULL UNIQUE AFTER title",
    },
    {
      table: 'resource_library_items',
      column: 'content_type',
      sql: "ALTER TABLE resource_library_items ADD COLUMN content_type VARCHAR(50) DEFAULT 'article' AFTER cover_url",
    },
    {
      table: 'resource_library_items',
      column: 'is_vip_only',
      sql: "ALTER TABLE resource_library_items ADD COLUMN is_vip_only TINYINT NOT NULL DEFAULT 0 AFTER content_type",
    },
    {
      table: 'resource_library_items',
      column: 'is_free',
      sql: "ALTER TABLE resource_library_items ADD COLUMN is_free TINYINT NOT NULL DEFAULT 0 AFTER is_vip_only",
    },
    {
      table: 'resource_library_items',
      column: 'external_url',
      sql: "ALTER TABLE resource_library_items ADD COLUMN external_url VARCHAR(500) DEFAULT '' AFTER is_free",
    },
    {
      table: 'resource_library_items',
      column: 'author_id',
      sql: "ALTER TABLE resource_library_items ADD COLUMN author_id INT DEFAULT NULL AFTER external_url",
    },
    {
      table: 'resource_library_items',
      column: 'author_name',
      sql: "ALTER TABLE resource_library_items ADD COLUMN author_name VARCHAR(100) DEFAULT '' AFTER author_id",
    },
    {
      table: 'resource_library_items',
      column: 'view_count',
      sql: "ALTER TABLE resource_library_items ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER author_name",
    },
    {
      table: 'resource_library_items',
      column: 'review_status',
      sql: "ALTER TABLE resource_library_items ADD COLUMN review_status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER view_count",
    },
    {
      table: 'resource_library_items',
      column: 'author_type',
      sql: "ALTER TABLE resource_library_items ADD COLUMN author_type ENUM('admin','mentor','system') NOT NULL DEFAULT 'admin' AFTER author_name",
    },
    {
      table: 'vip_subscriptions',
      column: 'order_no',
      sql: "ALTER TABLE vip_subscriptions ADD COLUMN order_no VARCHAR(50) DEFAULT NULL AFTER amount",
    },
    {
      table: 'vip_subscriptions',
      column: 'payment_trade_no',
      sql: "ALTER TABLE vip_subscriptions ADD COLUMN payment_trade_no VARCHAR(100) DEFAULT NULL AFTER order_no",
    },
    {
      table: 'resources',
      column: 'is_vip_only',
      sql: "ALTER TABLE resources ADD COLUMN is_vip_only TINYINT NOT NULL DEFAULT 0 AFTER type",
    },
    {
      table: 'resources',
      column: 'content_type',
      sql: "ALTER TABLE resources ADD COLUMN content_type VARCHAR(20) NOT NULL DEFAULT 'article' AFTER is_vip_only",
    },
    {
      table: 'resources',
      column: 'external_url',
      sql: "ALTER TABLE resources ADD COLUMN external_url VARCHAR(500) DEFAULT NULL AFTER content_type",
    },
    {
      table: 'resources',
      column: 'cover_url',
      sql: "ALTER TABLE resources ADD COLUMN cover_url VARCHAR(500) DEFAULT NULL AFTER external_url",
    },
    {
      table: 'students',
      column: 'career_plan_completed',
      sql: "ALTER TABLE students ADD COLUMN career_plan_completed TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: 'mentor_profiles',
      column: 'credential_url',
      sql: "ALTER TABLE mentor_profiles ADD COLUMN credential_url VARCHAR(500) DEFAULT NULL",
    },
    {
      table: 'mentor_profiles',
      column: 'credential_description',
      sql: "ALTER TABLE mentor_profiles ADD COLUMN credential_description TEXT DEFAULT NULL",
    },
    {
      table: 'mentor_profiles',
      column: 'verified_badge',
      sql: "ALTER TABLE mentor_profiles ADD COLUMN verified_badge VARCHAR(50) DEFAULT NULL COMMENT '认证标签'",
    },
    {
      table: 'mentor_profiles',
      column: 'cert_documents',
      sql: "ALTER TABLE mentor_profiles ADD COLUMN cert_documents TEXT DEFAULT NULL COMMENT '认证文件（JSON数组）'",
    },
    {
      table: 'mentor_profiles',
      column: 'cert_badge',
      sql: "ALTER TABLE mentor_profiles ADD COLUMN cert_badge VARCHAR(100) DEFAULT '' COMMENT '认证徽章'",
    },
    {
      table: 'mentor_profiles',
      column: 'cert_verified_at',
      sql: "ALTER TABLE mentor_profiles ADD COLUMN cert_verified_at TIMESTAMP NULL DEFAULT NULL COMMENT '认证时间'",
    },
    {
      table: 'companies',
      column: 'license_url',
      sql: "ALTER TABLE companies ADD COLUMN license_url VARCHAR(500) DEFAULT '' COMMENT '营业执照URL'",
    },
    {
      table: 'companies',
      column: 'org_code',
      sql: "ALTER TABLE companies ADD COLUMN org_code VARCHAR(50) DEFAULT '' COMMENT '统一社会信用代码'",
    },
    {
      table: 'companies',
      column: 'business_scope',
      sql: "ALTER TABLE companies ADD COLUMN business_scope TEXT DEFAULT NULL COMMENT '经营范围'",
    },
    {
      table: 'companies',
      column: 'verify_documents',
      sql: "ALTER TABLE companies ADD COLUMN verify_documents TEXT DEFAULT NULL COMMENT '认证文件（JSON数组）'",
    },
    {
      table: 'campus_timeline',
      column: 'direction',
      sql: "ALTER TABLE campus_timeline ADD COLUMN direction VARCHAR(50) DEFAULT '' COMMENT '方向标识'",
    },
    {
      table: 'campus_timeline',
      column: 'date_range',
      sql: "ALTER TABLE campus_timeline ADD COLUMN date_range VARCHAR(100) DEFAULT '' COMMENT '日期范围'",
    },
    {
      table: 'mentor_resources',
      column: 'is_vip_only',
      sql: "ALTER TABLE mentor_resources ADD COLUMN is_vip_only TINYINT NOT NULL DEFAULT 0",
    },
    {
      table: 'mentor_resources',
      column: 'content_type',
      sql: "ALTER TABLE mentor_resources ADD COLUMN content_type ENUM('article','video_link','document','other') DEFAULT 'article'",
    },
    // resource_library_items 标准化字段（production-ready）
    {
      table: 'resource_library_items',
      column: 'tags',
      sql: "ALTER TABLE resource_library_items ADD COLUMN tags JSON COMMENT '标签数组' AFTER external_url",
    },
    {
      table: 'resource_library_items',
      column: 'deleted_at',
      sql: "ALTER TABLE resource_library_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间'",
    },
    // users 表 VIP 冗余字段（加速权限检查，主数据在 vip_subscriptions）
    {
      table: 'users',
      column: 'is_vip',
      sql: "ALTER TABLE users ADD COLUMN is_vip TINYINT NOT NULL DEFAULT 0 COMMENT '是否VIP: 0=否, 1=是' AFTER status",
    },
    {
      table: 'users',
      column: 'vip_expires_at',
      sql: "ALTER TABLE users ADD COLUMN vip_expires_at TIMESTAMP NULL DEFAULT NULL COMMENT 'VIP到期时间' AFTER is_vip",
    },
    // career_plan_profiles 缺失 status 列（ER_BAD_FIELD_ERROR 修复）
    {
      table: 'career_plan_profiles',
      column: 'status',
      sql: "ALTER TABLE career_plan_profiles ADD COLUMN status ENUM('draft','submitted','approved','rejected') DEFAULT 'draft' COMMENT '状态' AFTER development_directions",
    },
  ];

  console.log('开始数据库迁移...\n');

  for (const stmt of alterStatements) {
    try {
      await pool.query(stmt.sql);
      console.log(`  [新增] ${stmt.table}.${stmt.column}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`  [已存在] ${stmt.table}.${stmt.column} - 跳过`);
      } else if (err.code === 'ER_NO_SUCH_TABLE') {
        console.log(`  [表不存在] ${stmt.table} - 跳过`);
      } else {
        console.error(`  [错误] ${stmt.table}.${stmt.column}:`, err.message);
      }
    }
  }

  const createStatements = [
    {
      name: 'career_guidance_links',
      sql: `CREATE TABLE IF NOT EXISTS career_guidance_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        external_url VARCHAR(500) NOT NULL,
        platform VARCHAR(50) DEFAULT 'bilibili',
        cover_url VARCHAR(500) DEFAULT '',
        category VARCHAR(50) DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: 'further_education_timelines',
      sql: `CREATE TABLE IF NOT EXISTS further_education_timelines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        direction ENUM('postgrad','recommend','abroad') NOT NULL,
        month VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        sort_order INT DEFAULT 0,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_direction (direction),
        INDEX idx_status (status),
        INDEX idx_sort (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: 'further_education_cases',
      sql: `CREATE TABLE IF NOT EXISTS further_education_cases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        direction ENUM('postgrad','recommend','abroad') NOT NULL,
        name VARCHAR(100) NOT NULL,
        school VARCHAR(200),
        result VARCHAR(500),
        quote TEXT,
        avatar VARCHAR(500) DEFAULT '',
        sort_order INT DEFAULT 0,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_direction (direction),
        INDEX idx_status (status),
        INDEX idx_sort (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: 'vip_subscriptions',
      sql: `CREATE TABLE IF NOT EXISTS vip_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        payment_method VARCHAR(50),
        amount DECIMAL(10,2),
        order_no VARCHAR(50) DEFAULT NULL,
        payment_trade_no VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: 'site_nav_items',
      sql: `CREATE TABLE IF NOT EXISTS site_nav_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '导航名称',
        path VARCHAR(200) NOT NULL COMMENT '链接路径',
        icon VARCHAR(50) DEFAULT '' COMMENT '图标key (对应Lucide图标名)',
        sort_order INT NOT NULL DEFAULT 0 COMMENT '排序值',
        is_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
        is_external TINYINT NOT NULL DEFAULT 0 COMMENT '是否外部链接',
        open_in_new_tab TINYINT NOT NULL DEFAULT 0 COMMENT '是否在新标签页打开',
        section_type VARCHAR(50) DEFAULT '' COMMENT '板块类型 (primary_board/admin_tool/external_link)',
        visibility_scope VARCHAR(50) DEFAULT 'all' COMMENT '可见范围 (all/authenticated/admin_only/student_only)',
        parent_id INT DEFAULT NULL COMMENT '父导航项ID',
        target VARCHAR(20) DEFAULT '_self' COMMENT '打开方式',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sort_order (sort_order),
        INDEX idx_is_enabled (is_enabled),
        INDEX idx_parent_id (parent_id),
        INDEX idx_section_type (section_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: 'resource_library_items',
      sql: `CREATE TABLE IF NOT EXISTS resource_library_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL UNIQUE,
        description TEXT,
        content TEXT,
        cover_url VARCHAR(500) DEFAULT '',
        content_type VARCHAR(50) DEFAULT 'article',
        is_vip_only TINYINT NOT NULL DEFAULT 0,
        is_free TINYINT NOT NULL DEFAULT 0,
        external_url VARCHAR(500) DEFAULT '',
        author_id INT DEFAULT NULL,
        author_name VARCHAR(100) DEFAULT '',
        author_type ENUM('admin','mentor','system') NOT NULL DEFAULT 'admin',
        view_count INT NOT NULL DEFAULT 0,
        review_status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'approved',
        status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: 'feature_flags',
      sql: `CREATE TABLE IF NOT EXISTS feature_flags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flag_key VARCHAR(64) NOT NULL UNIQUE COMMENT '功能开关标识',
        flag_value BOOLEAN NOT NULL DEFAULT TRUE COMMENT '开关值',
        description VARCHAR(255) DEFAULT NULL COMMENT '描述',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='功能开关配置表'`,
    },
    {
      name: 'customer_service_config',
      sql: `CREATE TABLE IF NOT EXISTS customer_service_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键名',
        config_value TEXT COMMENT '配置值',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_config_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服系统配置表'`,
    },
  ];

  console.log('\n创建缺失的表...\n');

  for (const stmt of createStatements) {
    try {
      await pool.query(stmt.sql);
      console.log(`  [确认] ${stmt.name} 表已就绪`);
    } catch (err) {
      console.error(`  [错误] ${stmt.name}:`, err.message);
    }
  }

  const [navCount] = await pool.query('SELECT COUNT(*) as cnt FROM site_nav_items');
  if (navCount[0].cnt === 0) {
    await pool.query(`INSERT INTO site_nav_items (name, path, icon, sort_order, is_enabled, is_external) VALUES
      ('首页', '/', 'Home', 1, 1, 0),
      ('能力提升', '/resources/skill-enhancement', 'Sparkles', 2, 1, 0),
      ('升学深造', '/education/further-education', 'GraduationCap', 3, 1, 0),
      ('求职招聘', '/job-recruitment', 'Briefcase', 4, 1, 0),
      ('职业规划', '/resources/career-plan', 'Compass', 5, 1, 0)
    `);
    console.log('\n  [种子] site_nav_items 默认导航项已插入');
  }

  // 插入默认功能开关数据
  const [flagCount] = await pool.query('SELECT COUNT(*) as cnt FROM feature_flags');
  if (flagCount[0].cnt === 0) {
    await pool.query(`INSERT IGNORE INTO feature_flags (flag_key, flag_value, description) VALUES
      ('jobs', true, '求职招聘模块'),
      ('courses', true, '课程/能力提升模块'),
      ('mentorship', true, '导师咨询模块'),
      ('furtherEducation', true, '升学深造模块'),
      ('entrepreneurship', true, '创业板块'),
      ('vip', true, 'VIP订阅功能'),
      ('notifications', true, '通知中心'),
      ('chat', true, '在线咨询/AI客服')
    `);
    console.log('\n  [种子] feature_flags 默认开关数据已插入');
  }

  console.log('\n数据库迁移完成！');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('迁移失败:', err);
  process.exit(1);
});
