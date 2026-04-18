const { query, queryOne } = require('../config/db')

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0'
}

function classifyIp(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return '本地'
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) return '内网'
  if (ip.startsWith('::ffff:')) {
    const v4 = ip.slice(7)
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/.test(v4)) return '内网'
  }
  return '外网'
}

// POST /api/track
exports.track = async (req, res) => {
  try {
    const { path } = req.body
    if (!path) return res.json({ success: true })
    const ip = getClientIp(req)
    const userId = req.user?.id || null
    const ua = (req.headers['user-agent'] || '').slice(0, 500)
    await query(
      'INSERT INTO visit_logs (user_id, ip, path, user_agent) VALUES (?, ?, ?, ?)',
      [userId, ip, path.slice(0, 255), ua]
    )
    res.json({ success: true })
  } catch (_) {
    res.json({ success: true })
  }
}

// GET /api/admin/analytics
exports.overview = async (req, res) => {
  const [todayVisits, uniqueIps, weekTrend, hourly, topPages, recentVisitors] = await Promise.all([
    // 今日访问量
    queryOne("SELECT COUNT(*) as c FROM visit_logs WHERE DATE(created_at) = CURDATE()"),
    // 今日独立IP
    queryOne("SELECT COUNT(DISTINCT ip) as c FROM visit_logs WHERE DATE(created_at) = CURDATE()"),
    // 近7天每天访问量
    query(`SELECT DATE(created_at) as date, COUNT(*) as visits, COUNT(DISTINCT ip) as unique_ips
           FROM visit_logs
           WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           GROUP BY DATE(created_at)
           ORDER BY date ASC`),
    // 24小时分布
    query(`SELECT HOUR(created_at) as hour, COUNT(*) as visits
           FROM visit_logs
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           GROUP BY HOUR(created_at)
           ORDER BY hour ASC`),
    // 热门页面 Top 10
    query(`SELECT path, COUNT(*) as visits, COUNT(DISTINCT ip) as unique_ips
           FROM visit_logs
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           GROUP BY path
           ORDER BY visits DESC
           LIMIT 10`),
    // 最近访客
    query(`SELECT vl.id, vl.ip, vl.path, vl.created_at,
                  u.id as user_id, u.nickname, u.avatar
           FROM visit_logs vl
           LEFT JOIN users u ON u.id = vl.user_id
           ORDER BY vl.created_at DESC
           LIMIT 50`),
  ])

  // 填充7天空白
  const trend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const found = weekTrend.find(r => r.date?.toISOString?.()?.slice(0, 10) === dateStr || r.date === dateStr)
    trend.push({ date: dateStr, visits: found?.visits || 0, unique_ips: found?.unique_ips || 0 })
  }

  // 填充24小时空白
  const hours = Array.from({ length: 24 }, (_, h) => {
    const found = hourly.find(r => r.hour === h)
    return { hour: h, visits: found?.visits || 0 }
  })

  const visitors = recentVisitors.map(v => ({
    ...v,
    ip_type: classifyIp(v.ip),
    display_ip: v.ip?.startsWith('::ffff:') ? v.ip.slice(7) : v.ip,
  }))

  res.json({
    success: true,
    data: {
      today_visits: todayVisits.c,
      today_unique_ips: uniqueIps.c,
      week_trend: trend,
      hourly_distribution: hours,
      top_pages: topPages,
      recent_visitors: visitors,
    },
  })
}

// GET /api/admin/analytics/ips?search=&page=1
exports.ipList = async (req, res) => {
  const { search, page = 1, limit = 30 } = req.query
  const offset = (page - 1) * limit
  let where = '1=1'
  const params = []
  if (search) {
    where += ' AND (vl.ip LIKE ? OR u.nickname LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  const [list, [{ total }]] = await Promise.all([
    query(
      `SELECT vl.ip, vl.path, vl.created_at,
              u.id as user_id, u.nickname, u.role,
              vl.user_agent
       FROM visit_logs vl
       LEFT JOIN users u ON u.id = vl.user_id
       WHERE ${where}
       ORDER BY vl.created_at DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    ),
    query(`SELECT COUNT(*) as total FROM visit_logs vl LEFT JOIN users u ON u.id = vl.user_id WHERE ${where}`, params),
  ])

  const formatted = list.map(v => ({
    ...v,
    ip_type: classifyIp(v.ip),
    display_ip: v.ip?.startsWith('::ffff:') ? v.ip.slice(7) : v.ip,
  }))

  res.json({ success: true, data: { list: formatted, total, page: parseInt(page) } })
}
