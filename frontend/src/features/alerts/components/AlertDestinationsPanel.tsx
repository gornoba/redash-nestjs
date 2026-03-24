'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

import {
  getDestinationsClient,
} from '@/features/destinations/api/destinationsClientApi';
import { getDestinationLogoPath } from '@/features/destinations/utils/logo';
import type { DestinationListItem } from '@/features/destinations/types';
import type { SessionResponse } from '@/features/home/types';

import {
  createAlertSubscription,
  deleteAlertSubscription,
} from '../api/alertsClientApi';
import type { AlertSubscriptionItem } from '../types';

interface AlertDestinationsPanelProps {
  alertId: number;
  onError: (message: string) => void;
  onSubscriptionsChange: Dispatch<SetStateAction<AlertSubscriptionItem[]>>;
  session: SessionResponse;
  subscriptions: AlertSubscriptionItem[];
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 14 14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 3h6v6M9 3 3 9m0-5v7h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function DestinationRow({
  action,
  destinationName,
  destinationType,
  rightContent,
}: {
  action?: ReactNode;
  destinationName: string;
  destinationType: string;
  rightContent?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[2px] border border-slate-200 bg-white px-3 py-2.5">
      <img
        alt={destinationType}
        className="h-8 w-8 shrink-0 object-contain"
        onError={(event) => {
          event.currentTarget.src = '/static/images/redash_icon_small.png';
        }}
        src={getDestinationLogoPath(destinationType)}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-slate-700">
          {destinationName}
        </div>
        <div className="text-[11px] uppercase tracking-[0.04em] text-slate-400">
          {destinationType}
        </div>
      </div>
      {rightContent}
      {action}
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled = false,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition',
        checked ? 'bg-[#2196F3]' : 'bg-slate-300',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span
        className={[
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition',
          checked ? 'left-[18px]' : 'left-0.5',
        ].join(' ')}
      />
    </button>
  );
}

export default function AlertDestinationsPanel({
  alertId,
  onError,
  onSubscriptionsChange,
  session,
  subscriptions,
}: AlertDestinationsPanelProps) {
  const [allDestinations, setAllDestinations] = useState<DestinationListItem[]>(
    [],
  );
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pendingDestinationId, setPendingDestinationId] = useState<
    number | null
  >(null);

  const currentUserEmailSubscription = useMemo(
    () =>
      subscriptions.find(
        (subscription) =>
          !subscription.destination && subscription.user.id === session.user.id,
      ) ?? null,
    [session.user.id, subscriptions],
  );
  const otherSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (subscription) => subscription.id !== currentUserEmailSubscription?.id,
      ),
    [currentUserEmailSubscription?.id, subscriptions],
  );
  const subscribedDestinationIds = useMemo(
    () =>
      new Set(
        otherSubscriptions
          .map((subscription) => subscription.destination?.id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    [otherSubscriptions],
  );
  const filteredDestinations = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return allDestinations;
    }

    return allDestinations.filter((item) => {
      const name = item.name.toLowerCase();
      const type = item.type.toLowerCase();

      return name.includes(keyword) || type.includes(keyword);
    });
  }, [allDestinations, searchText]);

  useEffect(() => {
    if (!isChooserOpen || allDestinations.length > 0) {
      return;
    }

    let isMounted = true;
    setIsLoadingDestinations(true);

    void getDestinationsClient()
      .then((items) => {
        if (isMounted) {
          setAllDestinations(items);
        }
      })
      .catch((error) => {
        if (isMounted) {
          onError(
            error instanceof Error
              ? error.message
              : 'Failed to load alert destinations.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingDestinations(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [allDestinations.length, isChooserOpen, onError]);

  async function handleUserEmailToggle() {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      if (currentUserEmailSubscription) {
        await deleteAlertSubscription(alertId, currentUserEmailSubscription.id);
        onSubscriptionsChange((current) =>
          current.filter(
            (subscription) => subscription.id !== currentUserEmailSubscription.id,
          ),
        );
      } else {
        const nextSubscription = await createAlertSubscription(alertId, {});
        onSubscriptionsChange((current) => [...current, nextSubscription]);
      }
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Failed updating alert subscription.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAddDestination(destination: DestinationListItem) {
    if (pendingDestinationId || subscribedDestinationIds.has(destination.id)) {
      return;
    }

    setPendingDestinationId(destination.id);

    try {
      const nextSubscription = await createAlertSubscription(alertId, {
        destination_id: destination.id,
      });
      onSubscriptionsChange((current) => [...current, nextSubscription]);
      setIsChooserOpen(false);
      setSearchText('');
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Failed saving alert subscription.',
      );
    } finally {
      setPendingDestinationId(null);
    }
  }

  async function handleRemoveSubscription(subscriptionId: number) {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      await deleteAlertSubscription(alertId, subscriptionId);
      onSubscriptionsChange((current) =>
        current.filter((subscription) => subscription.id !== subscriptionId),
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Failed unsubscribing.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <div className="rounded-[2px] border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[19px] font-medium text-slate-800">
            <span>Destinations</span>
            <Link
              className="inline-flex items-center text-[#2b7dbc] transition hover:text-sky-700"
              href="/destinations"
              title="Open Alert Destinations"
            >
              <ExternalLinkIcon />
            </Link>
          </div>
          <button
            className="inline-flex h-8 items-center rounded-[2px] border border-[#2196F3] bg-[#2196F3] px-3 text-[12px] font-medium text-white transition hover:bg-sky-600"
            onClick={() => setIsChooserOpen(true)}
            type="button"
          >
            + Add
          </button>
        </div>

        <div className="space-y-2.5">
          <DestinationRow
            destinationName={session.user.email}
            destinationType="email"
            rightContent={
              session.client_config.mailSettingsMissing ? (
                <span className="text-[11px] text-amber-600">Mail disabled</span>
              ) : (
                <ToggleSwitch
                  checked={Boolean(currentUserEmailSubscription)}
                  disabled={isUpdating}
                  onClick={() => void handleUserEmailToggle()}
                />
              )
            }
          />

          {otherSubscriptions.map((subscription) => {
            const canRemove =
              session.user.roles.includes('admin') ||
              session.user.id === subscription.user.id;

            return (
              <DestinationRow
                key={subscription.id}
                action={
                  canRemove ? (
                    <button
                      className="inline-flex h-7 items-center rounded-[2px] px-2 text-[12px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      disabled={isUpdating}
                      onClick={() =>
                        void handleRemoveSubscription(subscription.id)
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  ) : undefined
                }
                destinationName={
                  subscription.destination?.name ?? subscription.user.email
                }
                destinationType={subscription.destination?.type ?? 'email'}
              />
            );
          })}
        </div>
      </div>

      {isChooserOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
          onClick={() => setIsChooserOpen(false)}
          role="dialog"
        >
          <div
            className="flex max-h-[88vh] w-full max-w-[580px] flex-col overflow-hidden rounded-[3px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h4 className="text-[20px] font-medium text-slate-800">
                Add Existing Alert Destinations
              </h4>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <input
                className="h-10 w-full rounded-[2px] border border-slate-300 px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-300"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search destinations..."
                value={searchText}
              />

              <div className="mt-4 space-y-2">
                {isLoadingDestinations ? (
                  <div className="rounded-[2px] border border-slate-200 px-4 py-8 text-center text-[14px] text-slate-500">
                    Loading destinations...
                  </div>
                ) : filteredDestinations.length === 0 ? (
                  <div className="rounded-[2px] border border-slate-200 px-4 py-8 text-center text-[14px] text-slate-500">
                    No destinations found.
                  </div>
                ) : (
                  filteredDestinations.map((destination) => {
                    const isSubscribed = subscribedDestinationIds.has(
                      destination.id,
                    );

                    return (
                      <div
                        key={destination.id}
                        className="flex items-center gap-3 rounded-[2px] border border-slate-200 px-3 py-2.5"
                      >
                        <img
                          alt={destination.type}
                          className="h-9 w-9 shrink-0 object-contain"
                          onError={(event) => {
                            event.currentTarget.src =
                              '/static/images/redash_icon_small.png';
                          }}
                          src={getDestinationLogoPath(destination.type)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-slate-700">
                            {destination.name}
                          </div>
                          <div className="text-[11px] uppercase tracking-[0.04em] text-slate-400">
                            {destination.type}
                          </div>
                        </div>
                        <button
                          className={[
                            'inline-flex h-8 items-center rounded-[2px] px-3 text-[12px] font-medium transition',
                            isSubscribed
                              ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                              : 'border border-[#2196F3] bg-[#2196F3] text-white hover:bg-sky-600',
                          ].join(' ')}
                          disabled={isSubscribed || pendingDestinationId !== null}
                          onClick={() => void handleAddDestination(destination)}
                          type="button"
                        >
                          {pendingDestinationId === destination.id
                            ? 'Adding...'
                            : isSubscribed
                              ? 'Added'
                              : 'Add'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 text-[13px] text-slate-500">
                Create new destinations in{' '}
                <Link
                  className="text-[#2b7dbc] transition hover:text-sky-700"
                  href="/destinations"
                >
                  Alert Destinations
                </Link>
                .
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-4">
              <button
                className="inline-flex h-9 items-center rounded-[2px] border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsChooserOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
