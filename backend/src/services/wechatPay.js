/**
 * 微信支付 V3 服务
 * 文档：https://pay.weixin.qq.com/wiki/doc/apiv3
 */
const crypto = require('crypto')
const https = require('https')
const QRCode = require('qrcode')
const platformConfig = require('./platformConfig')

const WECHAT_PAY_HOST = 'api.mch.weixin.qq.com'

// ── 工具 ──────────────────────────────────────────────────
function nonceStr() {
  return crypto.randomBytes(16).toString('hex')
}

function timestamp() {
  return Math.floor(Date.now() / 1000).toString()
}

function buildMessage(...parts) {
  return parts.join('\n') + '\n'
}

function rsaSign(message, privateKey) {
  return crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64')
}

function buildAuthHeader(cfg, method, urlPath, body) {
  const ts = timestamp()
  const nonce = nonceStr()
  const msg = buildMessage(method, urlPath, ts, nonce, body)
  const sig = rsaSign(msg, cfg.private_key)
  return `WECHATPAY2-SHA256-RSA2048 mchid="${cfg.mch_id}",serial_no="${cfg.serial_no}",nonce_str="${nonce}",timestamp="${ts}",signature="${sig}"`
}

function request(method, path, body, cfg) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : ''
    const auth = buildAuthHeader(cfg, method, path, bodyStr)
    const options = {
      hostname: WECHAT_PAY_HOST,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: auth,
        'User-Agent': 'WechatPayV3/1.0',
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (res.statusCode >= 400) reject(json)
          else resolve(json)
        } catch (e) {
          reject({ message: data })
        }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

// ── 解密回调 ──────────────────────────────────────────────
function decryptCallback(resource, apiV3Key) {
  const { ciphertext, associated_data, nonce } = resource
  const key = Buffer.from(apiV3Key, 'utf8')
  const ciphertextBuf = Buffer.from(ciphertext, 'base64')
  const authTag = ciphertextBuf.slice(ciphertextBuf.length - 16)
  const data = ciphertextBuf.slice(0, ciphertextBuf.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'))
  decipher.setAuthTag(authTag)
  decipher.setAAD(Buffer.from(associated_data, 'utf8'))
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'))
}

// ── 公开方法 ──────────────────────────────────────────────

/**
 * 创建 Native 付款码 → 返回 { code_url, qr_base64 }
 */
exports.createNativeOrder = async ({ orderNo, amount, description }) => {
  const cfg = await platformConfig.get('wechat_pay')
  if (!cfg?.enabled) throw new Error('微信支付未启用')
  if (!cfg.mch_id || !cfg.private_key) throw new Error('微信支付配置不完整')

  const body = {
    appid: cfg.appid,
    mchid: cfg.mch_id,
    description,
    out_trade_no: orderNo,
    notify_url: cfg.notify_url,
    amount: { total: Math.round(amount * 100), currency: 'CNY' },
  }

  const result = await request('POST', '/v3/pay/transactions/native', body, cfg)
  const qr_base64 = await QRCode.toDataURL(result.code_url)
  return { code_url: result.code_url, qr_base64 }
}

/**
 * 查询订单状态
 */
exports.queryOrder = async (orderNo) => {
  const cfg = await platformConfig.get('wechat_pay')
  if (!cfg?.enabled) throw new Error('微信支付未启用')
  return request('GET', `/v3/pay/transactions/out-trade-no/${orderNo}?mchid=${cfg.mch_id}`, null, cfg)
}

/**
 * 处理支付回调通知
 */
exports.handleNotify = async (headers, rawBody) => {
  const cfg = await platformConfig.get('wechat_pay')
  if (!cfg?.enabled) throw new Error('微信支付未启用')

  const { resource } = JSON.parse(rawBody)
  return decryptCallback(resource, cfg.api_v3_key)
}
