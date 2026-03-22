import { useState, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated'

import { getPlayers, type Player } from '@/lib/db/players'
import { createMatch } from '@/lib/db/matches'
import { getFormations, getSlots, type GameType } from '@/lib/formations'
import { FormationPicker } from '@/components/FormationPicker'
import { PitchView, type SlotLayout } from '@/components/PitchView'
import { PlayerBench } from '@/components/PlayerBench'

export default function MatchFormationScreen() {
  const params = useLocalSearchParams<{
    opponent: string; venue: string; game_type: string; half_duration: string
  }>()

  const gameType = (params.game_type ?? '8v8') as GameType
  const defaultFormation = getFormations(gameType)[0].id

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formation, setFormation] = useState(defaultFormation)
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set())
  const [assignments, setAssignments] = useState<Record<string, Player>>({})

  // Drag state
  const [dragging, setDragging] = useState(false)
  const [dragPlayer, setDragPlayer] = useState<Player | null>(null)
  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  const dragOpacity = useSharedValue(0)

  // Slot layouts for hit testing (populated by PitchView onSlotLayout)
  const slotLayouts = useRef<Map<string, SlotLayout>>(new Map())

  // Pitch green view ref and absolute offset for hit testing
  const pitchRef = useRef<View>(null)
  const pitchOffset = useRef({ x: 0, y: 0 })

  useFocusEffect(useCallback(() => {
    getPlayers()
      .then((data) => { setPlayers(data) })
      .catch(() => Alert.alert('Error', 'Could not load players.'))
      .finally(() => setLoading(false))
  }, []))

  const slots = getSlots(gameType, formation)

  function handleFormationChange(id: string) {
    setFormation(id)
    setAssignments({})
  }

  function handleToggleAbsent(playerId: string) {
    setAbsentIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
        // Remove from pitch if marked absent
        setAssignments((a) => {
          const updated = { ...a }
          for (const [sid, p] of Object.entries(updated)) {
            if (p.id === playerId) delete updated[sid]
          }
          return updated
        })
      }
      return next
    })
  }

  function handleDragStart({ playerId, startX, startY }: { playerId: string; startX: number; startY: number }) {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    // Refresh pitch position in case user has scrolled
    pitchRef.current?.measureInWindow((x, y) => {
      pitchOffset.current = { x, y }
    })
    // Remove from any existing slot assignment
    setAssignments((a) => {
      const updated = { ...a }
      for (const [sid, p] of Object.entries(updated)) {
        if (p.id === playerId) delete updated[sid]
      }
      return updated
    })
    dragX.value = startX
    dragY.value = startY
    dragOpacity.value = 1
    setDragPlayer(player)
    setDragging(true)
  }

  function handleDragMove(x: number, y: number) {
    dragX.value = x
    dragY.value = y
  }

  function handleDragEnd(x: number, y: number) {
    // Find which slot the finger landed on using stored layouts + pitch offset
    let targetSlotId: string | null = null
    for (const [slotId, layout] of slotLayouts.current.entries()) {
      const absX = pitchOffset.current.x + layout.x
      const absY = pitchOffset.current.y + layout.y
      if (
        x >= absX && x <= absX + layout.width &&
        y >= absY && y <= absY + layout.height
      ) {
        targetSlotId = slotId
        break
      }
    }
    if (targetSlotId && dragPlayer) {
      const player = dragPlayer
      setAssignments((a) => ({ ...a, [targetSlotId!]: player }))
    }
    dragOpacity.value = 0
    setDragging(false)
    setDragPlayer(null)
  }

  const floatingStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: dragX.value - 26,
    top: dragY.value - 26,
    opacity: dragOpacity.value,
    zIndex: 999,
  }))

  const assignedIds = new Set(Object.values(assignments).map((p) => p.id))
  const presentPlayers = players.filter((p) => !absentIds.has(p.id))
  const canStart = presentPlayers.length > 0

  async function handleStartMatch() {
    if (!canStart || saving) return
    setSaving(true)
    try {
      const starters = Object.entries(assignments).map(([slotId, player]) => {
        const slot = slots.find((s) => s.id === slotId)
        return { player_id: player.id, position: slot?.position ?? slotId }
      })
      const benchPlayers = presentPlayers.filter((p) => !assignedIds.has(p.id))
      const bench = benchPlayers.map((p) => ({ player_id: p.id }))
      const match = await createMatch({
        opponent: params.opponent ?? '',
        venue: (params.venue ?? 'home') as 'home' | 'away',
        game_type: gameType,
        half_duration: parseInt(params.half_duration ?? '25', 10),
        formation,
        starters,
        bench,
      })
      router.replace({ pathname: '/live-match', params: { id: match.id } })
    } catch (e) {
      Alert.alert('Error', 'Could not save match. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  if (players.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Text className="text-base text-slate-500 text-center">
          No players in your squad. Add players first.
        </Text>
        <TouchableOpacity onPress={() => router.dismiss(2)} className="mt-4">
          <Text className="text-blue-600 font-semibold">Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-50">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Formation picker */}
          <View className="pt-4 pb-3">
            <FormationPicker
              gameType={gameType}
              selected={formation}
              onSelect={handleFormationChange}
            />
          </View>

          {/* Pitch */}
          <View
            className="mb-4"
            onLayout={() => {
              pitchRef.current?.measureInWindow((x, y) => {
                pitchOffset.current = { x, y }
              })
            }}
          >
            <PitchView
              ref={pitchRef}
              slots={slots}
              assignments={assignments}
              onSlotLayout={(slotId, layout) => {
                slotLayouts.current.set(slotId, layout)
              }}
            />
          </View>

          {/* Player bench */}
          <PlayerBench
            players={players}
            absentIds={absentIds}
            assignedIds={assignedIds}
            onToggleAbsent={handleToggleAbsent}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />

          {presentPlayers.length === 0 && (
            <Text className="text-center text-slate-500 text-sm mt-4 px-4">
              No players available — mark some players as present.
            </Text>
          )}
        </ScrollView>

        {/* Floating drag card */}
        {dragPlayer && (
          <Animated.View style={floatingStyle} pointerEvents="none">
            <View
              className="rounded-full bg-blue-600 items-center justify-center shadow-lg"
              style={{ width: 52, height: 52 }}
            >
              <Text
                className="text-white text-center font-bold"
                numberOfLines={2}
                style={{ fontSize: 10, lineHeight: 13 }}
              >
                {dragPlayer.number ?? ''}{'\n'}{dragPlayer.name.split(' ')[0]}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Bottom action bar */}
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-slate-50 border-t border-slate-200">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.dismiss(2)}
              className="flex-1 py-4 rounded-xl border border-slate-300 items-center"
            >
              <Text className="text-slate-600 font-semibold text-base">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStartMatch}
              disabled={!canStart || saving}
              className={`py-4 rounded-xl items-center ${canStart && !saving ? 'bg-blue-600' : 'bg-slate-300'}`}
              style={{ flex: 2 }}
            >
              {saving
                ? <ActivityIndicator color="white" />
                : <Text className={`font-bold text-base ${canStart ? 'text-white' : 'text-slate-400'}`}>Start Match →</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  )
}
