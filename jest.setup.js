// Mock expo-sqlite to avoid loading native modules during tests
jest.mock('expo-sqlite', () => {
  const BetterSQLite3 = require('better-sqlite3')

  class SQLiteDatabase {
    constructor(name) {
      this.db = new BetterSQLite3(':memory:')
    }

    async execAsync(sql) {
      this.db.exec(sql)
    }

    async getFirstAsync(sql, params) {
      const stmt = this.db.prepare(sql)
      return stmt.get(params ?? []) ?? null
    }

    async getAllAsync(sql, params) {
      const stmt = this.db.prepare(sql)
      return stmt.all(params ?? [])
    }

    async runAsync(sql, params) {
      const stmt = this.db.prepare(sql)
      return Array.isArray(params) ? stmt.run(...params) : stmt.run(params ?? [])
    }

    async withTransactionAsync(task) {
      this.db.exec('BEGIN')
      try {
        await task()
        this.db.exec('COMMIT')
      } catch (e) {
        this.db.exec('ROLLBACK')
        throw e
      }
    }
  }

  return {
    SQLiteDatabase,
    openDatabaseAsync: async function(name) {
      return new SQLiteDatabase(name)
    }
  }
})

// Mock expo-crypto to use Node's built-in crypto
jest.mock('expo-crypto', () => {
  const crypto = require('crypto')
  return {
    randomUUID: () => crypto.randomUUID()
  }
})
