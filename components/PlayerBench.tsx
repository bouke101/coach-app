import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
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
  onToggleAbsent: (playerId: string) => void
  onDragStart: (payload: DragStartPayload) => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}

export function PlayerBench({ players, absentIds, assignedIds, onToggleAbsent, onDragStart, onDragMove, onDragEnd }: PlayerBenchProps) {
  return (
    <View>
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 mb-2">
        Players — tap to mark absent · drag to place on pitch
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        className="pb-2"
      >
        {players.map((player) => {
          const absent = absentIds.has(player.id)
          const onPitch = assignedIds.has(player.id)

          const panGesture = Gesture.Pan()
            .runOnJS(true)
            .onStart((e) => {
              if (absent) return
              onDragStart({ playerId: player.id, startX: e.absoluteX, startY: e.absoluteY })
            })
            .onUpdate((e) => {
              if (absent) return
              onDragMove(e.absoluteX, e.absoluteY)
            })
            .onEnd((e) => {
              if (absent) return
              onDragEnd(e.absoluteX, e.absoluteY)
            })

          return (
            <GestureDetector key={player.id} gesture={panGesture}>
              <TouchableOpacity
                onPress={() => onToggleAbsent(player.id)}
                activeOpacity={0.8}
                className={`items-center px-3 py-2 rounded-xl border ${
                  absent
                    ? 'bg-slate-100 border-slate-200 opacity-40'
                    : onPitch
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-slate-200'
                }`}
                style={{ minWidth: 60 }}
              >
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                    absent ? 'bg-slate-300' : onPitch ? 'bg-green-500' : 'bg-blue-100'
                  }`}
                >
                  <Text className={`text-xs font-bold ${absent ? 'text-slate-500' : onPitch ? 'text-white' : 'text-blue-700'}`}>
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
      </ScrollView>
    </View>
  )
}
