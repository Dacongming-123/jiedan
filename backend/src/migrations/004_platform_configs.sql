CREATE TABLE IF NOT EXISTS platform_configs (
  platform    VARCHAR(60) NOT NULL PRIMARY KEY,
  config_json TEXT        NOT NULL,
  enabled     TINYINT(1)  NOT NULL DEFAULT 0,
  description VARCHAR(200),
  updated_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO platform_configs (platform, description, config_json) VALUES
  ('wechat_pay',     '微信支付 V3',   '{"appid":"","mch_id":"","api_v3_key":"","serial_no":"","private_key":"","notify_url":""}'),
  ('alipay',         '支付宝支付',     '{"app_id":"","private_key":"","alipay_public_key":"","gateway":"https://openapi.alipay.com/gateway.do","notify_url":"","return_url":""}'),
  ('wechat_oauth',   '微信网页登录',   '{"appid":"","secret":"","redirect_uri":""}'),
  ('douyin_oauth',   '抖音登录',       '{"client_key":"","client_secret":"","redirect_uri":""}'),
  ('aliyun_captcha', '阿里云验证码',   '{"access_key_id":"","access_key_secret":"","scene_id":"","prefix":""}');
