import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import type { GameType } from '@/lib/formations'

type Venue = 'home' | 'away'

export default function NewMatchScreen() {
  const [opponent, setOpponent] = useState('')
  const [venue, setVenue] = useState<Venue>('home')
  const [gameType, setGameType] = useState<GameType>('8v8')
  const [halfDuration, setHalfDuration] = useState(25)
  const [timerDirection, setTimerDirection] = useState<'up' | 'down'>('up')
  const [opponentError, setOpponentError] = useState('')

  function handleNext() {
    if (!opponent.trim()) {
      setOpponentError('Opponent name is required')
      return
    }
    setOpponentError('')
    router.push({
      pathname: '/match-formation',
      params: { opponent: opponent.trim(), venue, game_type: gameType, half_duration: String(halfDuration), timer_direction: timerDirection },
    })
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">

        {/* Opponent */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Opponent</Text>
        <TextInput
          value={opponent}
          onChangeText={(t) => { setOpponent(t); setOpponentError('') }}
          placeholder="e.g. FC Riviera"
          placeholderTextColor="#94a3b8"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 mb-1"
          autoCapitalize="words"
          returnKeyType="done"
        />
        {opponentError ? (
          <Text className="text-red-500 text-sm mb-3">{opponentError}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Venue */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Venue</Text>
        <View className="flex-row gap-3 mb-5">
          {(['home', 'away'] as Venue[]).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setVenue(v)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                venue === v ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
              }`}
            >
              <Text className={`font-semibold text-base ${venue === v ? 'text-white' : 'text-slate-600'}`}>
                {v === 'home' ? '🏠 Home' : '✈️ Away'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Game type */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Game Type</Text>
        <View className="flex-row gap-2 mb-5">
          {(['6v6', '8v8', '11v11'] as GameType[]).map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGameType(g)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                gameType === g ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
              }`}
            >
              <Text className={`font-semibold text-sm ${gameType === g ? 'text-white' : 'text-slate-600'}`}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Half duration */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Half Duration</Text>
        <View className="flex-row items-center bg-white border border-slate-200 rounded-xl mb-8 overflow-hidden">
          <TouchableOpacity
            onPress={() => setHalfDuration(Math.max(5, halfDuration - 5))}
            className="px-5 py-4"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-2xl text-slate-600 font-light">−</Text>
          </TouchableOpacity>
          <Text className="flex-1 text-center text-2xl font-bold text-slate-900">{halfDuration} min</Text>
          <TouchableOpacity
            onPress={() => setHalfDuration(Math.min(60, halfDuration + 5))}
            className="px-5 py-4"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-2xl text-slate-600 font-light">+</Text>
          </TouchableOpacity>
        </View>

        {/* Timer Direction */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Timer Direction</Text>
        <View className="flex-row gap-3 mb-8">
          {(['up', 'down'] as const).map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setTimerDirection(d)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                timerDirection === d ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
              }`}
            >
              <Text className={`font-semibold text-base ${timerDirection === d ? 'text-white' : 'text-slate-600'}`}>
                {d === 'up' ? '⬆ Count Up' : '⬇ Count Down'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          onPress={handleNext}
          className="bg-blue-600 py-4 rounded-xl items-center mb-8"
        >
          <Text className="text-white font-bold text-lg">Next →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
