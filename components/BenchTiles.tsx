import { View, Text, TouchableOpacity } from 'react-native'
import type { Player } from '@/lib/db/players'

interface BenchPlayer {
  player: Player
  benchElapsed: number  // seconds this player has been on bench in current half
}

interface Props {
  benchPlayers: BenchPlayer[]
  selectedPlayerId: string | null
  onSelect: (playerId: string) => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function BenchTiles({ benchPlayers, selectedPlayerId, onSelect }: Props) {
  if (benchPlayers.length === 0) return null

  return (
    <View className="px-3 pb-4">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Bench</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {benchPlayers.map(({ player, benchElapsed }) => {
          const selected = selectedPlayerId === player.id
          return (
            <TouchableOpacity
              key={player.id}
              onPress={() => onSelect(player.id)}
              className={`items-center px-3 py-2 rounded-xl border ${
                selected
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-slate-200'
              }`}
              style={{ minWidth: 70 }}
            >
              <Text className={`text-xs font-bold ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                #{player.number ?? '?'} {player.name.split(' ')[0]}
              </Text>
              <Text
                className="font-bold mt-1"
                style={{ fontSize: 15, color: '#d97706', fontVariant: ['tabular-nums'] }}
              >
                {formatTime(benchElapsed)}
              </Text>
              {selected && (
                <Text className="text-xs text-blue-600 mt-0.5 font-semibold">selected</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
