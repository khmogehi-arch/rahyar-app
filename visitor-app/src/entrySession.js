const KEY = 'rahyar_visitor_entry';

// The visitor scans a QR code exactly once, at the entrance (spec section 3).
// We keep that entrance context in sessionStorage so the rest of the visit
// (choosing a destination, viewing the route, "I got lost") never needs
// another scan or any location permission.
export function saveEntry(entry) {
  sessionStorage.setItem(KEY, JSON.stringify(entry));
}

export function loadEntry() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearEntry() {
  sessionStorage.removeItem(KEY);
}
