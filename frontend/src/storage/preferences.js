export function guestMode() {
  try {
    return (
      sessionStorage.getItem('pilihanku.mode') ||
      localStorage.getItem('pilihanku.device-preference') ||
      'shared'
    );
  } catch {
    return 'shared';
  }
}
export function chooseGuestMode(mode) {
  try {
    sessionStorage.setItem('pilihanku.mode', mode);
    if (mode === 'personal') localStorage.setItem('pilihanku.device-preference', mode);
    else localStorage.removeItem('pilihanku.device-preference');
    return true;
  } catch {
    return false;
  }
}
