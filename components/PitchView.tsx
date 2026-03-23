import { forwardRef } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import type { PositionSlot } from '@/lib/formations'
import type { Player } from '@/lib/db/players'

export interface SlotLayout {
  x: number; y: number; width: number; height: number
}

interface PitchViewProps {
  slots: PositionSlot[]
  assignments: Record<string, Player>   // slotId → player
  hoveredSlotId: string | null
  onSlotLayout: (slotId: string, layout: SlotLayout) => void
  onPlayerPress?: (playerId: string) => void
  selectedPlayerId?: string | null
}

const SLOT_SIZE = 52

export const PitchView = forwardRef<View, PitchViewProps>(function PitchView(
  props,
  ref,
) {
  const { slots, assignments, hoveredSlotId, onSlotLayout } = props
  return (
    <View
      ref={ref}
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

      {/* Position slots */}
      {slots.map((slot) => {
        const player = assignments[slot.id]
        const isGK = slot.position === 'GK'
        const hovered = hoveredSlotId === slot.id
        const slotSize = hovered ? SLOT_SIZE + 10 : SLOT_SIZE
        const offset = hovered ? -(slotSize / 2) : -(SLOT_SIZE / 2)

        return (
          <View
            key={slot.id}
            style={{
              position: 'absolute',
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: slotSize,
              height: slotSize,
              marginLeft: offset,
              marginTop: offset,
            }}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout
              onSlotLayout(slot.id, { x, y, width, height })
            }}
          >
            {player ? (
              <TouchableOpacity
                onPress={() => props.onPlayerPress?.(player.id)}
                activeOpacity={props.onPlayerPress ? 0.7 : 1}
                className="w-full h-full rounded-full items-center justify-center"
                style={{
                  backgroundColor: isGK ? '#fbbf24' : 'white',
                  borderWidth: (hovered || props.selectedPlayerId === player.id) ? 3 : 0,
                  borderColor: '#60a5fa',
                }}
              >
                <Text
                  style={{ fontSize: 10, fontWeight: '700', color: isGK ? 'white' : '#15803d', textAlign: 'center', lineHeight: 12 }}
                  numberOfLines={2}
                >
                  {player.number ?? ''}{'\n'}{player.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                className="w-full h-full rounded-full items-center justify-center"
                style={{
                  borderWidth: 2,
                  borderStyle: hovered ? 'solid' : 'dashed',
                  borderColor: hovered ? 'white' : 'rgba(255,255,255,0.6)',
                  backgroundColor: hovered ? 'rgba(255,255,255,0.25)' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 10, color: hovered ? 'white' : 'rgba(255,255,255,0.8)', fontWeight: hovered ? '800' : '600' }}>
                  {slot.position}
                </Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
})
