import { setupDatabase, getDb } from '../db/database'

// expo-sqlite in Jest (Node preset) uses an in-memory SQLite
describe('migrations', () => {
  it('creates players, matches, and match_players tables', async () => {
    await setupDatabase()
    const db = await getDb()

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    const names = tables.map(t => t.name)
    expect(names).toContain('players')
    expect(names).toContain('matches')
    expect(names).toContain('match_players')
  })

  it('migration is idempotent — running twice does not throw', async () => {
    await expect(setupDatabase()).resolves.not.toThrow()
  })
})
