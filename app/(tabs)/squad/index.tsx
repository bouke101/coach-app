import { useCallback, useState } from 'react'
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { router, useFocusEffect, Stack } from 'expo-router'
import { getPlayers, type Player } from '@/lib/db/players'
import { PlayerRow } from '@/components/PlayerRow'
import { EmptyState } from '@/components/EmptyState'

export default function SquadScreen() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await getPlayers()
    setPlayers(data)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          title: 'Squad',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/add-player')}
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
      ) : players.length === 0 ? (
        <EmptyState
          message="No players yet"
          subMessage="Tap ＋ to add your squad"
        />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PlayerRow
              player={item}
              onPress={() =>
                router.push({ pathname: '/edit-player', params: { id: item.id } })
              }
            />
          )}
          className="flex-1"
        />
      )}
    </View>
  )
}
