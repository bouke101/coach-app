import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getMatchById, getMatchPlayersByMatchId, finishMatch, type Match, type MatchPlayer } from '@/lib/db/matches'
import { getMatchEvents, createMatchEvent, type MatchEvent } from '@/lib/db/match-events'
import { getPlayers, type Player } from '@/lib/db/players'
import { getSlots } from '@/lib/formations'
import { buildLiveState, reconstructTimer } from '@/lib/match-state'

import { MatchHeader } from '@/components/MatchHeader'
import { PitchView } from '@/components/PitchView'
import { BenchTiles } from '@/components/BenchTiles'
import { GoalModal } from '@/components/GoalModal'
import { StatsGoals } from '@/components/StatsGoals'
import { StatsPlayerTime } from '@/components/StatsPlayerTime'

export default function LiveMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  // DB data
  const [match, setMatch] = useState<Match | null>(null)
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Live state (derived from matchPlayers + events, then kept in sync locally)
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [benchPlayerIds, setBenchPlayerIds] = useState<string[]>([])

  // Timer
  const [half, setHalf] = useState<1 | 2 | 'halftime' | 'finished'>(1)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const [breakRunning, setBreakRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // UI
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats'>('pitch')
  const [goalModalVisible, setGoalModalVisible] = useState(false)
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)

  // Load all data on mount
  useFocusEffect(useCallback(() => {
    if (!id) return
    async function load() {
      try {
        const [m, mps, players, evts] = await Promise.all([
          getMatchById(id!),
          getMatchPlayersByMatchId(id!),
          getPlayers(),
          getMatchEvents(id!),
        ])
        if (!m) { Alert.alert('Error', 'Match not found'); return }
        setMatch(m)
        setMatchPlayers(mps)
        setAllPlayers(players)
        setEvents(evts)

        const liveState = buildLiveState(mps, evts)
        setAssignments(liveState.assignments)
        setBenchPlayerIds(liveState.benchPlayerIds)

        const timer = reconstructTimer(evts, m.half_duration)
        setHalf(timer.half)
        setElapsed(timer.elapsed)
        setRunning(false)

        if (m.status === 'finished') {
          setActiveTab('stats')
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id]))

  // Timer interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!running || half === 'halftime' || half === 'finished' || !match) return

    const halfDurationSecs = match.half_duration * 60
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1
        if (next >= halfDurationSecs) {
          // Auto-pause at end of half
          setRunning(false)
          if (half === 1) {
            setHalf('halftime')
            void createMatchEvent({ match_id: match.id, type: 'half_time', match_time: next, player_id: null, player_off_id: null, position: null, team: null })
              .then(e => setEvents(prev => [...prev, e]))
          }
          // For half === 2: DO NOT set half to 'finished'. Timer pauses and
          // MatchHeader shows "End Match" button (visible when half===2 && elapsed>=halfDurationSecs).
          // Only handleEndMatch() transitions to 'finished'.
          return halfDurationSecs
        }
        return next
      })
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, half, match])

  // Break timer — starts paused; coach taps Resume to start
  useEffect(() => {
    if (half !== 'halftime' || !breakRunning) return
    const t = setInterval(() => setBreakElapsed(p => p + 1), 1000)
    return () => clearInterval(t)
  }, [half, breakRunning])

  const halfDurationSecs = (match?.half_duration ?? 25) * 60

  // Player map for quick lookup
  const playerMap = new Map(allPlayers.map(p => [p.id, p]))

  // Build PitchView assignments: slotId → Player
  const slots = match ? getSlots(match.game_type, match.formation) : []
  const pitchAssignments: Record<string, Player> = {}
  for (const slot of slots) {
    const playerId = assignments[slot.position]
    if (playerId) {
      const p = playerMap.get(playerId)
      if (p) pitchAssignments[slot.id] = p
    }
  }

  // Bench players with bench elapsed times
  const benchPlayers = benchPlayerIds
    .map(pid => playerMap.get(pid))
    .filter((p): p is Player => !!p)
    .map(player => {
      // Find when they last went to bench (via substitution event)
      const subOff = [...events].reverse().find(
        e => e.type === 'substitution' && e.player_off_id === player.id
      )
      // If no sub event exists (player started on bench), benchStartMatchTime = 0.
      // This is correct for 1st half. In 2nd half elapsed resets to 0 so displayed
      // bench time reflects only current-half time — acceptable simplification for v1.
      const benchStartMatchTime = subOff ? subOff.match_time : 0
      const benchElapsedTime = Math.max(0, elapsed - benchStartMatchTime)
      return { player, benchElapsed: benchElapsedTime }
    })

  // Match players enriched with player data (for scorer picker)
  const matchPlayersForGoal = matchPlayers
    .map(mp => playerMap.get(mp.player_id))
    .filter((p): p is Player => !!p)

  function handleToggleRunning() {
    setRunning(r => !r)
  }

  function handleToggleBreak() {
    setBreakRunning(r => !r)
  }

  async function handleStartSecondHalf() {
    if (!match) return
    const event = await createMatchEvent({
      match_id: match.id, type: 'second_half_start', match_time: 0,
      player_id: null, player_off_id: null, position: null, team: null,
    })
    setEvents(prev => [...prev, event])
    setHalf(2)
    setElapsed(0)
    setRunning(false)
    setBreakElapsed(0)
    setBreakRunning(false)
  }

  async function handleEndMatch() {
    if (!match) return
    const event = await createMatchEvent({
      match_id: match.id, type: 'match_end', match_time: elapsed,
      player_id: null, player_off_id: null, position: null, team: null,
    })
    setEvents(prev => [...prev, event])
    await finishMatch(match.id)
    setMatch(prev => prev ? { ...prev, status: 'finished' } : prev)
    setHalf('finished')
    setRunning(false)
    setActiveTab('stats')
  }

  async function handleGoalConfirm(team: 'our_team' | 'opponent', playerId: string | null) {
    if (!match) return
    setGoalModalVisible(false)
    const event = await createMatchEvent({
      match_id: match.id, type: 'goal', match_time: elapsed,
      player_id: playerId, player_off_id: null, position: null, team,
    })
    setEvents(prev => [...prev, event])
  }

  function handlePlayerSelect(playerId: string) {
    if (!match) return
    if (selectedPlayerId === null) {
      setSelectedPlayerId(playerId)
      return
    }
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null)
      return
    }
    // Resolve pair
    const aId = selectedPlayerId
    const bId = playerId
    setSelectedPlayerId(null)

    const aOnPitch = Object.values(assignments).includes(aId)
    const bOnPitch = Object.values(assignments).includes(bId)

    if (aOnPitch && bOnPitch) {
      // Position swap
      const posA = Object.keys(assignments).find(k => assignments[k] === aId)!
      const posB = Object.keys(assignments).find(k => assignments[k] === bId)!
      const newAssignments = { ...assignments, [posA]: bId, [posB]: aId }
      setAssignments(newAssignments)
      void createMatchEvent({
        match_id: match.id, type: 'position_swap', match_time: elapsed,
        player_id: aId, player_off_id: bId, position: posB,
        team: null,
      }).then(e => setEvents(prev => [...prev, e]))
    } else {
      // Substitution — determine who's on pitch and who's on bench
      const pitchId = aOnPitch ? aId : bId
      const benchId = aOnPitch ? bId : aId
      const pos = Object.keys(assignments).find(k => assignments[k] === pitchId)!
      const newAssignments = { ...assignments, [pos]: benchId }
      setAssignments(newAssignments)
      setBenchPlayerIds(prev => [...prev.filter(pid => pid !== benchId), pitchId])
      void createMatchEvent({
        match_id: match.id, type: 'substitution', match_time: elapsed,
        player_id: benchId, player_off_id: pitchId, position: pos, team: null,
      }).then(e => setEvents(prev => [...prev, e]))
    }
  }

  const ourScore = events.filter(e => e.type === 'goal' && e.team === 'our_team').length
  const oppScore = events.filter(e => e.type === 'goal' && e.team === 'opponent').length

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  if (!match) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-slate-500">Match not found.</Text>
        <TouchableOpacity onPress={() => router.dismissAll()} className="mt-4">
          <Text className="text-blue-600 font-semibold">Back to Matches</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Finished state header */}
      {half === 'finished' && (
        <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.dismissAll()}>
            <Text className="text-blue-600 font-semibold text-base">← Back to Matches</Text>
          </TouchableOpacity>
          <Text className="text-slate-500 text-sm font-semibold">
            Final: {ourScore} – {oppScore}
          </Text>
        </View>
      )}

      {/* Active match header */}
      {half !== 'finished' && (
        <MatchHeader
          half={half}
          ourScore={ourScore}
          opponentScore={oppScore}
          elapsed={elapsed}
          breakElapsed={breakElapsed}
          running={running}
          breakRunning={breakRunning}
          halfDurationSecs={halfDurationSecs}
          timerDirection={match.timer_direction}
          onToggleRunning={handleToggleRunning}
          onToggleBreak={handleToggleBreak}
          onGoal={() => setGoalModalVisible(true)}
          onStartSecondHalf={handleStartSecondHalf}
          onEndMatch={handleEndMatch}
        />
      )}

      {/* Tab content */}
      <ScrollView className="flex-1 mt-3" contentContainerStyle={{ paddingBottom: 80 }}>
        {activeTab === 'pitch' ? (
          <>
            <PitchView
              slots={slots}
              assignments={pitchAssignments}
              hoveredSlotId={null}
              selectedPlayerId={selectedPlayerId}
              onSlotLayout={() => {}}
              onPlayerPress={handlePlayerSelect}
            />
            <View className="mt-3">
              <BenchTiles
                benchPlayers={benchPlayers}
                selectedPlayerId={selectedPlayerId}
                onSelect={handlePlayerSelect}
              />
            </View>
            {selectedPlayerId && (
              <Text className="text-center text-xs text-blue-600 mt-2 px-4">
                Player selected — tap another player to swap or substitute
              </Text>
            )}
          </>
        ) : (
          <>
            <StatsGoals events={events} playerMap={playerMap} />
            <StatsPlayerTime
              matchPlayers={matchPlayers}
              events={events}
              currentElapsed={elapsed}
              half={half}
              playerMap={playerMap}
              expandedPlayerId={expandedPlayerId}
              onToggleExpand={(pid) => setExpandedPlayerId(e => e === pid ? null : pid)}
            />
          </>
        )}
      </ScrollView>

      {/* Tab bar */}
      <View className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-4 pb-6 pt-3 bg-slate-50 border-t border-slate-200">
        <TouchableOpacity
          onPress={() => setActiveTab('pitch')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'pitch' ? 'bg-blue-600' : 'bg-slate-100'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'pitch' ? 'text-white' : 'text-slate-500'}`}>⚽ Pitch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('stats')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'stats' ? 'bg-blue-600' : 'bg-slate-100'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'stats' ? 'text-white' : 'text-slate-500'}`}>📊 Stats</Text>
        </TouchableOpacity>
      </View>

      {/* Goal modal */}
      <GoalModal
        visible={goalModalVisible}
        matchPlayers={matchPlayersForGoal}
        onConfirm={handleGoalConfirm}
        onCancel={() => setGoalModalVisible(false)}
      />
    </SafeAreaView>
  )
}
