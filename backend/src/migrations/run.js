/**
 * 迁移运行器 - 幂等，只执行未运行过的 SQL 文件
 * 执行记录保存在 schema_migrations 表中
 */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
require('dotenv').config({ path: path.join(__dirname, '../../../.env') })

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zhichuang',
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  console.log('✅ 数据库连接成功')

  // 确保追踪表存在
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // 查询已执行的迁移
  const [applied] = await conn.query('SELECT filename FROM schema_migrations')
  const appliedSet = new Set(applied.map(r => r.filename))

  // 读取所有 *.sql 文件，按文件名排序
  const dir = path.join(__dirname)
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  let count = 0
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  ⏭  跳过 ${file}（已执行）`)
      continue
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    try {
      await conn.query(sql)
      await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
      console.log(`  ✅ 执行 ${file}`)
      count++
    } catch (err) {
      console.error(`  ❌ ${file} 执行失败: ${err.message}`)
      await conn.end()
      process.exit(1)
    }
  }

  if (count === 0) {
    console.log('  ✅ 无待执行迁移')
  } else {
    console.log(`✅ 迁移完成，共执行 ${count} 个文件`)
  }

  await conn.end()
}

run().catch(err => {
  console.error('迁移失败:', err)
  process.exit(1)
})
