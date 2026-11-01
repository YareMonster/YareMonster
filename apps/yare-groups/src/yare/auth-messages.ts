/**
 * Turns Supabase Auth error strings into something a person can act on.
 * Supabase's messages are accurate but terse ("Email not confirmed"); these say what to do next.
 */
export interface FriendlyMessage {
  title: string;
  body: string;
}

export function friendlyAuthError(message: string, email?: string): FriendlyMessage {
  const where = email ? ` to ${email}` : '';
  if (/Email not confirmed/i.test(message)) {
    return { title: 'Confirm your email first', body: `We sent a confirmation link${where}. Open it, then come back and sign in.` };
  }
  if (/Invalid login credentials/i.test(message)) {
    return { title: 'That did not match', body: 'Check the email and password and try again.' };
  }
  if (/not on the list/i.test(message)) {
    return { title: 'This email is not on the list', body: 'Whoever set up this deployment adds the emails that may create an account. Ask them, or your assistant, to add yours.' };
  }
  if (/Registration is closed/i.test(message)) {
    return { title: 'Registration is closed', body: 'This deployment already has its owner. Sign in instead.' };
  }
  if (/already registered|already exists/i.test(message)) {
    return { title: 'That email already has an account', body: 'Sign in instead, or reset the password from your Supabase project.' };
  }
  if (/rate limit|too many requests/i.test(message)) {
    return { title: 'Too many attempts', body: 'Wait a minute, then try again.' };
  }
  if (/Password should be at least/i.test(message)) {
    return { title: 'Password too short', body: 'Use at least 8 characters.' };
  }
  if (/Failed to fetch|NetworkError|network/i.test(message)) {
    return { title: 'Could not reach your database', body: 'Check your connection and that the Supabase URL in the configuration is right.' };
  }
  return { title: 'Something went wrong', body: message };
}
