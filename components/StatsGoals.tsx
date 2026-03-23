import { View, Text } from 'react-native'
import type { MatchEvent } from '@/lib/db/match-events'
import type { Player } from '@/lib/db/players'

interface Props {
  events: MatchEvent[]
  playerMap: Map<string, Player>
}

function formatTime(secs: number): string {
  return `${Math.floor(secs / 60)}'`
}

export function StatsGoals({ events, playerMap }: Props) {
  const goalEvents = events.filter(e => e.type === 'goal')

  if (goalEvents.length === 0) {
    return (
      <View className="px-4 mb-4">
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Goals</Text>
        <Text className="text-sm text-slate-400 text-center py-4">No goals yet</Text>
      </View>
    )
  }

  let ourRunning = 0
  let oppRunning = 0

  const rows = goalEvents.map((e) => {
    if (e.team === 'our_team') ourRunning++
    else oppRunning++
    const scorer = e.player_id ? playerMap.get(e.player_id) : null
    return { event: e, ourRunning, oppRunning, scorer }
  })

  return (
    <View className="px-4 mb-4">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Goals</Text>
      <View className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <View className="flex-row items-center px-3 py-2 bg-slate-50 border-b border-slate-100">
          <Text className="flex-1 text-xs font-bold text-slate-500">Our Team</Text>
          <Text className="w-12 text-center text-xs font-bold text-slate-500">Score</Text>
          <Text className="flex-1 text-xs font-bold text-red-400 text-right">Opponent</Text>
        </View>
        {rows.map(({ event, ourRunning, oppRunning, scorer }) => (
          <View key={event.id} className="flex-row items-center px-3 py-2 border-b border-slate-50">
            <View className="flex-1">
              {event.team === 'our_team' && (
                <Text className="text-sm font-semibold text-slate-800">
                  {scorer?.name.split(' ')[0] ?? 'Unknown'}{' '}
                  <Text className="text-slate-400 font-normal">{formatTime(event.match_time)}</Text>
                </Text>
              )}
            </View>
            <Text className="w-12 text-center font-bold text-slate-900">
              {ourRunning}–{oppRunning}
            </Text>
            <View className="flex-1 items-end">
              {event.team === 'opponent' && (
                <Text className="text-sm font-semibold text-red-500">
                  <Text className="text-slate-400 font-normal">{formatTime(event.match_time)} </Text>
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
