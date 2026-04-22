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
  baseCurrency: string
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

export type TicketType = 'flight' | 'train' | 'hotel' | 'car' | 'bus' | 'ferry' | 'other'

export interface ParsedTicketData {
  type: TicketType
  // flight / transport
  flightNumber?: string
  airline?: string
  origin?: string
  destination?: string
  departureTime?: string
  arrivalTime?: string
  depTerminal?: string
  arrTerminal?: string
  cabinClass?: string
  baggage?: string
  flightDuration?: string
  meals?: string
  // hotel
  hotelName?: string
  checkIn?: string
  checkOut?: string
  roomType?: string
  // car rental
  rentalCompany?: string
  pickupLocation?: string
  dropoffLocation?: string
  pickupDateTime?: string
  dropoffDateTime?: string
  vehicleType?: string
  // common
  passengerName?: string
  bookingRef?: string
  gate?: string
  seat?: string
  terminal?: string
  date?: string
  allDates?: string[]
  rawText?: string
}

export interface Ticket {
  id: string
  tripId: string
  uploadedBy: string
  uploadedAt: number
  fileName: string
  fileType: string
  fileUrl?: string       // Firebase Storage URL (requires Storage rules)
  localFileKey?: string  // IndexedDB key for local file (always available on this device)
  parsed: ParsedTicketData
  manualOverrides?: Partial<ParsedTicketData>
  assignedMemberUid?: string
}

export interface ItineraryDay {
  date: string
  items: ItineraryItem[]
}

export interface ItineraryItem {
  id: string
  time?: string
  title: string
  description?: string
  ticketId?: string
  type: 'ticket' | 'activity' | 'note'
}

export interface Expense {
  id: string
  tripId: string
  title: string
  amount: number
  currency: string
  paidBy: string // uid
  splitWith: string[] // uids of everyone splitting, including payer
  date: number
  category: string
  createdAt: number
  isSettlement?: boolean
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
