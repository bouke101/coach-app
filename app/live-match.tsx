import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

export default function LiveMatchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6 gap-3">
      <Text className="text-2xl font-bold text-slate-900 mb-2">Live Match</Text>
      <Text className="text-base text-slate-500 text-center mb-4">
        Match timers, substitutions and goals are coming in the next update.
      </Text>
      <TouchableOpacity
        onPress={() => router.dismiss(1)}
        className="bg-slate-200 px-6 py-3 rounded-xl w-full items-center"
      >
        <Text className="text-slate-700 font-semibold text-base">← Back to Formation</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.dismissAll()}
        className="bg-blue-600 px-6 py-3 rounded-xl w-full items-center"
      >
        <Text className="text-white font-semibold text-base">Back to Matches</Text>
      </TouchableOpacity>
    </View>
  )
}
