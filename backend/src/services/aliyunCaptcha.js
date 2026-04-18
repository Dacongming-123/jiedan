/**
 * 阿里云验证码 2.0 服务端验证
 * 文档：https://help.aliyun.com/document_detail/193143.html
 */
const https = require('https')
const crypto = require('crypto')
const platformConfig = require('./platformConfig')

function hmacSHA256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest('base64')
}

function buildCanonical(params) {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
}

/**
 * 调用阿里云 CAPTCHA 接口验证 token
 * 抖音/PC/H5 等场景的参数：captchaVerifyParam（前端 SDK 给出）
 */
exports.verify = async (captchaVerifyParam) => {
  const cfg = await platformConfig.get('aliyun_captcha')
  if (!cfg?.enabled) return true // 未启用时跳过验证
  if (!cfg.access_key_id || !cfg.access_key_secret) return true

  const params = {
    AccessKeyId: cfg.access_key_id,
    Action: 'VerifyIntelligentCaptcha',
    Format: 'JSON',
    RegionId: 'cn-hangzhou',
    SceneId: cfg.scene_id,
    SignatureMethod: 'HMAC-SHA256',
    SignatureNonce: crypto.randomBytes(16).toString('hex'),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2023-03-05',
    CaptchaVerifyParam: captchaVerifyParam,
  }

  const canonical = buildCanonical(params)
  const strToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonical)}`
  params.Signature = hmacSHA256(cfg.access_key_secret + '&', strToSign)

  const url = `https://captcha.cn-hangzhou.aliyuncs.com/?${buildCanonical(params)}`

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.Result?.VerifyResult === true || json.Result?.VerifyResult === 'true')
        } catch (_) {
          resolve(false)
        }
      })
    }).on('error', () => resolve(false))
  })
}
