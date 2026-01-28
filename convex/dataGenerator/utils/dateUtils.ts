/**
 * Date utility functions for data generation
 * Handles business days, date ranges, and claim aging
 */

/**
 * Check if a date falls on a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Check if a date is a business day (not weekend)
 * Note: Does not account for holidays
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date)
}

/**
 * Add business days to a date
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = Math.abs(days)
  const direction = days >= 0 ? 1 : -1

  while (remaining > 0) {
    result.setDate(result.getDate() + direction)
    if (isBusinessDay(result)) {
      remaining--
    }
  }

  return result
}

/**
 * Add calendar days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Generate a random date within a range
 */
export function randomDateInRange(start: Date, end: Date): Date {
  const startTime = start.getTime()
  const endTime = end.getTime()
  const randomTime = startTime + Math.random() * (endTime - startTime)
  return new Date(randomTime)
}

/**
 * Generate a random business day within a range
 */
export function randomBusinessDayInRange(start: Date, end: Date): Date {
  let date: Date
  let attempts = 0
  const maxAttempts = 100

  do {
    date = randomDateInRange(start, end)
    attempts++
  } while (!isBusinessDay(date) && attempts < maxAttempts)

  // If we couldn't find a business day, adjust to nearest one
  if (!isBusinessDay(date)) {
    if (date.getDay() === 0) date.setDate(date.getDate() + 1)
    if (date.getDay() === 6) date.setDate(date.getDate() + 2)
  }

  return date
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((end.getTime() - start.getTime()) / msPerDay)
}

/**
 * Get the number of business days between two dates
 */
export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  const endTime = end.getTime()

  while (current.getTime() <= endTime) {
    if (isBusinessDay(current)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Format a date as YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string to a Date
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the claim age category based on date of service
 */
export function getClaimAgeCategory(
  dateOfService: Date,
  now: Date = new Date()
): "recent" | "aging" | "historical" {
  const days = daysBetween(dateOfService, now)

  if (days <= 30) return "recent"
  if (days <= 90) return "aging"
  return "historical"
}

/**
 * Get the start of a day (midnight)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the end of a day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get a date N years ago from now
 */
export function yearsAgo(years: number, from: Date = new Date()): Date {
  const result = new Date(from)
  result.setFullYear(result.getFullYear() - years)
  return result
}

/**
 * Get a date N months ago from now
 */
export function monthsAgo(months: number, from: Date = new Date()): Date {
  const result = new Date(from)
  result.setMonth(result.getMonth() - months)
  return result
}

/**
 * Get a date N days ago from now
 */
export function daysAgo(days: number, from: Date = new Date()): Date {
  return addDays(from, -days)
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < now.getTime()
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date, now: Date = new Date()): boolean {
  return date.getTime() > now.getTime()
}

/**
 * Get the timestamp (milliseconds since epoch) for a date
 */
export function toTimestamp(date: Date): number {
  return date.getTime()
}

/**
 * Convert a timestamp to a Date
 */
export function fromTimestamp(timestamp: number): Date {
  return new Date(timestamp)
}

/**
 * Generate a date that simulates realistic claim submission timing
 * Claims are typically submitted 1-5 business days after service
 */
export function generateSubmissionDate(dateOfService: Date): Date {
  const daysDelay = Math.floor(Math.random() * 5) + 1
  return addBusinessDays(dateOfService, daysDelay)
}

/**
 * Generate a date for when a claim might be acknowledged
 * Typically 1-3 business days after submission
 */
export function generateAcknowledgmentDate(submissionDate: Date): Date {
  const daysDelay = Math.floor(Math.random() * 3) + 1
  return addBusinessDays(submissionDate, daysDelay)
}

/**
 * Generate a date for when a claim might be adjudicated (paid/denied)
 * Typically 14-45 days after submission
 */
export function generateAdjudicationDate(submissionDate: Date): Date {
  const daysDelay = Math.floor(Math.random() * 31) + 14
  return addDays(submissionDate, daysDelay)
}
