// Mock expo-sqlite to avoid loading native modules during tests
jest.mock('expo-sqlite', () => {
  const BetterSQLite3 = require('better-sqlite3')

  return {
    SQLiteDatabase: class {
      constructor(name) {
        this.db = new BetterSQLite3(':memory:')
      }

      async execAsync(sql) {
        // Split multiple statements by semicolon and execute each
        const statements = sql.split(';').filter(s => s.trim())
        for (const stmt of statements) {
          this.db.exec(stmt)
        }
      }

      async getFirstAsync(sql) {
        const stmt = this.db.prepare(sql)
        return stmt.get()
      }

      async getAllAsync(sql) {
        const stmt = this.db.prepare(sql)
        return stmt.all()
      }

      async runAsync(sql, params) {
        const stmt = this.db.prepare(sql)
        return stmt.run(...(params || []))
      }
    },
    openDatabaseAsync: async function(name) {
      return new this.SQLiteDatabase(name)
    }
  }
})
