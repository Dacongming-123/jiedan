/**
 * 平台配置加载器（带 5 分钟内存缓存，避免每次请求都查 DB）
 */
const { queryOne } = require('../config/db')

const cache = new Map() // platform → { data, ts }
const TTL = 5 * 60 * 1000

async function get(platform) {
  const cached = cache.get(platform)
  if (cached && Date.now() - cached.ts < TTL) return cached.data

  const row = await queryOne(
    'SELECT config_json, enabled FROM platform_configs WHERE platform = ?',
    [platform]
  )
  if (!row) return null

  const data = {
    enabled: !!row.enabled,
    ...(typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json),
  }
  cache.set(platform, { data, ts: Date.now() })
  return data
}

function invalidate(platform) {
  cache.delete(platform)
}

module.exports = { get, invalidate }
