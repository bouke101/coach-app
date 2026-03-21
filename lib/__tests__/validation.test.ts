import { validatePlayerForm } from '../validation'

describe('validatePlayerForm', () => {
  it('passes with a name and no number', () => {
    const result = validatePlayerForm('Emma', '')
    expect(result.valid).toBe(true)
    expect(result.nameError).toBe('')
    expect(result.numberError).toBe('')
  })

  it('passes with a name and valid number', () => {
    expect(validatePlayerForm('Liam', '7').valid).toBe(true)
  })

  it('fails when name is empty', () => {
    const result = validatePlayerForm('  ', '')
    expect(result.valid).toBe(false)
    expect(result.nameError).toBe('Name is required')
  })

  it('fails when number is 0', () => {
    const result = validatePlayerForm('Emma', '0')
    expect(result.valid).toBe(false)
    expect(result.numberError).toBe('Must be between 1 and 99')
  })

  it('fails when number is 100', () => {
    expect(validatePlayerForm('Emma', '100').valid).toBe(false)
  })

  it('fails when number is negative', () => {
    expect(validatePlayerForm('Emma', '-1').valid).toBe(false)
  })

  it('fails when number is non-numeric text', () => {
    expect(validatePlayerForm('Emma', 'abc').valid).toBe(false)
  })

  it('passes with number 99 (boundary)', () => {
    expect(validatePlayerForm('Emma', '99').valid).toBe(true)
  })

  it('passes with number 1 (boundary)', () => {
    expect(validatePlayerForm('Emma', '1').valid).toBe(true)
  })
})
