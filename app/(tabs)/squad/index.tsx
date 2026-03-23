import { useCallback, useState, useRef } from 'react'
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator, TextInput } from 'react-native'
import { router, useFocusEffect, Stack } from 'expo-router'
import { getPlayers, type Player } from '@/lib/db/players'
import { getSetting, setSetting } from '@/lib/db/settings'
import { PlayerRow } from '@/components/PlayerRow'
import { EmptyState } from '@/components/EmptyState'

export default function SquadScreen() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState('')
  const teamNameRef = useRef('')

  const load = useCallback(async () => {
    const [data, name] = await Promise.all([getPlayers(), getSetting('team_name')])
    setPlayers(data)
    const resolved = name ?? ''
    setTeamName(resolved)
    teamNameRef.current = resolved
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function handleTeamNameBlur() {
    const trimmed = teamNameRef.current.trim()
    await setSetting('team_name', trimmed)
    setTeamName(trimmed)
    teamNameRef.current = trimmed
  }

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
      ) : (
        <>
          {/* Team name row */}
          <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Team Name
            </Text>
            <TextInput
              value={teamName}
              onChangeText={(v) => {
                setTeamName(v)
                teamNameRef.current = v
              }}
              onBlur={handleTeamNameBlur}
              placeholder="Enter team name"
              placeholderTextColor="#94a3b8"
              className="text-base font-semibold text-slate-900"
              returnKeyType="done"
            />
          </View>

          {players.length === 0 ? (
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
        </>
      )}
    </View>
  )
}
