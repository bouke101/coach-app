import { View, Text, TouchableOpacity } from 'react-native'

interface Props {
  half: 1 | 2 | 'halftime' | 'finished'
  ourScore: number
  opponentScore: number
  elapsed: number          // seconds elapsed in current half
  breakElapsed: number     // seconds elapsed during halftime break
  running: boolean
  breakRunning: boolean    // whether the halftime break timer is ticking
  halfDurationSecs: number
  timerDirection: 'up' | 'down'
  onToggleRunning: () => void
  onToggleBreak: () => void
  onGoal: () => void
  onStartSecondHalf: () => void
  onEndMatch: () => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function MatchHeader({
  half, ourScore, opponentScore, elapsed, breakElapsed, running, breakRunning,
  halfDurationSecs, timerDirection, onToggleRunning, onToggleBreak, onGoal, onStartSecondHalf, onEndMatch,
}: Props) {
  const displayTime = timerDirection === 'up' ? elapsed : halfDurationSecs - elapsed

  if (half === 'finished') return null

  return (
    <View style={{ backgroundColor: '#1e293b' }} className="px-3 py-2 rounded-2xl mx-3 mt-3">
      {half === 'halftime' ? (
        // Halftime layout: left=label+score, centre=start 2nd half, right=break timer+pause
        <View className="flex-row items-center gap-2">
          <View className="flex-1 items-center">
            <Text className="text-xs text-slate-400 uppercase tracking-wide">Half Time</Text>
            <Text className="text-white text-xl font-bold">{ourScore} – {opponentScore}</Text>
          </View>
          <TouchableOpacity
            onPress={onStartSecondHalf}
            className="flex-1 bg-blue-600 py-3 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-sm">Start 2nd Half →</Text>
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-xs text-slate-400 uppercase tracking-wide">Break</Text>
            <Text className="text-white text-lg font-bold font-tabular">{formatTime(breakElapsed)}</Text>
            <TouchableOpacity
              onPress={onToggleBreak}
              className={`px-3 py-1 rounded-md mt-1 ${breakRunning ? 'bg-red-500' : 'bg-green-600'}`}
            >
              <Text className="text-white font-bold text-xs">
                {breakRunning ? '⏸ Pause' : '▶ Resume'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Active half layout — 3 columns
        <View className="flex-row items-center gap-2">
          {/* Left: half + score */}
          <View className="flex-1 items-center">
            <Text className="text-xs text-slate-400 uppercase tracking-wide">
              {half === 1 ? '1st Half' : '2nd Half'}
            </Text>
            <Text className="text-white font-bold" style={{ fontSize: 26, letterSpacing: -0.5 }}>
              {ourScore} – {opponentScore}
            </Text>
          </View>

          {/* Centre: goal button or end match */}
          <View className="flex-1 items-center">
            {half === 2 && elapsed >= halfDurationSecs ? (
              <TouchableOpacity
                onPress={onEndMatch}
                className="bg-red-600 px-4 py-3 rounded-xl items-center w-full"
              >
                <Text className="text-white font-bold text-sm">End Match</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onGoal}
                style={{ width: 60, height: 60, backgroundColor: '#22c55e', borderRadius: 16 }}
                className="items-center justify-center"
              >
                <Text className="text-white font-black text-2xl leading-none">＋</Text>
                <Text className="text-white font-bold text-xs uppercase tracking-wide">Goal</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right: time + pause/resume */}
          <View className="flex-1 items-center">
            <Text className="text-xs text-slate-400 uppercase tracking-wide">Time</Text>
            <Text className="text-white font-bold font-tabular" style={{ fontSize: 22 }}>
              {formatTime(displayTime)}
            </Text>
            <TouchableOpacity
              onPress={onToggleRunning}
              className={`px-3 py-1 rounded-md mt-1 ${running ? 'bg-red-500' : 'bg-green-600'}`}
            >
              <Text className="text-white font-bold text-xs">
                {running ? '⏸ Pause' : '▶ Resume'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}
