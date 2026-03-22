import { View, Text } from 'react-native'
import type { PositionSlot } from '@/lib/formations'
import type { Player } from '@/lib/db/players'

export interface SlotLayout {
  x: number; y: number; width: number; height: number
}

interface PitchViewProps {
  slots: PositionSlot[]
  assignments: Record<string, Player>   // slotId → player
  onSlotLayout: (slotId: string, layout: SlotLayout) => void
}

const SLOT_SIZE = 52

export function PitchView({ slots, assignments, onSlotLayout }: PitchViewProps) {
  return (
    <View
      className="mx-4 rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#16a34a', aspectRatio: 0.65 }}
    >
      {/* Field markings */}
      <View
        style={{
          position: 'absolute', top: 8, left: 8, right: 8, bottom: 8,
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 4,
        }}
      />
      <View
        style={{
          position: 'absolute', top: 8, left: '25%', right: '25%', height: 28,
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
        }}
      />
      <View
        style={{
          position: 'absolute', bottom: 8, left: '25%', right: '25%', height: 28,
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
        }}
      />

      {/* Position slots — rendered using percentage positions */}
      {slots.map((slot) => {
        const player = assignments[slot.id]
        const isGK = slot.position === 'GK'

        return (
          <View
            key={slot.id}
            style={{
              position: 'absolute',
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: SLOT_SIZE,
              height: SLOT_SIZE,
              marginLeft: -SLOT_SIZE / 2,
              marginTop: -SLOT_SIZE / 2,
            }}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout
              onSlotLayout(slot.id, { x, y, width, height })
            }}
          >
            {player ? (
              <View
                className="w-full h-full rounded-full items-center justify-center"
                style={{ backgroundColor: isGK ? '#fbbf24' : 'white' }}
              >
                <Text
                  style={{ fontSize: 10, fontWeight: '700', color: isGK ? 'white' : '#15803d', textAlign: 'center', lineHeight: 12 }}
                  numberOfLines={2}
                >
                  {player.number ?? ''}{'\n'}{player.name.split(' ')[0]}
                </Text>
              </View>
            ) : (
              <View
                className="w-full h-full rounded-full items-center justify-center"
                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)' }}
              >
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                  {slot.position}
                </Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}
