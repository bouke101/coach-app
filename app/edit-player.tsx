import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { getPlayerById, updatePlayer, deletePlayer } from '@/lib/db/players'
import { validatePlayerForm } from '@/lib/validation'

export default function EditPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [displayName, setDisplayName] = useState('') // for delete alert title
  const [nameError, setNameError] = useState('')
  const [numberError, setNumberError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      router.back()
      return
    }
    getPlayerById(id).then((player) => {
      if (!player) {
        router.back()
        return
      }
      setName(player.name)
      setNumber(player.number?.toString() ?? '')
      setDisplayName(player.name)
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!id) return
    const result = validatePlayerForm(name, number)
    setNameError(result.nameError)
    setNumberError(result.numberError)
    if (!result.valid) return

    await updatePlayer(id, {
      name: name.trim(),
      number: number !== '' ? parseInt(number, 10) : null,
    })
    router.back()
  }

  function handleDelete() {
    if (!id) return
    Alert.alert(
      `Remove ${displayName}?`,
      'This will permanently remove them from your squad.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deletePlayer(id).then(() => router.back())
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name field */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emma Johnson"
            className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
            returnKeyType="next"
          />
          {nameError ? (
            <Text className="text-red-500 text-sm mt-1">{nameError}</Text>
          ) : null}
        </View>

        {/* Shirt number field */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Shirt number <Text className="text-slate-400">(optional, 1–99)</Text>
          </Text>
          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="e.g. 7"
            keyboardType="number-pad"
            className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
            returnKeyType="done"
          />
          {numberError ? (
            <Text className="text-red-500 text-sm mt-1">{numberError}</Text>
          ) : null}
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={() => { void handleSave() }}
          className="bg-blue-600 rounded-xl py-4 items-center mb-4"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">Save Changes</Text>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          onPress={handleDelete}
          className="border border-red-200 rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-red-500 font-medium text-base">Remove player</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
