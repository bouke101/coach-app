export interface PlayerFormErrors {
  nameError: string
  numberError: string
  valid: boolean
}

export function validatePlayerForm(name: string, numberStr: string): PlayerFormErrors {
  let valid = true
  let nameError = ''
  let numberError = ''

  if (!name.trim()) {
    nameError = 'Name is required'
    valid = false
  }

  if (numberStr !== '') {
    const n = parseInt(numberStr, 10)
    if (isNaN(n) || n < 1 || n > 99) {
      numberError = 'Must be between 1 and 99'
      valid = false
    }
  }

  return { nameError, numberError, valid }
}
