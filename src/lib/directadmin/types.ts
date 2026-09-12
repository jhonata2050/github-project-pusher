/**
 * Types and utility functions for DirectAdmin API integration.
 */

export interface DARequestOptions {
  hostname: string;
  apiUser: string;
  apiToken: string;
  command: string;
  method?: 'GET' | 'POST';
  params?: Record<string, string>;
}

export type DAConnectionResult =
  | {
      success: true;
      hostname: string;
      apiUser: string;
      packageCount: number;
      packages: string[];
    }
  | {
      success: false;
      hostname: string;
      error: string;
    };

export function generateStrongPassword(length = 32): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'; // Expanded symbols set
  const allCharacters = `${uppercase}${lowercase}${numbers}${symbols}`;
  
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  const password = [
    uppercase.charAt((randomValues[0] ?? 0) % uppercase.length),
    lowercase.charAt((randomValues[1] ?? 0) % lowercase.length),
    numbers.charAt((randomValues[2] ?? 0) % numbers.length),
    symbols.charAt((randomValues[3] ?? 0) % symbols.length),
  ];

  // Fill the rest with truly random characters
  for (let i = 4; i < length; i++) {
    password.push(allCharacters.charAt((randomValues[i] ?? 0) % allCharacters.length));
  }

  // Cryptographically secure shuffle
  for (let i = password.length - 1; i > 0; i--) {
    const j = (randomValues[i] ?? 0) % (i + 1);
    [password[i], password[j]] = [password[j]!, password[i]!];
  }

  return password.join('');
}
