// utils/bloodCompatibility.js
// Encapsulates blood type compatibility rules in one place so the logic is easy to test,
// explain to the instructor, and verify against the standard transfusion chart.
//
// Rule of thumb:
//   O- is the universal donor  (can give to anyone)
//   AB+ is the universal recipient (can receive from anyone)
//
// COMPATIBLE_DONORS[recipientType] = list of blood types that CAN donate to that recipient.

const COMPATIBLE_DONORS = {
  'O-':  ['O-'],
  'O+':  ['O-', 'O+'],
  'A-':  ['O-', 'A-'],
  'A+':  ['O-', 'O+', 'A-', 'A+'],
  'B-':  ['O-', 'B-'],
  'B+':  ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

const ALL_BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

/**
 * Returns the list of donor blood types that are safe to give to someone
 * who needs `recipientType`.
 */
function getCompatibleDonorTypes(recipientType) {
  return COMPATIBLE_DONORS[recipientType] || [];
}

/**
 * Returns true if a donor with `donorType` blood can safely donate to
 * someone who needs `recipientType` blood.
 */
function isCompatible(donorType, recipientType) {
  return getCompatibleDonorTypes(recipientType).includes(donorType);
}

/**
 * A donor is eligible to donate again if at least 90 days (roughly 3 months)
 * have passed since their last donation, per the brief's cooldown rule.
 * If they have no recorded last donation, they're treated as eligible.
 */
function isEligibleByCooldown(lastDonationDate) {
  if (!lastDonationDate) return true;
  const last = new Date(lastDonationDate);
  const now = new Date();
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  return diffDays >= 90;
}

/**
 * How many days remain before a donor is eligible again. Returns 0 if already eligible.
 */
function daysUntilEligible(lastDonationDate) {
  if (!lastDonationDate) return 0;
  const last = new Date(lastDonationDate);
  const now = new Date();
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  const remaining = 90 - diffDays;
  return remaining > 0 ? remaining : 0;
}

module.exports = {
  ALL_BLOOD_TYPES,
  getCompatibleDonorTypes,
  isCompatible,
  isEligibleByCooldown,
  daysUntilEligible,
};
