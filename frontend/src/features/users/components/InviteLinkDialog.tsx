'use client';

interface InviteLinkDialogProps {
  inviteLink: string;
  userName: string;
  onClose: () => void;
}

export default function InviteLinkDialog({
  inviteLink,
  userName,
  onClose,
}: InviteLinkDialogProps) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-[560px] rounded-sm bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-[22px] font-medium text-slate-800">
            Email not sent!
          </h4>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-[14px] leading-6 text-slate-600">
            The mail server is not configured, please send the following link to{' '}
            <b>{userName}</b>:
          </p>
          <input
            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none"
            readOnly
            value={inviteLink}
          />
        </div>
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-9 items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600"
            onClick={onClose}
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
