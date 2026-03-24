import Image from "next/image";
import Link from "next/link";

import SetupForm from "./SetupForm";

interface SetupPageProps {
  defaults: {
    securityNotifications: boolean;
    newsletter: boolean;
  };
}

export default function SetupPage({ defaults }: SetupPageProps) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-100 px-3 py-3 sm:items-center sm:px-4 sm:py-4">
      <div className="w-full max-w-[80vw] sm:max-w-[500px]">
        <header className="mt-4 mb-4 sm:mt-[25px] sm:mb-[25px]">
          <div className="mb-[15px] text-center">
            <Link href="/" aria-label="Redash">
              <Image
                alt="Redash"
                height={40}
                src="/static/images/redash_icon_small.png"
                unoptimized
                width={40}
              />
            </Link>
          </div>
          <h1 className="bg-white text-center text-[28px] leading-none font-normal text-slate-800 sm:text-[30px]">
            Redash Initial Setup
          </h1>
        </header>

        <main className="w-full rounded-md bg-white px-4 py-[18px] text-slate-700 shadow-[rgba(110,119,132,0.15)_0_4px_9px_-3px] sm:px-[25px] sm:py-[25px]">
          <h2 className="mb-2 text-[17px] font-normal text-slate-800 sm:text-lg">
            Welcome to Redash!
          </h2>
          <p className="mb-[18px] text-sm leading-6 text-slate-500 sm:mb-6">
            Before you can use your instance, you need to do a quick setup.
          </p>
          <SetupForm defaults={defaults} />
        </main>
      </div>
    </div>
  );
}
