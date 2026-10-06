'use client'

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

interface ConsultTransitionStateValue {
  directoryTerm: string
  setDirectoryTerm: (value: string) => void
  specialtyId: string
  setSpecialtyId: (value: string) => void
  selectedDate: string
  setSelectedDate: (value: string) => void
  profileDirection: 1 | -1
  setProfileDirection: (value: 1 | -1) => void
}

const ConsultTransitionState = createContext<ConsultTransitionStateValue | null>(null)

/** State của luồng M1 ↔ M3 sống ở layout chung, nên không mất khi Next thay page segment. */
export function ConsultTransitionStateProvider({ children }: { children: ReactNode }) {
  const [directoryTerm, setDirectoryTerm] = useState('')
  const [specialtyId, setSpecialtyId] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [profileDirection, setProfileDirection] = useState<1 | -1>(1)

  const value = useMemo(
    () => ({
      directoryTerm,
      setDirectoryTerm,
      specialtyId,
      setSpecialtyId,
      selectedDate,
      setSelectedDate,
      profileDirection,
      setProfileDirection
    }),
    [directoryTerm, specialtyId, selectedDate, profileDirection]
  )

  return <ConsultTransitionState.Provider value={value}>{children}</ConsultTransitionState.Provider>
}

export function useConsultTransitionState(): ConsultTransitionStateValue {
  const value = useContext(ConsultTransitionState)
  if (!value) throw new Error('useConsultTransitionState must be used inside ConsultTransitionStateProvider')
  return value
}
