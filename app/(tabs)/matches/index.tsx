import { useCallback, useState } from 'react'
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { router, useFocusEffect, Stack } from 'expo-router'
import { getMatches, type Match } from '@/lib/db/matches'
import { MatchRow } from '@/components/MatchRow'
import { EmptyState } from '@/components/EmptyState'

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await getMatches()
    setMatches(data)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          title: 'Matches',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/new-match')}
              className="mr-4 px-1 py-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-blue-600 text-2xl font-light leading-none">＋</Text>
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : matches.length === 0 ? (
        <EmptyState
          message="No matches yet"
          subMessage="Tap ＋ to start a new match"
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MatchRow
              match={item}
              onPress={() => router.push({ pathname: '/live-match', params: { id: item.id } })}
            />
          )}
          className="flex-1"
        />
      )}
    </View>
  )
}
