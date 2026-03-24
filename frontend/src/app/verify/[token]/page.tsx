import VerifyEmailResult from '@/features/home/components/VerifyEmailResult';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <VerifyEmailResult token={token} />
    </div>
  );
}
