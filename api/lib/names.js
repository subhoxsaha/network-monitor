const ADJECTIVES = [
  'Swift', 'Stellar', 'Quantum', 'Neon', 'Silent', 'Dynamic', 'Azure', 'Crimson',
  'Golden', 'Silver', 'Mystic', 'Solar', 'Lunar', 'Cosmic', 'Void', 'Radiant',
  'Emerald', 'Shadow', 'Ghost', 'Nova', 'Cyborg', 'Hidden', 'Primal', 'Cyber'
];

const NOUNS = [
  'Nomad', 'Falcon', 'Voyager', 'Phantom', 'Nexus', 'Pulse', 'Drifter', 'Wraith',
  'Specter', 'Titan', 'Ghost', 'Sentinel', 'Pilot', 'Rider', 'Hacker', 'Oracle',
  'Vector', 'Cipher', 'Spark', 'Flare', 'Shadow', 'Siren', 'Apex', 'Zenith'
];

/**
 * Returns a consistent random name for a given seed (userId)
 */
export function generateRandomName(seed) {
  if (!seed) return 'Anonymous User';
  
  // Simple hash for seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const absHash = Math.abs(hash);
  const adjIndex = absHash % ADJECTIVES.length;
  const nounIndex = Math.floor(absHash / ADJECTIVES.length) % NOUNS.length;
  
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
}
