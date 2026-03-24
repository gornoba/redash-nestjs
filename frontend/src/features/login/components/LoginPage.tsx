"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useToastMessage } from "@/lib/toast";
import { login } from "../api/loginApi";

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useToastMessage(errorMessage, "error");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      await login({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "#F6F8F9" }}
    >
      <div>
        {/* Header with logo and title */}
        <div className="mb-[25px] mt-[25px] text-center">
          <div className="mb-[15px] flex items-center justify-center">
            <Link href="/">
              <Image
                alt="Redash"
                height={40}
                src="/static/images/redash_icon_small.png"
                unoptimized
                width={40}
              />
            </Link>
          </div>
          <h3 className="m-0 text-center text-[24px] font-medium text-[#333]">
            Login to Redash
          </h3>
        </div>

        {/* Form card */}
        <div className="w-[500px] rounded bg-white p-[25px] max-sm:w-[80vw]">
          <form onSubmit={onSubmit}>
            <div className="mb-[15px]">
              <label
                htmlFor="inputEmail"
                className="mb-[5px] block text-[14px] font-bold text-[#333]"
              >
                Email
              </label>
              <input
                className="h-[34px] w-full rounded-[4px] border border-[#ccc] bg-white px-3 text-center text-[14px] text-[#555] shadow-inner outline-none transition focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.075),0_0_8px_rgba(102,175,233,0.6)]"
                id="inputEmail"
                name="email"
                type="text"
              />
            </div>

            <div className="mb-[15px]">
              <label
                htmlFor="inputPassword"
                className="mb-[5px] block text-[14px] font-bold text-[#333]"
              >
                Password
              </label>
              <input
                className="h-[34px] w-full rounded-[4px] border border-[#ccc] bg-white px-3 text-center text-[14px] text-[#555] shadow-inner outline-none transition focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.075),0_0_8px_rgba(102,175,233,0.6)]"
                id="inputPassword"
                name="password"
                type="password"
              />
            </div>

            <div className="mb-[15px]">
              <input
                defaultChecked
                id="inputRemember"
                name="remember"
                type="checkbox"
              />
              <label htmlFor="inputRemember" className="ml-1 text-[14px]">
                Remember me
              </label>
            </div>

            <button
              className="mt-[25px] h-[34px] w-full cursor-pointer rounded-[4px] border border-[#2196F3] bg-[#2196F3] text-[14px] text-white transition hover:bg-[#1976D2] disabled:cursor-wait disabled:opacity-80"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Logging In..." : "Log In"}
            </button>
          </form>

          <div className="mt-[25px]">
            <a className="text-[14px] text-[#2196F3]" href="/forgot">
              I forgot my password
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
