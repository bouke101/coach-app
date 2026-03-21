import { View, Text } from 'react-native'

interface EmptyStateProps {
  message: string
  subMessage?: string
}

export function EmptyState({ message, subMessage }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-lg font-semibold text-slate-700 text-center">
        {message}
      </Text>
      {subMessage ? (
        <Text className="text-sm text-slate-400 text-center mt-2">{subMessage}</Text>
      ) : null}
    </View>
  )
}
