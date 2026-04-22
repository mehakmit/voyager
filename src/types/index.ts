export interface User {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
}

export interface TripMember {
  uid: string
  email: string
  displayName: string | null
  role: 'owner' | 'member'
  joinedAt: number
}

export interface TripSettings {
  showCar: boolean
  showExpenses: boolean
}

export interface Trip {
  id: string
  name: string
  destination: string
  startDate: number // unix ms
  endDate: number
  members: string[] // uids
  memberDetails: Record<string, TripMember>
  ownerId: string
  settings: TripSettings
  createdAt: number
  inviteToken?: string
}

export type TicketType = 'flight' | 'train' | 'hotel' | 'bus' | 'ferry' | 'other'

export interface ParsedTicketData {
  type: TicketType
  // flight / transport
  flightNumber?: string
  carrier?: string
  origin?: string
  destination?: string
  departureTime?: string
  arrivalTime?: string
  // hotel
  hotelName?: string
  checkIn?: string
  checkOut?: string
  // common
  passengerName?: string
  bookingRef?: string
  gate?: string
  seat?: string
  terminal?: string
  date?: string
  rawText?: string
}

export interface Ticket {
  id: string
  tripId: string
  uploadedBy: string
  uploadedAt: number
  fileName: string
  fileType: string
  fileUrl?: string // if stored in Firebase Storage
  localPath?: string
  parsed: ParsedTicketData
  manualOverrides?: Partial<ParsedTicketData>
  assignedTo?: string[] // uids
}

export interface ItineraryDay {
  date: string // ISO date YYYY-MM-DD
  items: ItineraryItem[]
}

export interface ItineraryItem {
  id: string
  time?: string
  title: string
  description?: string
  ticketId?: string // linked ticket
  type: 'ticket' | 'activity' | 'note'
}

export interface Expense {
  id: string
  tripId: string
  title: string
  amount: number
  currency: string
  paidBy: string // uid
  splitWith: string[] // uids
  date: number
  category: string
  receiptUrl?: string
  createdAt: number
}

export interface CarDetails {
  id: string
  tripId: string
  rentalCompany?: string
  plateNumber?: string
  pickupLocation?: string
  dropoffLocation?: string
  pickupDate?: number
  dropoffDate?: number
  bookingRef?: string
  notes?: string
  driverUids?: string[]
}
