import { SubPage } from './ui';
import { SUPPORT_EMAIL } from '@/lib/config';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SubPage back="/profile" title={title}>
      <p className="rounded-xl bg-[#FFF1C9] p-3 text-sm text-[#5C4310]">Draft placeholder — have your attorney write the final version before launch.</p>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-[#2E3B32]">{children}</div>
      {SUPPORT_EMAIL && <p className="text-sm text-muted">Questions? Email <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>}
    </SubPage>
  );
}
