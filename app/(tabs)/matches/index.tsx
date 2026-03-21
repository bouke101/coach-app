import { View } from 'react-native'
import { EmptyState } from '@/components/EmptyState'

export default function MatchesScreen() {
  return (
    <View className="flex-1 bg-slate-50">
      <EmptyState
        message="No matches yet"
        subMessage="Coming in the next update"
      />
    </View>
  )
}
