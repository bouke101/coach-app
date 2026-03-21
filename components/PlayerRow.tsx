import { TouchableOpacity, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Player } from '@/lib/db/players'

interface PlayerRowProps {
  player: Player
  onPress: () => void
}

export function PlayerRow({ player, onPress }: PlayerRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100"
      activeOpacity={0.7}
    >
      <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3">
        <Text className="text-sm font-bold text-slate-600">
          {player.number ?? '—'}
        </Text>
      </View>
      <Text className="text-base font-medium text-slate-900 flex-1">{player.name}</Text>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  )
}
