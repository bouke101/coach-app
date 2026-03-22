export type GameType = '6v6' | '8v8' | '11v11'

export interface FormationTemplate {
  id: string     // e.g. '1-3-2-2'
  label: string  // display label, same as id
}

export interface PositionSlot {
  id: string      // e.g. 'gk', 'cb-l', 'st-r'
  position: string // label shown on pitch: 'GK', 'CB', 'ST', etc.
  x: number       // 0 (left) to 1 (right)
  y: number       // 0 (top/attack end) to 1 (bottom/GK end)
}

// --- Formation templates ---

const FORMATIONS: Record<GameType, FormationTemplate[]> = {
  '6v6': [
    { id: '1-2-2-1', label: '1-2-2-1' },
    { id: '1-2-3',   label: '1-2-3' },
    { id: '1-3-2',   label: '1-3-2' },
  ],
  '8v8': [
    { id: '1-3-2-2', label: '1-3-2-2' },
    { id: '1-2-3-2', label: '1-2-3-2' },
    { id: '1-2-2-3', label: '1-2-2-3' },
    { id: '1-4-2-1', label: '1-4-2-1' },
  ],
  '11v11': [
    { id: '1-4-3-3',   label: '1-4-3-3' },
    { id: '1-4-4-2',   label: '1-4-4-2' },
    { id: '1-3-5-2',   label: '1-3-5-2' },
    { id: '1-4-2-3-1', label: '1-4-2-3-1' },
  ],
}

export function getFormations(gameType: GameType): FormationTemplate[] {
  return FORMATIONS[gameType]
}

// --- Position slots ---
// x: 0=left edge, 1=right edge
// y: 0=top (attack), 1=bottom (GK end)

type SlotDef = Omit<PositionSlot, 'id'> & { id: string }

function row(positions: string[], y: number): SlotDef[] {
  const n = positions.length
  return positions.map((position, i) => ({
    id: `${position.toLowerCase()}-${i}`,
    position,
    x: n === 1 ? 0.5 : i / (n - 1),
    y,
  }))
}

const SLOTS: Record<string, PositionSlot[]> = {
  // 6v6
  '6v6:1-2-2-1': [
    ...row(['GK'],        0.92),
    ...row(['CB', 'CB'],  0.72),
    ...row(['CM', 'CM'],  0.45),
    ...row(['ST'],        0.12),
  ],
  '6v6:1-2-3': [
    ...row(['GK'],              0.92),
    ...row(['CB', 'CB'],        0.68),
    ...row(['LW', 'CM', 'RW'], 0.28),
  ],
  '6v6:1-3-2': [
    ...row(['GK'],              0.92),
    ...row(['LB', 'CB', 'RB'], 0.65),
    ...row(['LW', 'RW'],        0.25),
  ],
  // 8v8
  '8v8:1-3-2-2': [
    ...row(['GK'],              0.92),
    ...row(['LB', 'CB', 'RB'], 0.70),
    ...row(['LCM', 'RCM'],      0.47),
    ...row(['LW', 'RW'],        0.18),
  ],
  '8v8:1-2-3-2': [
    ...row(['GK'],                    0.92),
    ...row(['LB', 'RB'],              0.72),
    ...row(['LM', 'CM', 'RM'],        0.47),
    ...row(['LS', 'RS'],              0.18),
  ],
  '8v8:1-2-2-3': [
    ...row(['GK'],              0.92),
    ...row(['LB', 'RB'],        0.72),
    ...row(['LCM', 'RCM'],      0.50),
    ...row(['LW', 'ST', 'RW'], 0.18),
  ],
  '8v8:1-4-2-1': [
    ...row(['GK'],                    0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'], 0.68),
    ...row(['LCM', 'RCM'],            0.43),
    ...row(['ST'],                    0.15),
  ],
  // 11v11
  '11v11:1-4-3-3': [
    ...row(['GK'],                         0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'],    0.70),
    ...row(['LCM', 'CM', 'RCM'],           0.48),
    ...row(['LW', 'ST', 'RW'],             0.18),
  ],
  '11v11:1-4-4-2': [
    ...row(['GK'],                         0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'],    0.70),
    ...row(['LM', 'LCM', 'RCM', 'RM'],    0.48),
    ...row(['LS', 'RS'],                   0.18),
  ],
  '11v11:1-3-5-2': [
    ...row(['GK'],                              0.92),
    ...row(['LCB', 'CB', 'RCB'],               0.72),
    ...row(['LM', 'LCM', 'CM', 'RCM', 'RM'],  0.47),
    ...row(['LS', 'RS'],                        0.18),
  ],
  '11v11:1-4-2-3-1': [
    ...row(['GK'],                         0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'],    0.72),
    ...row(['LDM', 'RDM'],                 0.55),
    ...row(['LW', 'AM', 'RW'],             0.35),
    ...row(['ST'],                         0.12),
  ],
}

export function getSlots(gameType: GameType, formationId: string): PositionSlot[] {
  return SLOTS[`${gameType}:${formationId}`] ?? []
}
