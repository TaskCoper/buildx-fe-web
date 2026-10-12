export const consultationKeys = {
  all: ['consultation'] as const,

  consultants: () => [...consultationKeys.all, 'consultants'] as const,
  consultantPages: () => [...consultationKeys.consultants(), 'pages'] as const,
  directory: (filter: { keyword: string; specialtyId: string }) =>
    [...consultationKeys.consultants(), 'directory', filter] as const,
  specialties: () => [...consultationKeys.consultants(), 'specialties'] as const,
  consultantDetail: (id: string) => [...consultationKeys.consultants(), 'detail', id] as const,

  availability: (consultantId: string) => [...consultationKeys.all, 'availability', consultantId] as const,
  myBookings: () => [...consultationKeys.all, 'my-bookings'] as const,
  myRequests: () => [...consultationKeys.all, 'my-requests'] as const
} as const
