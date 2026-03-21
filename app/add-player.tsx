import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { createPlayer } from '@/lib/db/players'
import { validatePlayerForm } from '@/lib/validation'

export default function AddPlayerScreen() {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [nameError, setNameError] = useState('')
  const [numberError, setNumberError] = useState('')

  async function handleSave() {
    const result = validatePlayerForm(name, number)
    setNameError(result.nameError)
    setNumberError(result.numberError)
    if (!result.valid) return

    await createPlayer({
      name: name.trim(),
      number: number !== '' ? parseInt(number, 10) : null,
    })
    router.back()
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
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => {}}
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
          className="bg-blue-600 rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">Save Player</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
