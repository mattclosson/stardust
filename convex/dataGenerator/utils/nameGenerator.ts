/**
 * Name generation utilities
 * Provides realistic first names, last names, and address data
 */

import { pickRandom, randomInt } from "./randomUtils"

// Common first names (US Census data inspired)
const MALE_FIRST_NAMES = [
  "James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph",
  "Thomas", "Christopher", "Charles", "Daniel", "Matthew", "Anthony", "Mark",
  "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian",
  "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan",
  "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin",
  "Scott", "Brandon", "Benjamin", "Samuel", "Raymond", "Gregory", "Frank",
  "Alexander", "Patrick", "Jack", "Dennis", "Jerry", "Tyler", "Aaron", "Jose",
  "Adam", "Nathan", "Henry", "Douglas", "Zachary", "Peter", "Kyle", "Noah",
  "Ethan", "Jeremy", "Walter", "Christian", "Keith", "Roger", "Terry", "Austin",
  "Sean", "Gerald", "Carl", "Dylan", "Harold", "Jordan", "Jesse", "Bryan",
  "Lawrence", "Arthur", "Gabriel", "Bruce", "Albert", "Willie", "Alan", "Wayne",
  "Elijah", "Randy", "Roy", "Vincent", "Ralph", "Eugene", "Russell", "Bobby",
  "Mason", "Philip", "Louis", "Harry", "Billy", "Howard", "Fred", "Juan"
]

const FEMALE_FIRST_NAMES = [
  "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth", "Susan",
  "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra",
  "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Dorothy", "Carol",
  "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura",
  "Cynthia", "Kathleen", "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela",
  "Emma", "Nicole", "Helen", "Samantha", "Katherine", "Christine", "Debra",
  "Rachel", "Carolyn", "Janet", "Catherine", "Maria", "Heather", "Diane",
  "Ruth", "Julie", "Olivia", "Joyce", "Virginia", "Victoria", "Kelly", "Lauren",
  "Christina", "Joan", "Evelyn", "Judith", "Megan", "Andrea", "Cheryl", "Hannah",
  "Jacqueline", "Martha", "Gloria", "Teresa", "Ann", "Sara", "Madison", "Frances",
  "Kathryn", "Janice", "Jean", "Abigail", "Alice", "Judy", "Sophia", "Grace",
  "Denise", "Amber", "Doris", "Marilyn", "Danielle", "Beverly", "Isabella",
  "Theresa", "Diana", "Natalie", "Brittany", "Charlotte", "Marie", "Kayla", "Alexis"
]

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
  "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
  "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey",
  "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson",
  "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
  "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster"
]

// Street types
const STREET_TYPES = [
  "St", "Ave", "Blvd", "Dr", "Ln", "Rd", "Way", "Ct", "Pl", "Cir", "Pkwy", "Ter"
]

const STREET_NAMES = [
  "Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington", "Park", "Lake",
  "Hill", "Forest", "River", "Spring", "Valley", "Sunset", "Highland", "Church",
  "Mill", "Center", "Union", "Franklin", "Clinton", "Jefferson", "Madison",
  "Jackson", "Lincoln", "Monroe", "Adams", "Harrison", "Wilson", "Grant",
  "Broadway", "Market", "College", "School", "Academy", "Liberty", "Commerce"
]

// Cities by state
const CITIES_BY_STATE: Record<string, string[]> = {
  CA: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Fresno", "Long Beach", "Oakland", "Bakersfield", "Anaheim"],
  NY: ["New York", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"],
  TX: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo"],
  FL: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral"],
  IL: ["Chicago", "Aurora", "Rockford", "Joliet", "Naperville", "Springfield", "Peoria", "Elgin", "Waukegan", "Champaign"],
  PA: ["Philadelphia", "Pittsburgh", "Allentown", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona", "Erie"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Gilbert", "Tempe", "Peoria", "Surprise"],
  CO: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada", "Westminster", "Pueblo", "Boulder"],
  MA: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton", "Quincy", "Lynn", "New Bedford", "Fall River"],
  MN: ["Minneapolis", "St. Paul", "Rochester", "Duluth", "Bloomington", "Brooklyn Park", "Plymouth", "St. Cloud", "Woodbury", "Eagan"],
}

/**
 * Generate a random first name
 */
export function generateFirstName(gender?: "M" | "F"): string {
  if (gender === "M") {
    return pickRandom(MALE_FIRST_NAMES)
  }
  if (gender === "F") {
    return pickRandom(FEMALE_FIRST_NAMES)
  }
  // Random gender
  return Math.random() < 0.5
    ? pickRandom(MALE_FIRST_NAMES)
    : pickRandom(FEMALE_FIRST_NAMES)
}

/**
 * Generate a random last name
 */
export function generateLastName(): string {
  return pickRandom(LAST_NAMES)
}

/**
 * Generate a full name
 */
export function generateFullName(gender?: "M" | "F"): {
  firstName: string
  lastName: string
  gender: "M" | "F"
} {
  const actualGender = gender || (Math.random() < 0.5 ? "M" : "F")
  return {
    firstName: generateFirstName(actualGender),
    lastName: generateLastName(),
    gender: actualGender,
  }
}

/**
 * Generate a street address
 */
export function generateStreetAddress(): string {
  const number = randomInt(100, 9999)
  const streetName = pickRandom(STREET_NAMES)
  const streetType = pickRandom(STREET_TYPES)
  return `${number} ${streetName} ${streetType}`
}

/**
 * Generate an apartment/unit number (optional)
 */
export function generateUnit(): string | undefined {
  if (Math.random() < 0.2) {
    const unitType = Math.random() < 0.5 ? "Apt" : "Unit"
    const unitNumber = Math.random() < 0.5
      ? String(randomInt(1, 999))
      : String.fromCharCode(65 + randomInt(0, 25)) // A-Z
    return `${unitType} ${unitNumber}`
  }
  return undefined
}

/**
 * Generate a city for a given state
 */
export function generateCity(state: string): string {
  const cities = CITIES_BY_STATE[state]
  if (cities) {
    return pickRandom(cities)
  }
  // Fallback generic cities
  return pickRandom(["Springfield", "Franklin", "Clinton", "Madison", "Georgetown"])
}

/**
 * Generate a complete address for a given state
 */
export function generateAddress(state: string): {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
} {
  const { generateZipCode } = require("./identifierUtils")
  
  return {
    line1: generateStreetAddress(),
    line2: generateUnit(),
    city: generateCity(state),
    state,
    zip: generateZipCode(state),
  }
}

/**
 * Generate a date of birth based on age parameters
 */
export function generateDateOfBirth(
  meanAge: number,
  stdDev: number,
  minAge: number = 0,
  maxAge: number = 100
): string {
  // Generate age with normal distribution
  let age = Math.round(meanAge + (Math.random() * 2 - 1) * stdDev * 2)
  age = Math.max(minAge, Math.min(maxAge, age))
  
  const today = new Date()
  const birthYear = today.getFullYear() - age
  const birthMonth = randomInt(0, 11)
  const birthDay = randomInt(1, 28) // Safe for all months
  
  const birthDate = new Date(birthYear, birthMonth, birthDay)
  
  // Format as YYYY-MM-DD
  const year = birthDate.getFullYear()
  const month = String(birthDate.getMonth() + 1).padStart(2, "0")
  const day = String(birthDate.getDate()).padStart(2, "0")
  
  return `${year}-${month}-${day}`
}

/**
 * Generate an email address
 */
export function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com"]
  const domain = pickRandom(domains)
  const separator = pickRandom([".", "_", ""])
  const number = Math.random() < 0.3 ? String(randomInt(1, 99)) : ""
  
  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${number}@${domain}`
}

/**
 * Generate a provider name (Dr. First Last)
 */
export function generateProviderName(): {
  firstName: string
  lastName: string
  fullName: string
} {
  const firstName = generateFirstName()
  const lastName = generateLastName()
  return {
    firstName,
    lastName,
    fullName: `Dr. ${firstName} ${lastName}`,
  }
}
