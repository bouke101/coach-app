import { View } from 'react-native'
import { EmptyState } from '@/components/EmptyState'

export default function SquadScreen() {
  return (
    <View className="flex-1 bg-slate-50">
      <EmptyState message="Loading squad..." />
    </View>
  )
}
