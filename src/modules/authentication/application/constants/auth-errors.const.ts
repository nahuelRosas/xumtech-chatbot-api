export const AuthErrorMessages = {
  INVALID_ISS: 'Firebase ID token has incorrect "iss"',
  INVALID_AUD: 'Firebase ID token has incorrect "aud"',
  TOKEN_EXPIRED: 'Firebase ID token has expired.',
  INVALID_SESSION_COOKIE: 'Invalid session cookie',
  PROJECT_EXTRACTION_FAILED:
    'Unable to extract expected project from error message',
  TOKEN_VALIDATION_FAILED: 'Token validation failed for switched project',
  INVALID_TOKEN: 'Invalid authentication token',
  TOKEN_EXPIRED_USER: 'Token has expired',
} as const;

export const PROJECT_EXTRACTION_REGEX = /but got "([^"]+)"/;
