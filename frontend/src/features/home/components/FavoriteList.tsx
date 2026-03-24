import Link from 'next/link';

import type { FavoriteItem } from '../types';

interface FavoriteListProps {
  title: string;
  items: FavoriteItem[];
  emptyHref: string;
  emptyLabel: string;
  buildHref: (item: FavoriteItem) => string;
}

export default function FavoriteList({
  title,
  items,
  emptyHref,
  emptyLabel,
  buildHref,
}: FavoriteListProps) {
  return (
    <>
      <div className="mb-5 flex items-center">
        <p className="m-0 flex-1 text-[14px] font-medium text-slate-800">{title}</p>
      </div>

      {items.length > 0 ? (
        <div role="list" className="overflow-hidden rounded-[3px] border border-slate-200">
          {items.map((item, index) => (
            <Link
              key={`${title}-${item.id}`}
              role="listitem"
              className={[
                'flex items-center border-slate-200 bg-white px-[15px] py-2.5 text-[14px] text-slate-800 transition hover:bg-slate-50',
                index > 0 ? 'border-t' : '',
              ].join(' ')}
              href={buildHref(item)}
            >
              <span className="mr-[5px] text-[#e4a11b]" aria-hidden="true">
                ★
              </span>
              <span className="flex-1">{item.name}</span>
              {item.is_draft ? (
                <span className="ml-[5px] rounded bg-slate-200 px-[7px] text-xs leading-5 text-slate-500">
                  Unpublished
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[14px] text-slate-500">
          <span className="mr-[5px] text-[#e4a11b]" aria-hidden="true">
            ★
          </span>
          Favorite <Link className="text-[#2196F3]" href={emptyHref}>{emptyLabel}</Link> will appear here
        </p>
      )}
    </>
  );
}
