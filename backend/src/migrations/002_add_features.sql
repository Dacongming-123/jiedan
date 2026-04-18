-- 002: 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  requirement_id BIGINT UNSIGNED NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fav (user_id, requirement_id),
  INDEX idx_user (user_id),
  INDEX idx_req  (requirement_id),
  FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='需求收藏表';
