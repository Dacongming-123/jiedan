-- 访问日志表
CREATE TABLE IF NOT EXISTS visit_logs (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NULL,
  ip        VARCHAR(45)  NOT NULL,
  path      VARCHAR(255) NOT NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_user_id    (user_id),
  INDEX idx_path       (path(100)),
  INDEX idx_ip         (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表补充 last_ip 字段（幂等，字段不存在时才添加）
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_ip'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN last_ip VARCHAR(45) NULL AFTER last_login_at',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
