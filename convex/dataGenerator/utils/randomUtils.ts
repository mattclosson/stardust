/**
 * Random utility functions for data generation
 * Provides weighted random selection, distributions, and sampling
 */

/**
 * Select a random item from an array with weighted probabilities
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) {
    throw new Error("Items and weights must have the same length")
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }

  return items[items.length - 1]
}

/**
 * Select from an object where keys are items and values are weights
 */
export function weightedRandomFromObject<T extends string>(
  distribution: Record<T, number>
): T {
  const items = Object.keys(distribution) as T[]
  const weights = Object.values(distribution) as number[]
  return weightedRandom(items, weights)
}

/**
 * Generate a random number following a normal distribution
 * Uses Box-Muller transform
 */
export function normalDistribution(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

/**
 * Generate a random integer following a normal distribution, clamped to min/max
 */
export function normalDistributionInt(
  mean: number,
  stdDev: number,
  min: number,
  max: number
): number {
  const value = Math.round(normalDistribution(mean, stdDev))
  return Math.max(min, Math.min(max, value))
}

/**
 * Generate a random number following an exponential distribution
 * Useful for modeling time between events
 */
export function exponentialDistribution(lambda: number): number {
  return -Math.log(1 - Math.random()) / lambda
}

/**
 * Generate a random integer following a Poisson distribution
 * Useful for modeling count data (e.g., claims per day)
 */
export function poissonDistribution(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1

  do {
    k++
    p *= Math.random()
  } while (p > L)

  return k - 1
}

/**
 * Pick a random item from an array
 */
export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Pick multiple random items from an array (without replacement)
 */
export function pickMultiple<T>(items: T[], count: number): T[] {
  if (count >= items.length) {
    return [...items]
  }

  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Pick multiple random items from an array (with replacement)
 */
export function pickMultipleWithReplacement<T>(items: T[], count: number): T[] {
  const result: T[] = []
  for (let i = 0; i < count; i++) {
    result.push(pickRandom(items))
  }
  return result
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a random float between min and max
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Generate a random float and round to specified decimal places
 */
export function randomFloatRounded(
  min: number,
  max: number,
  decimals: number
): number {
  const value = randomFloat(min, max)
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

/**
 * Return true with the given probability (0-1)
 */
export function chance(probability: number): boolean {
  return Math.random() < probability
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Generate a random amount of money, rounded to cents
 */
export function randomMoney(min: number, max: number): number {
  return Math.round(randomFloat(min, max) * 100) / 100
}

/**
 * Generate a random percentage (0-1) with realistic distribution
 * Tends toward middle values
 */
export function randomPercentage(): number {
  // Beta distribution approximation for more realistic percentages
  const alpha = 2
  const beta = 2
  const u = Math.random()
  const v = Math.random()
  const x = Math.pow(u, 1 / alpha)
  const y = Math.pow(v, 1 / beta)
  return x / (x + y)
}
