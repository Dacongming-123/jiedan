const { query, queryOne, transaction } = require('../config/db')
const dayjs = require('dayjs')
const wechatPay = require('../services/wechatPay')
const alipayService = require('../services/alipayService')

function genPaymentNo() {
  return 'PAY' + dayjs().format('YYMMDDHHmmss') + Math.random().toString(36).slice(2, 6).toUpperCase()
}

// 支付成功后的统一处理（mock / 真实回调均调用此函数）
async function handlePaySuccess(orderId, paymentNo, method, amount) {
  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId])
  if (!o || o.status !== 'confirmed') return

  await transaction(async (conn) => {
    // 避免重复处理
    const existing = await queryOne('SELECT id FROM payments WHERE order_id = ? AND status = ?', [orderId, 'success'])
    if (existing) return

    await conn.execute(
      "INSERT INTO payments (payment_no, order_id, payer_id, amount, method, status, paid_at) VALUES (?, ?, ?, ?, ?, 'success', NOW())",
      [paymentNo, orderId, o.employer_id, amount, method]
    )
    await conn.execute(
      "UPDATE orders SET status = 'in_progress', start_date = NOW(), expected_end = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?",
      [o.deadline_days, orderId]
    )
    await conn.execute(
      'INSERT INTO wallets (user_id, frozen) VALUES (?, ?) ON DUPLICATE KEY UPDATE frozen = frozen + ?',
      [o.creator_id, o.creator_income, o.creator_income]
    )
    await conn.execute(
      "INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, ref_type, ref_id, description) SELECT id, ?, 'freeze', ?, 'order', ?, ? FROM wallets WHERE user_id = ?",
      [o.creator_id, o.creator_income, orderId, `款项托管（待交付结算）· ${o.order_no}`, o.creator_id]
    )
    await conn.execute(
      'INSERT INTO wallets (user_id, total_spent) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_spent = total_spent + ?',
      [o.employer_id, amount, amount]
    )
    await conn.execute(
      "INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, ref_type, ref_id, description) SELECT id, ?, 'expense', ?, 'order', ?, ? FROM wallets WHERE user_id = ?",
      [o.employer_id, -amount, orderId, `项目付款 · ${o.order_no}`, o.employer_id]
    )
    await conn.execute(
      "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'payment', '付款成功，项目已开始', '项目正式开始，加油！', ?)",
      [o.creator_id, `/orders/${orderId}`]
    )
  })

  const milestones = await query('SELECT id FROM milestones WHERE order_id = ?', [orderId])
  if (milestones.length === 0) {
    await query(
      "INSERT INTO milestones (order_id, title, description, percentage, sort_order) VALUES (?, '项目完成', '完成全部工作内容', 100, 1)",
      [orderId]
    )
  }
}

// ── Mock 支付（开发/测试用） ──────────────────────────────
exports.mockPay = async (req, res) => {
  const { order_id } = req.body
  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [order_id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
  if (o.status !== 'confirmed') return res.status(400).json({ success: false, message: '订单状态不允许支付' })

  const paymentNo = genPaymentNo()
  await handlePaySuccess(order_id, paymentNo, 'mock', o.final_price)
  res.json({ success: true, data: { payment_no: paymentNo, status: 'success' } })
}

// ── 微信支付 Native（扫码） ────────────────────────────────
exports.createWechat = async (req, res) => {
  const { order_id } = req.body
  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [order_id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
  if (o.status !== 'confirmed') return res.status(400).json({ success: false, message: '订单状态不允许支付' })

  const paymentNo = genPaymentNo()
  // 预先创建 pending 记录，回调时更新
  await query(
    "INSERT INTO payments (payment_no, order_id, payer_id, amount, method, status) VALUES (?, ?, ?, ?, 'wechat', 'pending')",
    [paymentNo, order_id, req.user.id, o.final_price]
  )

  const { code_url, qr_base64 } = await wechatPay.createNativeOrder({
    orderNo: paymentNo,
    amount: o.final_price,
    description: o.title?.slice(0, 127) || '项目款项',
  })

  res.json({ success: true, data: { payment_no: paymentNo, code_url, qr_base64 } })
}

// ── 支付宝 PC 支付 ─────────────────────────────────────────
exports.createAlipay = async (req, res) => {
  const { order_id } = req.body
  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [order_id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
  if (o.status !== 'confirmed') return res.status(400).json({ success: false, message: '订单状态不允许支付' })

  const paymentNo = genPaymentNo()
  await query(
    "INSERT INTO payments (payment_no, order_id, payer_id, amount, method, status) VALUES (?, ?, ?, ?, 'alipay', 'pending')",
    [paymentNo, order_id, req.user.id, o.final_price]
  )

  const { form_html } = await alipayService.createPagePay({
    orderNo: paymentNo,
    amount: o.final_price,
    subject: o.title?.slice(0, 256) || '项目款项',
  })

  res.json({ success: true, data: { payment_no: paymentNo, form_html } })
}

// ── 轮询支付状态（前端扫码后轮询） ────────────────────────
exports.status = async (req, res) => {
  const { paymentNo } = req.params
  const row = await queryOne('SELECT status FROM payments WHERE payment_no = ?', [paymentNo])
  if (!row) return res.status(404).json({ success: false, message: '支付记录不存在' })
  res.json({ success: true, data: { status: row.status } })
}

// ── 微信支付回调（NOTIFY_URL） ────────────────────────────
exports.wechatNotify = async (req, res) => {
  try {
    const result = await wechatPay.handleNotify(req.headers, req.rawBody)
    if (result.trade_state === 'SUCCESS') {
      const pmt = await queryOne('SELECT * FROM payments WHERE payment_no = ?', [result.out_trade_no])
      if (pmt && pmt.status === 'pending') {
        await query("UPDATE payments SET status = 'success', paid_at = NOW() WHERE payment_no = ?", [result.out_trade_no])
        await handlePaySuccess(pmt.order_id, pmt.payment_no, 'wechat', pmt.amount)
      }
    }
    res.json({ code: 'SUCCESS', message: '成功' })
  } catch (e) {
    console.error('[WechatNotify]', e)
    res.status(400).json({ code: 'FAIL', message: e.message })
  }
}

// ── 支付宝回调（NOTIFY_URL） ──────────────────────────────
exports.alipayNotify = async (req, res) => {
  try {
    const valid = await alipayService.verifyNotify(req.body)
    if (!valid) return res.send('fail')

    const { out_trade_no, trade_status } = req.body
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      const pmt = await queryOne('SELECT * FROM payments WHERE payment_no = ?', [out_trade_no])
      if (pmt && pmt.status === 'pending') {
        await query("UPDATE payments SET status = 'success', paid_at = NOW() WHERE payment_no = ?", [out_trade_no])
        await handlePaySuccess(pmt.order_id, pmt.payment_no, 'alipay', pmt.amount)
      }
    }
    res.send('success')
  } catch (e) {
    console.error('[AlipayNotify]', e)
    res.send('fail')
  }
}
