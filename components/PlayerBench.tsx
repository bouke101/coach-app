import { View, Text, TouchableOpacity } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import type { Player } from '@/lib/db/players'

export interface DragStartPayload {
  playerId: string
  startX: number
  startY: number
}

interface PlayerBenchProps {
  players: Player[]
  absentIds: Set<string>
  assignedIds: Set<string>
  dragX: SharedValue<number>
  dragY: SharedValue<number>
  onToggleAbsent: (playerId: string) => void
  onDragStart: (payload: DragStartPayload) => void
  onDragEnd: (x: number, y: number) => void
}

export function PlayerBench({
  players, absentIds, assignedIds, dragX, dragY,
  onToggleAbsent, onDragStart, onDragEnd,
}: PlayerBenchProps) {
  // Bench = players not assigned to pitch (absent ones stay visible so coach can un-absent them)
  const benchPlayers = players.filter((p) => !assignedIds.has(p.id))

  return (
    <View className="px-4">
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Players — tap to mark absent · drag to place on pitch
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {benchPlayers.map((player) => {
          const absent = absentIds.has(player.id)

          const panGesture = Gesture.Pan()
            .onStart((e) => {
              if (absent) return
              runOnJS(onDragStart)({ playerId: player.id, startX: e.absoluteX, startY: e.absoluteY })
            })
            .onUpdate((e) => {
              // Runs on UI thread — sets shared values directly, no JS bridge round-trip
              if (absent) return
              dragX.value = e.absoluteX
              dragY.value = e.absoluteY
            })
            .onEnd((e) => {
              if (absent) return
              runOnJS(onDragEnd)(e.absoluteX, e.absoluteY)
            })

          return (
            <GestureDetector key={player.id} gesture={panGesture}>
              <TouchableOpacity
                onPress={() => onToggleAbsent(player.id)}
                activeOpacity={0.8}
                className={`items-center px-3 py-2 rounded-xl border ${
                  absent
                    ? 'bg-slate-100 border-slate-200 opacity-40'
                    : 'bg-white border-slate-200'
                }`}
                style={{ minWidth: 60 }}
              >
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                    absent ? 'bg-slate-300' : 'bg-blue-100'
                  }`}
                >
                  <Text className={`text-xs font-bold ${absent ? 'text-slate-500' : 'text-blue-700'}`}>
                    {player.number ?? '?'}
                  </Text>
                </View>
                <Text
                  className={`text-xs font-medium text-center ${absent ? 'text-slate-400' : 'text-slate-700'}`}
                  numberOfLines={1}
                  style={{ maxWidth: 56 }}
                >
                  {player.name.split(' ')[0]}
                </Text>
                {absent && (
                  <Text className="text-xs text-slate-400 mt-0.5">absent</Text>
                )}
              </TouchableOpacity>
            </GestureDetector>
          )
        })}
      </View>
    </View>
  )
}
