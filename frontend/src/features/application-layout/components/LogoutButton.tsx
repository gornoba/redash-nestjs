'use client';

import { useRouter } from 'next/navigation';

import { logout } from '../api/logoutApi';

interface LogoutButtonProps {
  className: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await logout();

    router.replace('/login');
    router.refresh();
  }

  return (
    <button className={className} onClick={handleLogout} type="button">
      Log out
    </button>
  );
}
