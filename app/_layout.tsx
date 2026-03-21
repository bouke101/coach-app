import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { setupDatabase } from '@/lib/db/database'
import '@/global.css'

export default function RootLayout() {
  useEffect(() => {
    setupDatabase().catch(console.error)
  }, [])

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
    </Stack>
  )
}
