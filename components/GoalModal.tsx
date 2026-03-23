import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native'
import type { Player } from '@/lib/db/players'

interface Props {
  visible: boolean
  matchPlayers: Player[]  // all players in match_players (pitch + bench)
  onConfirm: (team: 'our_team' | 'opponent', playerId: string | null) => void
  onCancel: () => void
}

export function GoalModal({ visible, matchPlayers, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<'team' | 'scorer'>('team')
  const [team, setTeam] = useState<'our_team' | 'opponent' | null>(null)

  function handleTeam(t: 'our_team' | 'opponent') {
    if (t === 'opponent') {
      onConfirm('opponent', null)
      reset()
      return
    }
    setTeam(t)
    setStep('scorer')
  }

  function handleScorer(playerId: string | null) {
    onConfirm('our_team', playerId)
    reset()
  }

  function reset() {
    setStep('team')
    setTeam(null)
  }

  function handleCancel() {
    reset()
    onCancel()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={handleCancel}
      >
        <View style={{ flex: 1 }} />
        <SafeAreaView className="bg-white rounded-t-2xl">
          <TouchableOpacity activeOpacity={1}>
            {/* Handle */}
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 bg-slate-300 rounded-full" />
            </View>

            <Text className="text-lg font-bold text-slate-900 text-center mb-4">
              {step === 'team' ? 'Who scored?' : 'Which player?'}
            </Text>

            {step === 'team' ? (
              <View className="flex-row gap-3 px-4 pb-6">
                <TouchableOpacity
                  onPress={() => handleTeam('our_team')}
                  className="flex-1 bg-green-600 py-5 rounded-2xl items-center"
                >
                  <Text className="text-white font-bold text-base">Our Team ⚽</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleTeam('opponent')}
                  className="flex-1 bg-red-500 py-5 rounded-2xl items-center"
                >
                  <Text className="text-white font-bold text-base">Opponent ⚽</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }} className="px-4">
                <TouchableOpacity
                  onPress={() => handleScorer(null)}
                  className="py-4 border-b border-slate-100"
                >
                  <Text className="text-base font-semibold text-slate-500">Unknown / Not tracked</Text>
                </TouchableOpacity>
                {matchPlayers.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    onPress={() => handleScorer(player.id)}
                    className="py-4 border-b border-slate-100 flex-row items-center gap-3"
                  >
                    <View className="w-9 h-9 bg-blue-100 rounded-full items-center justify-center">
                      <Text className="text-blue-700 font-bold text-sm">{player.number ?? '?'}</Text>
                    </View>
                    <Text className="text-base font-semibold text-slate-900">{player.name}</Text>
                  </TouchableOpacity>
                ))}
                <View className="h-4" />
              </ScrollView>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  )
}
