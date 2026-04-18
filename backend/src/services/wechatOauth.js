/**
 * 微信网页 OAuth 2.0
 * 文档：https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
 */
const https = require('https')
const platformConfig = require('./platformConfig')

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

/**
 * 生成微信授权跳转 URL
 * scope: snsapi_base（静默，只拿 openid）| snsapi_userinfo（需用户同意）
 */
exports.getOAuthUrl = async (state = '') => {
  const cfg = await platformConfig.get('wechat_oauth')
  if (!cfg?.enabled) throw new Error('微信登录未启用')
  const redirect = encodeURIComponent(cfg.redirect_uri)
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${cfg.appid}&redirect_uri=${redirect}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`
}

/**
 * 用 code 换取 access_token + openid
 */
exports.getAccessToken = async (code) => {
  const cfg = await platformConfig.get('wechat_oauth')
  if (!cfg?.enabled) throw new Error('微信登录未启用')
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${cfg.appid}&secret=${cfg.secret}&code=${code}&grant_type=authorization_code`
  const res = await httpsGet(url)
  if (res.errcode) throw new Error(res.errmsg || '获取 access_token 失败')
  return res // { access_token, openid, unionid, ... }
}

/**
 * 获取用户信息
 */
exports.getUserInfo = async (accessToken, openid) => {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`
  const res = await httpsGet(url)
  if (res.errcode) throw new Error(res.errmsg || '获取用户信息失败')
  return res // { openid, unionid, nickname, headimgurl, ... }
}
