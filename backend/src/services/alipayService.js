/**
 * 支付宝支付服务（使用官方 alipay-sdk）
 * 文档：https://opendocs.alipay.com/open/270/105898
 */
const AlipaySdk = require('alipay-sdk').default
const platformConfig = require('./platformConfig')

async function getSdk() {
  const cfg = await platformConfig.get('alipay')
  if (!cfg?.enabled) throw new Error('支付宝支付未启用')
  if (!cfg.app_id || !cfg.private_key) throw new Error('支付宝配置不完整')

  return new AlipaySdk({
    appId: cfg.app_id,
    privateKey: cfg.private_key,
    alipayPublicKey: cfg.alipay_public_key,
    gateway: cfg.gateway || 'https://openapi.alipay.com/gateway.do',
    charset: 'utf8',
    version: '1.0',
    signType: 'RSA2',
  })
}

/**
 * 生成电脑网站支付表单 URL（PC 端直接跳转）
 */
exports.createPagePay = async ({ orderNo, amount, subject, returnUrl }) => {
  const cfg = await platformConfig.get('alipay')
  const sdk = await getSdk()

  const formStr = sdk.pageExec('alipay.trade.page.pay', {
    returnUrl: returnUrl || cfg.return_url,
    notifyUrl: cfg.notify_url,
    bizContent: {
      out_trade_no: orderNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: amount.toFixed(2),
      subject,
    },
  })
  return { form_html: formStr }
}

/**
 * 生成手机网站支付 URL（WAP 端）
 */
exports.createWapPay = async ({ orderNo, amount, subject, returnUrl }) => {
  const cfg = await platformConfig.get('alipay')
  const sdk = await getSdk()

  const formStr = sdk.pageExec('alipay.trade.wap.pay', {
    returnUrl: returnUrl || cfg.return_url,
    notifyUrl: cfg.notify_url,
    bizContent: {
      out_trade_no: orderNo,
      product_code: 'QUICK_WAP_WAY',
      total_amount: amount.toFixed(2),
      subject,
      quit_url: cfg.return_url,
    },
  })
  return { form_html: formStr }
}

/**
 * 验证异步通知签名
 */
exports.verifyNotify = async (params) => {
  const sdk = await getSdk()
  return sdk.checkNotifySign(params)
}

/**
 * 查询订单状态
 */
exports.queryOrder = async (orderNo) => {
  const sdk = await getSdk()
  return sdk.exec('alipay.trade.query', {
    bizContent: { out_trade_no: orderNo },
  })
}
