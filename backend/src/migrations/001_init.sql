-- 智创工坊数据库初始化脚本
-- 数据库: zhichuang

CREATE DATABASE IF NOT EXISTS zhichuang DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zhichuang;

-- ================================================
-- 1. 用户基础表
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone       VARCHAR(20) UNIQUE COMMENT '手机号',
  email       VARCHAR(100) UNIQUE COMMENT '邮箱',
  wechat_openid  VARCHAR(100) UNIQUE COMMENT '微信openid',
  alipay_userid  VARCHAR(100) UNIQUE COMMENT '支付宝userid',
  password_hash  VARCHAR(255) COMMENT '密码hash',
  nickname    VARCHAR(50) NOT NULL DEFAULT '用户',
  avatar      VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  role        ENUM('employer','creator','admin') DEFAULT 'employer',
  verified    TINYINT(1) DEFAULT 0 COMMENT '是否实名认证',
  status      ENUM('active','banned','pending') DEFAULT 'active',
  last_login_at  DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='用户基础表';

-- ================================================
-- 2. 用户详细资料表
-- ================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL UNIQUE,
  bio          TEXT COMMENT '个人简介',
  skills       JSON COMMENT '技能标签数组',
  portfolio_urls JSON COMMENT '作品集链接',
  location     VARCHAR(100) COMMENT '所在城市',
  rating_avg   DECIMAL(3,2) DEFAULT 0.00 COMMENT '综合评分',
  rating_count INT DEFAULT 0 COMMENT '评分次数',
  completed_orders INT DEFAULT 0 COMMENT '完成订单数',
  total_income DECIMAL(12,2) DEFAULT 0.00 COMMENT '历史总收入',
  response_rate INT DEFAULT 100 COMMENT '响应率%',
  on_time_rate INT DEFAULT 100 COMMENT '准时完成率%',
  categories   JSON COMMENT '擅长分类',
  verification_status ENUM('unverified','pending','verified') DEFAULT 'unverified',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户详情表';

-- ================================================
-- 3. 需求表
-- ================================================
CREATE TABLE IF NOT EXISTS requirements (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employer_id  BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL COMMENT '需求标题',
  description  TEXT NOT NULL COMMENT '详细描述',
  category     VARCHAR(50) NOT NULL COMMENT '分类:ui_design/ai_illustration/3d/video/etc',
  budget_min   DECIMAL(10,2) COMMENT '预算下限',
  budget_max   DECIMAL(10,2) COMMENT '预算上限',
  deadline_days INT COMMENT '交付天数',
  attachments  JSON COMMENT '附件URL数组',
  tags         JSON COMMENT '标签数组',
  status       ENUM('draft','open','in_progress','completed','cancelled') DEFAULT 'open',
  view_count   INT DEFAULT 0,
  apply_count  INT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employer_id) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_employer (employer_id)
) ENGINE=InnoDB COMMENT='需求表';

-- ================================================
-- 4. 申请表
-- ================================================
CREATE TABLE IF NOT EXISTS applications (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requirement_id BIGINT UNSIGNED NOT NULL,
  creator_id     BIGINT UNSIGNED NOT NULL,
  proposal       TEXT COMMENT '申请方案',
  price          DECIMAL(10,2) NOT NULL COMMENT '报价',
  timeline_days  INT NOT NULL COMMENT '预计完成天数',
  status         ENUM('pending','reviewing','accepted','rejected','withdrawn') DEFAULT 'pending',
  employer_note  TEXT COMMENT '雇主备注',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requirement_id) REFERENCES requirements(id),
  FOREIGN KEY (creator_id) REFERENCES users(id),
  UNIQUE KEY uq_apply (requirement_id, creator_id),
  INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='申请表';

-- ================================================
-- 5. 订单主表
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no        VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
  requirement_id  BIGINT UNSIGNED NOT NULL,
  application_id  BIGINT UNSIGNED NOT NULL,
  employer_id     BIGINT UNSIGNED NOT NULL,
  creator_id      BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(200) NOT NULL COMMENT '订单标题（复制需求标题）',
  final_price     DECIMAL(10,2) NOT NULL COMMENT '最终成交价',
  platform_fee    DECIMAL(10,2) DEFAULT 0 COMMENT '平台服务费',
  creator_income  DECIMAL(10,2) DEFAULT 0 COMMENT '创作者到手金额',
  deadline_days   INT NOT NULL COMMENT '约定完成天数',
  confirm_deadline DATETIME COMMENT '确认截止时间（创建后3天）',
  start_date      DATETIME COMMENT '双方确认后正式开始时间',
  expected_end    DATETIME COMMENT '预计交付时间',
  actual_end      DATETIME COMMENT '实际完成时间',
  status          ENUM(
    'pending_confirm',  -- 待双方确认（3天确认期）
    'confirmed',        -- 双方已确认（等待支付）
    'paid',             -- 已支付（资金托管）
    'in_progress',      -- 进行中（需求锁定）
    'pending_review',   -- 待验收
    'revision',         -- 修改中
    'completed',        -- 已完成
    'cancelled',        -- 已取消
    'appealing'         -- 申诉中
  ) DEFAULT 'pending_confirm',
  employer_confirmed TINYINT(1) DEFAULT 0,
  creator_confirmed  TINYINT(1) DEFAULT 0,
  requirements_locked TINYINT(1) DEFAULT 0 COMMENT '需求是否已锁定',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requirement_id) REFERENCES requirements(id),
  FOREIGN KEY (application_id) REFERENCES applications(id),
  FOREIGN KEY (employer_id) REFERENCES users(id),
  FOREIGN KEY (creator_id) REFERENCES users(id),
  INDEX idx_employer (employer_id),
  INDEX idx_creator (creator_id),
  INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='订单主表';

-- ================================================
-- 6. 订单变更申请表
-- ================================================
CREATE TABLE IF NOT EXISTS order_changes (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        BIGINT UNSIGNED NOT NULL,
  proposer_id     BIGINT UNSIGNED NOT NULL COMMENT '提出变更方',
  description     TEXT NOT NULL COMMENT '变更内容描述',
  price_delta     DECIMAL(10,2) DEFAULT 0 COMMENT '价格变更金额（正/负）',
  days_delta      INT DEFAULT 0 COMMENT '工期变更天数',
  employer_approved TINYINT(1) DEFAULT NULL COMMENT 'NULL=待处理',
  creator_approved  TINYINT(1) DEFAULT NULL,
  agreement_url   VARCHAR(500) COMMENT '补充协议PDF地址',
  agreement_no    VARCHAR(50) COMMENT '协议编号',
  status          ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (proposer_id) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='订单变更申请';

-- ================================================
-- 7. 里程碑/进度表
-- ================================================
CREATE TABLE IF NOT EXISTS milestones (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  percentage   INT NOT NULL DEFAULT 0 COMMENT '完成后解锁的资金比例%',
  sort_order   INT DEFAULT 0,
  status       ENUM('pending','submitted','revision','approved') DEFAULT 'pending',
  deliverables JSON COMMENT '交付物URL数组',
  employer_feedback TEXT COMMENT '雇主反馈',
  submitted_at DATETIME,
  approved_at  DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB COMMENT='里程碑进度表';

-- ================================================
-- 8. 支付记录表
-- ================================================
CREATE TABLE IF NOT EXISTS payments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_no    VARCHAR(64) NOT NULL UNIQUE COMMENT '内部支付单号',
  order_id      BIGINT UNSIGNED NOT NULL,
  payer_id      BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  method        ENUM('alipay','wechat_pay','balance','mock') DEFAULT 'mock',
  trade_no      VARCHAR(128) COMMENT '第三方交易号',
  status        ENUM('pending','success','failed','refunded') DEFAULT 'pending',
  paid_at       DATETIME,
  refunded_at   DATETIME,
  metadata      JSON COMMENT '支付扩展信息',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (payer_id) REFERENCES users(id),
  INDEX idx_order (order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='支付记录';

-- ================================================
-- 9. 钱包表
-- ================================================
CREATE TABLE IF NOT EXISTS wallets (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL UNIQUE,
  available      DECIMAL(12,2) DEFAULT 0.00 COMMENT '可提现余额',
  frozen         DECIMAL(12,2) DEFAULT 0.00 COMMENT '冻结金额（托管中）',
  total_income   DECIMAL(12,2) DEFAULT 0.00 COMMENT '历史总收入',
  total_spent    DECIMAL(12,2) DEFAULT 0.00 COMMENT '历史总支出',
  withdraw_bank  VARCHAR(100) COMMENT '绑定银行卡/账号',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='钱包表';

-- ================================================
-- 10. 钱包流水表
-- ================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_id    BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  type         ENUM('income','expense','freeze','unfreeze','withdraw','refund') NOT NULL,
  amount       DECIMAL(12,2) NOT NULL COMMENT '正数=收入，负数=支出',
  balance_after DECIMAL(12,2) COMMENT '操作后余额',
  ref_type     ENUM('order','payment','withdraw','system') COMMENT '关联类型',
  ref_id       BIGINT UNSIGNED COMMENT '关联ID',
  description  VARCHAR(200),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='钱包流水';

-- ================================================
-- 11. 会话表
-- ================================================
CREATE TABLE IF NOT EXISTS conversations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT UNSIGNED COMMENT '关联订单（可为空，表示询价阶段）',
  user_a        BIGINT UNSIGNED NOT NULL,
  user_b        BIGINT UNSIGNED NOT NULL,
  last_msg      TEXT,
  last_msg_at   DATETIME,
  unread_a      INT DEFAULT 0 COMMENT 'user_a未读数',
  unread_b      INT DEFAULT 0 COMMENT 'user_b未读数',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a) REFERENCES users(id),
  FOREIGN KEY (user_b) REFERENCES users(id),
  UNIQUE KEY uq_pair (user_a, user_b),
  INDEX idx_order (order_id)
) ENGINE=InnoDB COMMENT='会话表';

-- ================================================
-- 12. 消息表
-- ================================================
CREATE TABLE IF NOT EXISTS messages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id       BIGINT UNSIGNED NOT NULL,
  type            ENUM('text','image','file','system','order_event') DEFAULT 'text',
  content         TEXT NOT NULL,
  file_url        VARCHAR(500),
  file_name       VARCHAR(200),
  is_read         TINYINT(1) DEFAULT 0,
  read_at         DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  INDEX idx_conv (conversation_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='消息表';

-- ================================================
-- 13. 评价表
-- ================================================
CREATE TABLE IF NOT EXISTS reviews (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     BIGINT UNSIGNED NOT NULL,
  reviewer_id  BIGINT UNSIGNED NOT NULL COMMENT '评价者',
  reviewee_id  BIGINT UNSIGNED NOT NULL COMMENT '被评价者',
  role         ENUM('employer_to_creator','creator_to_employer'),
  rating       TINYINT NOT NULL COMMENT '1-5星',
  quality      TINYINT COMMENT '质量评分',
  communication TINYINT COMMENT '沟通评分',
  timeliness   TINYINT COMMENT '准时评分',
  comment      TEXT,
  is_public    TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id),
  UNIQUE KEY uq_review (order_id, reviewer_id)
) ENGINE=InnoDB COMMENT='评价表';

-- ================================================
-- 14. 申诉表
-- ================================================
CREATE TABLE IF NOT EXISTS appeals (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT UNSIGNED NOT NULL,
  appellant_id  BIGINT UNSIGNED NOT NULL COMMENT '申诉发起方',
  reason        TEXT NOT NULL COMMENT '申诉原因',
  evidence_urls JSON COMMENT '证据截图/文件URL',
  respondent_reply TEXT COMMENT '被申诉方回应',
  admin_id      BIGINT UNSIGNED COMMENT '处理管理员',
  admin_note    TEXT COMMENT '管理员裁决说明',
  resolution    ENUM('pending','processing','resolved_for_appellant','resolved_for_respondent','resolved_split','closed') DEFAULT 'pending',
  split_ratio   INT COMMENT '分割比例（申诉方获得%）',
  resolved_at   DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (appellant_id) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='申诉表';

-- ================================================
-- 15. 通知表
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(50) NOT NULL COMMENT '通知类型:order_confirm/payment/message/review/system等',
  title      VARCHAR(200) NOT NULL,
  content    TEXT,
  link       VARCHAR(500) COMMENT '点击跳转链接',
  is_read    TINYINT(1) DEFAULT 0,
  read_at    DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_unread (user_id, is_read),
  INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='通知表';

-- ================================================
-- 16. 管理员表
-- ================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname     VARCHAR(50),
  role         ENUM('super_admin','admin','moderator') DEFAULT 'admin',
  permissions  JSON COMMENT '权限列表',
  last_login   DATETIME,
  status       ENUM('active','disabled') DEFAULT 'active',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='管理员表';

-- ================================================
-- 17. 页面配置表
-- ================================================
CREATE TABLE IF NOT EXISTS page_configs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_key    VARCHAR(100) NOT NULL UNIQUE COMMENT '页面标识',
  config_json JSON NOT NULL COMMENT '配置内容',
  description VARCHAR(200),
  updated_by  BIGINT UNSIGNED,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='页面配置表';

-- ================================================
-- 18. 地理位置统计表
-- ================================================
CREATE TABLE IF NOT EXISTS geolocation_logs (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED,
  ip_address VARCHAR(45) NOT NULL,
  country    VARCHAR(50),
  province   VARCHAR(50),
  city       VARCHAR(50),
  isp        VARCHAR(100),
  action     ENUM('login','register','visit') DEFAULT 'visit',
  user_agent VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='地理位置统计';

-- ================================================
-- 初始数据
-- ================================================

-- 默认管理员（密码: admin123456，需上线后立即修改）
INSERT IGNORE INTO admin_users (username, password_hash, nickname, role) VALUES
('admin', '$2a$10$GVTNrXw2Ddva2JuVN0DfJOx.53pxZx/B/E3eFFdGilUy96/0MeuRm', '超级管理员', 'super_admin');

-- 默认页面配置
INSERT IGNORE INTO page_configs (page_key, config_json, description) VALUES
('home', '{"banner_title":"激发无限创意","banner_subtitle":"连接顶尖创作者与优质雇主","categories":["UI设计","AI插画","3D建模","视频后期","文案策划","品牌设计"]}', '首页配置'),
('demand_square', '{"page_size":20,"default_sort":"latest","show_banner":true}', '需求广场配置'),
('creator_square', '{"page_size":20,"featured_count":4}', '创作者广场配置');
