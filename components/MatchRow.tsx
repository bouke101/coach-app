import { TouchableOpacity, View, Text } from 'react-native'
import type { Match } from '@/lib/db/matches'

interface MatchRowProps {
  match: Match
  onPress: () => void
}

const STATUS_LABEL: Record<Match['status'], string> = {
  in_progress: 'In progress',
  finished: 'Finished',
}

const STATUS_COLOR: Record<Match['status'], string> = {
  in_progress: 'text-amber-600',
  finished: 'text-slate-400',
}

export function MatchRow({ match, onPress }: MatchRowProps) {
  const date = new Date(match.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100"
      activeOpacity={0.7}
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900">vs {match.opponent}</Text>
        <Text className="text-sm text-slate-500 mt-0.5">
          {date} · {match.venue === 'home' ? 'Home' : 'Away'} · {match.game_type}
        </Text>
      </View>
      <Text className={`text-sm font-medium ${STATUS_COLOR[match.status]}`}>
        {STATUS_LABEL[match.status]}
      </Text>
    </TouchableOpacity>
  )
}
