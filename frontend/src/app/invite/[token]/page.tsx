import InviteAcceptForm from '@/features/users/components/InviteAcceptForm';

export const dynamic = 'force-dynamic';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <InviteAcceptForm mode="invite" token={token} />
    </div>
  );
}
