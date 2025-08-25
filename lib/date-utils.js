import { differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, format } from 'date-fns';

/**
 * Calculate and format baby's age in a user-friendly way
 * @param {string|Date} birthday - Baby's birthday
 * @returns {string} Formatted age string
 */
export function calculateBabyAge(birthday) {
  if (!birthday) return '';
  
  const birthDate = typeof birthday === 'string' ? new Date(birthday) : birthday;
  const now = new Date();
  
  const days = differenceInDays(now, birthDate);
  const weeks = differenceInWeeks(now, birthDate);
  const months = differenceInMonths(now, birthDate);
  const years = differenceInYears(now, birthDate);
  
  if (days < 0) {
    return 'Due soon';
  } else if (days === 0) {
    return 'Today!';
  } else if (days === 1) {
    return '1 day old';
  } else if (days < 14) {
    return `${days} days old`;
  } else if (weeks < 8) {
    return `${weeks} week${weeks === 1 ? '' : 's'} old`;
  } else if (months < 24) {
    return `${months} month${months === 1 ? '' : 's'} old`;
  } else {
    return `${years} year${years === 1 ? '' : 's'} old`;
  }
}

/**
 * Get baby's emoji avatar based on gender
 * @param {string} gender - Baby's gender (BOY, GIRL, OTHER)
 * @returns {string} Emoji representation
 */
export function getBabyAvatar(gender) {
  switch (gender?.toUpperCase()) {
    case 'BOY':
      return '👶🏻'; // Boy emoji
    case 'GIRL':
      return '👶🏻'; // Girl emoji (same for now, could be different)
    case 'OTHER':
      return '👶'; // Generic baby emoji
    default:
      return '👶'; // Default
  }
}

/**
 * Get a random pastel background color for baby avatar
 * @param {string} babyName - Baby's name to ensure consistent color
 * @returns {string} CSS class name
 */
export function getBabyAvatarBg(babyName) {
  if (!babyName) return 'bg-blue-100';
  
  const colors = [
    'bg-blue-100',
    'bg-pink-100', 
    'bg-purple-100',
    'bg-green-100',
    'bg-yellow-100',
    'bg-indigo-100',
    'bg-orange-100',
    'bg-teal-100'
  ];
  
  // Use name length and first character to get consistent color
  const index = (babyName.length + babyName.charCodeAt(0)) % colors.length;
  return colors[index];
}

/**
 * Format date for display
 * @param {string|Date} date 
 * @returns {string}
 */
export function formatDisplayDate(date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}