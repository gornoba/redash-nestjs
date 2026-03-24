'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

import CreateDestinationDialog from '@/features/destinations/components/CreateDestinationDialog';
import { getDestinationLogoPath } from '@/features/destinations/utils/logo';
import type { SettingsDestinationItem } from '../types';

interface DestinationsSectionProps {
  items: SettingsDestinationItem[];
  openOnLoad?: boolean;
}

export default function DestinationsSection({
  items,
  openOnLoad = false,
}: DestinationsSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(openOnLoad);

  useEffect(() => {
    setIsModalOpen(openOnLoad);
  }, [openOnLoad]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isModalOpen]);

  const openCreateModal = () => {
    setIsModalOpen(true);

    if (pathname !== '/destinations/new') {
      router.push('/destinations/new');
    }
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);

    if (pathname === '/destinations/new') {
      router.push('/destinations');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button
          className="inline-flex h-8 items-center gap-2 rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600"
          onClick={openCreateModal}
          type="button"
        >
          <span aria-hidden="true">+</span>
          New Alert Destination
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-[14px] text-slate-500">
          <div>There are no alert destinations yet.</div>
          <div className="mt-2">
            <button
              className="text-[#2196F3] transition hover:text-sky-600"
              onClick={openCreateModal}
              type="button"
            >
              Click here
            </button>{' '}
            to add one.
          </div>
        </div>
      ) : (
        <div data-test="CardsList">
          <div className="-ml-[5px] -mt-[5px] flex w-full flex-wrap">
            {items.map((item) => (
              <Link
                key={item.id}
                className="m-[5px] flex w-[212px] cursor-pointer items-center rounded-[3px] border border-slate-200/80 bg-white px-[5px] py-[15px] shadow-none transition-[box-shadow] duration-300 ease-out hover:shadow-[rgba(102,136,153,0.15)_0px_4px_9px_-3px] focus:shadow-[rgba(102,136,153,0.15)_0px_4px_9px_-3px] focus:outline-none max-[1200px]:w-[217px] max-[755px]:w-[47%] max-[408px]:w-full max-[408px]:p-[5px]"
                href={`/destinations/${item.id}`}
              >
                <img
                  alt={item.type}
                  className="mr-[5px] h-16 w-16 shrink-0 object-contain max-[515px]:h-12 max-[515px]:w-12"
                  onError={(event) => {
                    event.currentTarget.src = '/static/images/redash_icon_small.png';
                  }}
                  src={getDestinationLogoPath(item.type)}
                />
                <h3 className="m-0 overflow-hidden text-[13px] leading-4 text-[#323232]">
                  {item.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isModalOpen ? <CreateDestinationDialog onClose={closeCreateModal} /> : null}
    </div>
  );
}
