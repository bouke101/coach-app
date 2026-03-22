import { ScrollView, TouchableOpacity, Text, View } from 'react-native'
import { getFormations, type GameType, type FormationTemplate } from '@/lib/formations'

interface FormationPickerProps {
  gameType: GameType
  selected: string
  onSelect: (formationId: string) => void
}

export function FormationPicker({ gameType, selected, onSelect }: FormationPickerProps) {
  const formations = getFormations(gameType)

  return (
    <View>
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 mb-2">Formation</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        className="pb-2"
      >
        {formations.map((f: FormationTemplate) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => onSelect(f.id)}
            className={`px-4 py-2 rounded-full border ${
              selected === f.id
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text className={`font-semibold text-sm ${selected === f.id ? 'text-white' : 'text-slate-600'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}
