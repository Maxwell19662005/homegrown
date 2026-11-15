'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { resolveReport, reviewSeller } from '@/lib/data';
import { str } from '@/lib/actions-util';

export async function decideSeller(form: FormData) {
  await requireAdmin();
  const d = str(form, 'decision');
  const decision = d === 'approved' || d === 'rejected' || d === 'suspended' ? d : null;
  if (!decision) redirect('/admin');
  const note = str(form, 'note', 500);
  if (decision !== 'approved' && !note) redirect('/admin?error=' + encodeURIComponent('Add a note explaining what the seller needs to fix.'));
  reviewSeller(str(form, 'user_id'), decision, note);
  redirect('/admin?notice=' + encodeURIComponent(`Seller ${decision}.`));
}

export async function decideReport(form: FormData) {
  await requireAdmin();
  const decision = form.get('decision') === 'upheld' ? 'upheld' : 'dismissed';
  resolveReport(str(form, 'report_id'), decision);
  redirect('/admin?notice=' + encodeURIComponent(decision === 'upheld' ? 'Report upheld. Listing stays paused.' : 'Report dismissed. Listing restored.'));
}
