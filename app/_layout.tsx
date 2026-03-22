import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { setupDatabase } from '@/lib/db/database'
import '@/global.css'

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    setupDatabase().then(() => setDbReady(true)).catch(console.error)
  }, [])

  if (!dbReady) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-player"
        options={{ presentation: 'modal', title: 'Add Player', headerShown: true }}
      />
      <Stack.Screen
        name="edit-player"
        options={{ presentation: 'modal', title: 'Edit Player', headerShown: true }}
      />
      <Stack.Screen
        name="new-match"
        options={{ presentation: 'modal', title: 'New Match', headerShown: true }}
      />
      <Stack.Screen
        name="match-formation"
        options={{ presentation: 'fullScreenModal', title: 'Formation', headerShown: true }}
      />
      <Stack.Screen
        name="live-match"
        options={{ presentation: 'fullScreenModal', title: 'Live Match', headerShown: true }}
      />
    </Stack>
  )
}
