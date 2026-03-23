import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import type { MatchEvent } from '@/lib/db/match-events'
import type { MatchPlayer } from '@/lib/db/matches'
import type { Player } from '@/lib/db/players'

interface Segment {
  type: 'pitch' | 'bench'
  position: string | null
  startSecs: number
  endSecs: number | null   // null = still ongoing
  swapLabel: string | null // "→ off for X" or "→ on for X"
}

interface Props {
  matchPlayers: MatchPlayer[]
  events: MatchEvent[]
  currentElapsed: number
  half: 1 | 2 | 'halftime' | 'finished'
  playerMap: Map<string, Player>
  expandedPlayerId: string | null
  onToggleExpand: (playerId: string) => void
}

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatRange(start: number, end: number | null): string {
  return `${formatSecs(start)} → ${end !== null ? formatSecs(end) : 'now'}`
}

function buildSegments(
  playerId: string,
  matchPlayers: MatchPlayer[],
  events: MatchEvent[],
  currentElapsed: number,
  playerMap: Map<string, Player>
): Segment[] {
  const mp = matchPlayers.find(m => m.player_id === playerId)
  if (!mp) return []

  const segments: Segment[] = []

  // Running position map for ALL players — needed to derive playerA's OLD position for position_swap
  // events where we are player_off_id (event stores playerA's new pos, not playerA's old pos).
  const positionMap = new Map<string, string | null>(
    matchPlayers.filter(m => m.role === 'starter').map(m => [m.player_id, m.position])
  )

  let currentType: 'pitch' | 'bench' = mp.role === 'starter' ? 'pitch' : 'bench'
  let currentPosition: string | null = mp.position
  let currentStart = 0

  // Single pass over ALL sub/swap events in order:
  // - Always update positionMap (needed for position_swap lookup)
  // - Only push to segments when this player is involved
  for (const event of events) {
    if (event.type !== 'substitution' && event.type !== 'position_swap') continue
    if (!event.player_id || !event.player_off_id) continue

    if (event.type === 'substitution') {
      positionMap.set(event.player_id, event.position ?? null)
      positionMap.set(event.player_off_id, null)

      if (event.player_off_id === playerId) {
        const otherName = playerMap.get(event.player_id)?.name.split(' ')[0] ?? ''
        segments.push({ type: currentType, position: currentPosition, startSecs: currentStart, endSecs: event.match_time, swapLabel: `→ off for ${otherName}` })
        currentType = 'bench'; currentPosition = null; currentStart = event.match_time
      } else if (event.player_id === playerId) {
        const otherName = playerMap.get(event.player_off_id)?.name.split(' ')[0] ?? ''
        segments.push({ type: currentType, position: currentPosition, startSecs: currentStart, endSecs: event.match_time, swapLabel: `→ on for ${otherName}` })
        currentType = 'pitch'; currentPosition = event.position ?? null; currentStart = event.match_time
      }
    } else if (event.type === 'position_swap') {
      // event.position = playerA's new pos = playerB's old pos
      // playerA's old pos = playerB's new pos = positionMap[playerA] BEFORE update
      const playerAOldPos = positionMap.get(event.player_id) ?? null
      positionMap.set(event.player_id, event.position ?? null)
      positionMap.set(event.player_off_id, playerAOldPos)

      if (event.player_id === playerId || event.player_off_id === playerId) {
        segments.push({ type: 'pitch', position: currentPosition, startSecs: currentStart, endSecs: event.match_time, swapLabel: null })
        currentPosition = event.player_id === playerId ? (event.position ?? null) : playerAOldPos
        currentStart = event.match_time
      }
    }
  }

  // Add current open segment
  segments.push({ type: currentType, position: currentPosition, startSecs: currentStart, endSecs: null, swapLabel: null })

  return segments
}

export function StatsPlayerTime({ matchPlayers, events, currentElapsed, half: _half, playerMap, expandedPlayerId, onToggleExpand }: Props) {
  const playerIds = matchPlayers.map(mp => mp.player_id)

  return (
    <View className="px-4 mb-4">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Player Time</Text>
      <View className="gap-2">
        {playerIds.map(playerId => {
          const player = playerMap.get(playerId)
          if (!player) return null
          const segments = buildSegments(playerId, matchPlayers, events, currentElapsed, playerMap)
          const expanded = expandedPlayerId === playerId
          const totalPitchSecs = segments
            .filter(s => s.type === 'pitch')
            .reduce((sum, s) => sum + ((s.endSecs ?? currentElapsed) - s.startSecs), 0)

          const currentSeg = segments[segments.length - 1]

          return (
            <TouchableOpacity
              key={playerId}
              onPress={() => onToggleExpand(playerId)}
              className={`bg-white rounded-xl border ${expanded ? 'border-blue-400' : 'border-slate-200'} overflow-hidden`}
            >
              {/* Collapsed row */}
              <View className="flex-row items-center px-3 py-2 gap-2">
                <Text className="font-bold text-sm text-slate-800 flex-1">
                  #{player.number ?? '?'} {player.name.split(' ')[0]}
                </Text>
                <View className="flex-row gap-1 flex-wrap justify-end" style={{ maxWidth: '60%' }}>
                  {segments.map((seg, i) => (
                    <View
                      key={i}
                      className={`px-2 py-0.5 rounded ${seg.type === 'pitch' ? 'bg-green-100' : 'bg-amber-100'}`}
                    >
                      <Text className={`text-xs font-bold ${seg.type === 'pitch' ? 'text-green-800' : 'text-amber-800'}`}>
                        {seg.type === 'pitch' ? `${seg.position} ` : 'bench '}
                        {formatSecs((seg.endSecs ?? currentElapsed) - seg.startSecs)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</Text>
              </View>

              {/* Expanded timeline */}
              {expanded && (
                <View className="border-t border-slate-100 px-3 py-3">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row items-start gap-2">
                      {segments.map((seg, i) => (
                        <View key={i} className="flex-row items-start">
                          <View
                            className={`rounded-xl px-3 py-2 items-center ${
                              seg.type === 'pitch' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                            }`}
                            style={{ minWidth: 90 }}
                          >
                            <Text className={`text-xs font-bold uppercase ${seg.type === 'pitch' ? 'text-green-700' : 'text-amber-700'}`}>
                              {seg.type === 'pitch' ? seg.position : 'Bench'}
                            </Text>
                            <Text className={`font-black mt-0.5 ${seg.type === 'pitch' ? 'text-green-800' : 'text-amber-800'}`} style={{ fontSize: 15 }}>
                              {formatSecs((seg.endSecs ?? currentElapsed) - seg.startSecs)}
                            </Text>
                            <Text className={`text-xs mt-0.5 ${seg.type === 'pitch' ? 'text-green-600' : 'text-amber-600'}`}>
                              {formatRange(seg.startSecs, seg.endSecs)}
                            </Text>
                          </View>
                          {i < segments.length - 1 && seg.swapLabel && (
                            <View className="items-center justify-center px-1 mt-3">
                              <Text className="text-slate-400 text-xs">›</Text>
                              <Text className="text-slate-400" style={{ fontSize: 9 }}>{seg.swapLabel}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  <View className="flex-row justify-between mt-2 pt-2 border-t border-slate-100">
                    <Text className="text-xs text-slate-500">Total pitch time</Text>
                    <Text className="text-xs font-bold text-slate-800">{formatSecs(totalPitchSecs)}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
