import { LegalPage } from '@/components/LegalPage';
export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>We collect your name, email, neighborhood and order history to run the marketplace. Sellers also provide a phone number, pickup address and verification documents. Payment details are handled by Stripe and never stored on our servers.</p>
      <p>A seller’s pickup address is shown only to buyers with a confirmed reservation. Verification documents are visible only to the seller and our review team.</p>
      <p>We never sell your data. You can ask us to delete your account and data at any time.</p>
    </LegalPage>
  );
}
