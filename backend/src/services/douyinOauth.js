/**
 * 抖音开放平台 OAuth 2.0
 * 文档：https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/get-access-token
 */
const https = require('https')
const platformConfig = require('./platformConfig')

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }
    const req = https.request(options, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

exports.getOAuthUrl = async (state = '') => {
  const cfg = await platformConfig.get('douyin_oauth')
  if (!cfg?.enabled) throw new Error('抖音登录未启用')
  const redirect = encodeURIComponent(cfg.redirect_uri)
  return `https://open.douyin.com/platform/oauth/connect/?client_key=${cfg.client_key}&response_type=code&scope=user_info&redirect_uri=${redirect}&state=${state}`
}

exports.getAccessToken = async (code) => {
  const cfg = await platformConfig.get('douyin_oauth')
  if (!cfg?.enabled) throw new Error('抖音登录未启用')
  const res = await post('https://open.douyin.com/oauth/access_token/', {
    client_key: cfg.client_key,
    client_secret: cfg.client_secret,
    code,
    grant_type: 'authorization_code',
  })
  if (res.data?.error_code) throw new Error(res.data.description || '获取 access_token 失败')
  return res.data // { access_token, open_id, ... }
}

exports.getUserInfo = async (accessToken, openId) => {
  const url = `https://open.douyin.com/oauth/userinfo/?access_token=${accessToken}&open_id=${openId}`
  const res = await get(url)
  if (res.data?.error_code) throw new Error(res.data.description || '获取用户信息失败')
  return res.data // { open_id, nickname, avatar, ... }
}
