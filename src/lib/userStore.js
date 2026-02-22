// Lightweight module-level store for the current user's storage prefix.
// Updated by AuthContext on login/logout so non-React modules (claudeClient, reminderEngine)
// can build user-scoped localStorage keys without needing React context.

let _prefix = '';

export function setCurrentUser(email) {
  _prefix = email
    ? email.toLowerCase().replace(/[^a-z0-9]/g, '_') + '__'
    : '';
}

export function clearCurrentUser() {
  _prefix = '';
}

// Returns e.g. "john_doe_gmail_com__" — prefix every localStorage key with this.
export function getUserPrefix() {
  return _prefix;
}
