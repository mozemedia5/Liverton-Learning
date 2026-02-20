import type { Timestamp } from 'firebase/firestore';

export function toDate(value: unknown): Date {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return new Date(0);
  }
  
  // If it's already a Date, validate it
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value;
    }
    return new Date(0);
  }
  
  // Handle objects (including Firestore Timestamp)
  if (typeof value === 'object' && value !== null) {
    // Check for toDate method (Firestore Timestamp)
    if ('toDate' in value && typeof (value as any).toDate === 'function') {
      try {
        const date = (value as Timestamp).toDate();
        if (date instanceof Date && typeof date.getTime === 'function' && !isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        console.warn('Error converting timestamp with toDate():', e);
      }
    }
    
    // Handle seconds field
    if ('seconds' in value && typeof (value as any).seconds === 'number') {
      try {
        const date = new Date((value as any).seconds * 1000);
        if (typeof date.getTime === 'function' && !isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        console.warn('Error converting timestamp with seconds:', e);
      }
    }
    
    // Handle _seconds field (some Firebase SDK versions)
    if ('_seconds' in value && typeof (value as any)._seconds === 'number') {
      try {
        const date = new Date((value as any)._seconds * 1000);
        if (typeof date.getTime === 'function' && !isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        console.warn('Error converting timestamp with _seconds:', e);
      }
    }
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    const date = new Date(value);
    if (typeof date.getTime === 'function' && !isNaN(date.getTime())) {
      return date;
    }
    return new Date(0);
  }
  
  // Handle strings
  if (typeof value === 'string') {
    const date = new Date(value);
    if (typeof date.getTime === 'function' && !isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Fallback
  return new Date(0);
}