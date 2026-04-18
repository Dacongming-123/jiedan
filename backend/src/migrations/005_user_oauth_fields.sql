-- 抖音 OpenID
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'douyin_openid');
SET @sql = IF(@col = 0, 'ALTER TABLE users ADD COLUMN douyin_openid VARCHAR(128) NULL UNIQUE AFTER wechat_openid', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
