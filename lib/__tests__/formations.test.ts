import { getFormations, getSlots } from '../formations'

describe('getFormations', () => {
  it('returns formations for 8v8', () => {
    const f = getFormations('8v8')
    expect(f.length).toBeGreaterThan(0)
    expect(f[0]).toHaveProperty('id')
    expect(f[0]).toHaveProperty('label')
  })

  it('returns different formations for each game type', () => {
    expect(getFormations('6v6')).not.toEqual(getFormations('8v8'))
    expect(getFormations('11v11')).not.toEqual(getFormations('8v8'))
  })
})

describe('getSlots', () => {
  it('returns the correct number of slots for 8v8 1-3-2-2', () => {
    const slots = getSlots('8v8', '1-3-2-2')
    expect(slots).toHaveLength(8)
  })

  it('always has exactly one GK slot at index 0', () => {
    const slots = getSlots('8v8', '1-3-2-2')
    expect(slots[0].position).toBe('GK')
  })

  it('every slot has id, position, x (0-1), y (0-1)', () => {
    const slots = getSlots('6v6', '1-2-2-1')
    for (const slot of slots) {
      expect(slot).toHaveProperty('id')
      expect(slot).toHaveProperty('position')
      expect(slot.x).toBeGreaterThanOrEqual(0)
      expect(slot.x).toBeLessThanOrEqual(1)
      expect(slot.y).toBeGreaterThanOrEqual(0)
      expect(slot.y).toBeLessThanOrEqual(1)
    }
  })
})
