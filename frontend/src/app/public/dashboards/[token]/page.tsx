import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="mx-auto max-w-[1200px] px-[15px] pt-[15px] pb-10">
        <div className="mb-4 text-center">
          <h3 className="text-2xl font-medium text-slate-800">
            Public Dashboard
          </h3>
          <p className="mt-1 text-[14px] text-slate-500">
            Shared dashboard (token: {token})
          </p>
        </div>
        <div className="min-h-[400px] rounded-[3px] bg-white p-6 shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded border border-dashed border-slate-300 p-4">
              <div className="mb-3 border-b border-slate-200 pb-2 text-[14px] font-medium text-slate-700">
                Widget
              </div>
              <div className="flex h-[200px] items-center justify-center text-[14px] text-slate-400">
                Public visualization area
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
