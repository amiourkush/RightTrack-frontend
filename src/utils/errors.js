export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  return data?.message || data?.error || error?.message || fallback;
}

export function looksLikeUnverifiedEmail(message = '') {
  const value = message.toLowerCase();
  return value.includes('not verified') || value.includes('email is not verified') || value.includes('verify your email');
}

export function looksLikeExistingEmail(message = '') {
  const value = message.toLowerCase();
  return value.includes('already registered') || value.includes('already exists') || value.includes('email already');
}
