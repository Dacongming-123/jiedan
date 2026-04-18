const { query, queryOne } = require('../config/db')
const { invalidate } = require('../services/platformConfig')

// 敏感字段关键词，GET 时脱敏为 "***"
const SENSITIVE = ['private_key', 'secret', 'api_v3_key', 'alipay_public_key',
                   'access_key_secret', 'client_secret']

function maskConfig(cfg) {
  const result = {}
  for (const [k, v] of Object.entries(cfg)) {
    if (SENSITIVE.some(s => k === s || k.endsWith('_' + s))) {
      result[k] = v ? '***' : ''
    } else {
      result[k] = v
    }
  }
  return result
}

// GET /api/admin/platform-configs
exports.list = async (req, res) => {
  const rows = await query('SELECT platform, config_json, enabled, description, updated_at FROM platform_configs ORDER BY platform')
  const list = rows.map(r => {
    const cfg = typeof r.config_json === 'string' ? JSON.parse(r.config_json) : r.config_json
    return {
      platform: r.platform,
      description: r.description,
      enabled: !!r.enabled,
      updated_at: r.updated_at,
      config: maskConfig(cfg),
    }
  })
  res.json({ success: true, data: { list } })
}

// PUT /api/admin/platform-configs/:platform
exports.update = async (req, res) => {
  const { platform } = req.params
  const { enabled, config } = req.body

  const row = await queryOne('SELECT config_json FROM platform_configs WHERE platform = ?', [platform])
  if (!row) return res.status(404).json({ success: false, message: '平台不存在' })

  const existing = typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json

  // 合并：新值中为 "***" 的字段保留旧值（说明用户没有修改）
  const merged = { ...existing }
  if (config) {
    for (const [k, v] of Object.entries(config)) {
      if (v === '***') continue // 保留旧值
      merged[k] = v
    }
  }

  await query(
    'UPDATE platform_configs SET config_json = ?, enabled = ?, updated_at = NOW() WHERE platform = ?',
    [JSON.stringify(merged), enabled ? 1 : 0, platform]
  )

  invalidate(platform) // 清除缓存，立即生效

  res.json({ success: true, data: { platform, enabled: !!enabled, config: maskConfig(merged) } })
}

// POST /api/admin/platform-configs/:platform/test
exports.test = async (req, res) => {
  const { platform } = req.params
  try {
    if (platform === 'wechat_pay') {
      const svc = require('../services/wechatPay')
      // 只验证配置是否加载成功，不发真实请求
      const cfg = require('../services/platformConfig')
      const c = await cfg.get('wechat_pay')
      if (!c?.mch_id || !c?.private_key) throw new Error('商户号或私钥未配置')
      res.json({ success: true, message: '配置已加载，请发起一笔真实订单验证连通性' })
    } else if (platform === 'alipay') {
      const cfg = require('../services/platformConfig')
      const c = await cfg.get('alipay')
      if (!c?.app_id || !c?.private_key) throw new Error('AppID 或私钥未配置')
      res.json({ success: true, message: '配置已加载，请发起一笔真实订单验证连通性' })
    } else if (platform === 'wechat_oauth') {
      const svc = require('../services/wechatOauth')
      const url = await svc.getOAuthUrl('test')
      res.json({ success: true, message: '授权 URL 生成成功', data: { url } })
    } else if (platform === 'douyin_oauth') {
      const svc = require('../services/douyinOauth')
      const url = await svc.getOAuthUrl('test')
      res.json({ success: true, message: '授权 URL 生成成功', data: { url } })
    } else if (platform === 'aliyun_captcha') {
      const cfg = require('../services/platformConfig')
      const c = await cfg.get('aliyun_captcha')
      if (!c?.access_key_id) throw new Error('AccessKey ID 未配置')
      res.json({ success: true, message: '配置已加载，前端接入 SDK 后可验证' })
    } else {
      res.json({ success: true, message: '暂无测试接口' })
    }
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}
