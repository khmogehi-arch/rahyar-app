import { loadEntry } from '../entrySession';

// The visitor never sees a login form (spec section 5). If they land here
// without having scanned an entrance QR this session, we just ask them to
// scan — never a form.
export default function RequireEntry({ children }) {
  const entry = loadEntry();
  if (!entry) {
    return (
      <div className="centered-page">
        <div className="message-card">
          <h2>راهیار</h2>
          <p>برای شروع، لطفاً کد QR نصب‌شده در درب ورودی ساختمان را اسکن کنید.</p>
        </div>
      </div>
    );
  }
  return children;
}
