import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationService } from '../../services/api';

const DEFAULT_LIMIT = 20;
const NOTIFICATION_TYPES = {
    reminder: 'mission_reminder',
    terminal: 'mission_terminal',
};

const toTimestamp = (value) => {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
};

const sortNotifications = (items = []) => [...items].sort((left, right) => {
    const timeDiff = toTimestamp(right?.created_at) - toTimestamp(left?.created_at);

    if (timeDiff !== 0) {
        return timeDiff;
    }

    return Number(right?.id || 0) - Number(left?.id || 0);
});

const mergeNotifications = (currentItems = [], incomingItems = [], { prepend = false } = {}) => {
    const mergedById = new Map();
    const orderedItems = prepend
        ? [...incomingItems, ...currentItems]
        : [...currentItems, ...incomingItems];

    orderedItems.forEach((item) => {
        const itemId = Number(item?.id);

        if (!Number.isFinite(itemId)) {
            return;
        }

        mergedById.set(itemId, item);
    });

    return sortNotifications([...mergedById.values()]);
};

const normalizeUnreadCount = (response) => {
    const unreadCount = Number(response?.unread_count);
    return Number.isFinite(unreadCount) && unreadCount >= 0 ? unreadCount : 0;
};

const buildEmptyUnreadCountByType = () => ({
    [NOTIFICATION_TYPES.reminder]: 0,
    [NOTIFICATION_TYPES.terminal]: 0,
});

export default function useNotifications({
    enabled = true,
    realtimeNotification = null,
    pageLimit = DEFAULT_LIMIT,
    uavId,
} = {}) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadCountByType, setUnreadCountByType] = useState(buildEmptyUnreadCountByType);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [isReady, setIsReady] = useState(false);

    const notificationsRef = useRef([]);
    const notificationIdsRef = useRef(new Set());
    const currentPageRef = useRef(0);
    const hasNextRef = useRef(false);
    const isLoadingMoreRef = useRef(false);
    const handledRealtimeRef = useRef(null);
    const pendingReadIdsRef = useRef(new Set());
    const isMountedRef = useRef(true);

    useEffect(() => {
        notificationsRef.current = notifications;
        notificationIdsRef.current = new Set(
            notifications
                .map((item) => Number(item?.id))
                .filter((id) => Number.isFinite(id) && id > 0)
        );
    }, [notifications]);

    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    useEffect(() => {
        hasNextRef.current = hasNext;
    }, [hasNext]);

    useEffect(() => {
        isLoadingMoreRef.current = isLoadingMore;
    }, [isLoadingMore]);

    const syncUnreadCounts = useCallback(async () => {
        if (!enabled) {
            if (isMountedRef.current) {
                setUnreadCount(0);
                setUnreadCountByType(buildEmptyUnreadCountByType());
            }
            return;
        }

        try {
            const [unreadResponse, reminderUnreadResponse, terminalUnreadResponse] = await Promise.all([
                notificationService.getUnreadCount({ uavId }),
                notificationService.getUnreadCount({ uavId, type: NOTIFICATION_TYPES.reminder }),
                notificationService.getUnreadCount({ uavId, type: NOTIFICATION_TYPES.terminal }),
            ]);

            if (!isMountedRef.current) {
                return;
            }

            setUnreadCount(normalizeUnreadCount(unreadResponse));
            setUnreadCountByType({
                [NOTIFICATION_TYPES.reminder]: normalizeUnreadCount(reminderUnreadResponse),
                [NOTIFICATION_TYPES.terminal]: normalizeUnreadCount(terminalUnreadResponse),
            });
        } catch {
            // Keep the last known local counts if badge re-sync fails.
        }
    }, [enabled, uavId]);

    const resetState = useCallback(() => {
        handledRealtimeRef.current = null;
        pendingReadIdsRef.current = new Set();
        notificationIdsRef.current = new Set();
        setNotifications([]);
        setUnreadCount(0);
        setUnreadCountByType(buildEmptyUnreadCountByType());
        setCurrentPage(0);
        setHasNext(false);
        setIsInitialLoading(false);
        setIsLoadingMore(false);
        setError(null);
        setIsReady(false);
    }, []);

    const loadInitial = useCallback(async () => {
        if (!enabled) {
            resetState();
            return;
        }

        setIsInitialLoading(true);
        setError(null);

        try {
            const [countsResponse, listResponse] = await Promise.all([
                Promise.all([
                    notificationService.getUnreadCount({ uavId }),
                    notificationService.getUnreadCount({ uavId, type: NOTIFICATION_TYPES.reminder }),
                    notificationService.getUnreadCount({ uavId, type: NOTIFICATION_TYPES.terminal }),
                ]),
                notificationService.getNotifications({ page: 1, limit: pageLimit, uavId }),
            ]);

            if (!isMountedRef.current) {
                return;
            }

            const [unreadResponse, reminderUnreadResponse, terminalUnreadResponse] = countsResponse;
            const items = Array.isArray(listResponse?.items) ? sortNotifications(listResponse.items) : [];
            notificationIdsRef.current = new Set(
                items
                    .map((item) => Number(item?.id))
                    .filter((id) => Number.isFinite(id) && id > 0)
            );

            setNotifications(items);
            setUnreadCount(normalizeUnreadCount(unreadResponse));
            setUnreadCountByType({
                [NOTIFICATION_TYPES.reminder]: normalizeUnreadCount(reminderUnreadResponse),
                [NOTIFICATION_TYPES.terminal]: normalizeUnreadCount(terminalUnreadResponse),
            });
            setCurrentPage(Number(listResponse?.page) || 1);
            setHasNext(Boolean(listResponse?.has_next));
            setIsReady(true);
        } catch (loadError) {
            if (!isMountedRef.current) {
                return;
            }

            setError(loadError?.message || 'Unable to load notifications right now.');
        } finally {
            if (isMountedRef.current) {
                setIsInitialLoading(false);
            }
        }
    }, [enabled, pageLimit, resetState, uavId]);

    const loadMore = useCallback(async () => {
        if (!enabled || !isReady || isLoadingMoreRef.current || !hasNextRef.current) {
            return;
        }

        const nextPage = currentPageRef.current + 1;

        setIsLoadingMore(true);
        setError(null);

        try {
            const response = await notificationService.getNotifications({
                page: nextPage,
                limit: pageLimit,
                uavId,
            });

            if (!isMountedRef.current) {
                return;
            }

            const items = Array.isArray(response?.items) ? response.items : [];
            items.forEach((item) => {
                const itemId = Number(item?.id);

                if (Number.isFinite(itemId) && itemId > 0) {
                    notificationIdsRef.current.add(itemId);
                }
            });

            setNotifications((previous) => mergeNotifications(previous, items));
            setCurrentPage(Number(response?.page) || nextPage);
            setHasNext(Boolean(response?.has_next));
        } catch (loadError) {
            if (!isMountedRef.current) {
                return;
            }

            setError(loadError?.message || 'Unable to load more notifications right now.');
        } finally {
            if (isMountedRef.current) {
                setIsLoadingMore(false);
            }
        }
    }, [enabled, isReady, pageLimit, uavId]);

    const markAsRead = useCallback(async (ids = []) => {
        if (!enabled) {
            return;
        }

        const requestedIds = [...new Set(
            ids
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0)
        )];

        const unreadIds = requestedIds.filter((id) => {
            if (pendingReadIdsRef.current.has(id)) {
                return false;
            }

            return notificationsRef.current.some((item) => Number(item?.id) === id && item?.is_read === false);
        });

        if (unreadIds.length === 0) {
            return;
        }

        unreadIds.forEach((id) => pendingReadIdsRef.current.add(id));

        try {
            await notificationService.markAsRead(unreadIds);

            if (!isMountedRef.current) {
                return;
            }

            const changedIds = new Set(unreadIds);
            const readAt = new Date().toISOString();

            setNotifications((previous) => previous.map((item) => {
                const itemId = Number(item?.id);

                if (!changedIds.has(itemId) || item?.is_read) {
                    return item;
                }

                return {
                    ...item,
                    is_read: true,
                    read_at: item.read_at || readAt,
                };
            }));
            setUnreadCount((previous) => Math.max(0, previous - unreadIds.length));
            setUnreadCountByType((previous) => {
                const next = { ...previous };

                notificationsRef.current.forEach((item) => {
                    const itemId = Number(item?.id);
                    const type = item?.type;

                    if (!changedIds.has(itemId) || item?.is_read !== false || next[type] == null) {
                        return;
                    }

                    next[type] = Math.max(0, next[type] - 1);
                });

                return next;
            });
            void syncUnreadCounts();
        } finally {
            unreadIds.forEach((id) => pendingReadIdsRef.current.delete(id));
        }
    }, [enabled, syncUnreadCounts]);

    const deleteNotification = useCallback(async (notificationId) => {
        if (!enabled) {
            return;
        }

        const normalizedId = Number(notificationId);
        if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
            return;
        }

        const target = notificationsRef.current.find((item) => Number(item?.id) === normalizedId);

        await notificationService.deleteNotification(normalizedId);

        if (!isMountedRef.current) {
            return;
        }

        setNotifications((previous) => previous.filter((item) => Number(item?.id) !== normalizedId));
        notificationIdsRef.current.delete(normalizedId);

        if (target?.is_read === false) {
            setUnreadCount((previous) => Math.max(0, previous - 1));
            setUnreadCountByType((previous) => {
                const type = target?.type;

                if (!type || previous[type] == null) {
                    return previous;
                }

                return {
                    ...previous,
                    [type]: Math.max(0, previous[type] - 1),
                };
            });
            void syncUnreadCounts();
        }
    }, [enabled, syncUnreadCounts]);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!enabled) {
            resetState();
            return;
        }

        void loadInitial();
    }, [enabled, loadInitial, resetState]);

    useEffect(() => {
        const notificationId = Number(realtimeNotification?.id);

        if (!enabled || !Number.isFinite(notificationId) || notificationId <= 0) {
            return;
        }

        const realtimeKey = `${notificationId}:${String(realtimeNotification?.created_at || '')}:${String(realtimeNotification?.is_read)}`;

        if (handledRealtimeRef.current === realtimeKey) {
            return;
        }

        handledRealtimeRef.current = realtimeKey;

        const notificationAlreadyKnown = notificationIdsRef.current.has(notificationId);
        notificationIdsRef.current.add(notificationId);

        setNotifications((previous) => mergeNotifications(previous, [realtimeNotification], { prepend: true }));

        if (!notificationAlreadyKnown && realtimeNotification?.is_read === false) {
            setUnreadCount((previous) => previous + 1);
            setUnreadCountByType((previous) => {
                const type = realtimeNotification?.type;

                if (!type || previous[type] == null) {
                    return previous;
                }

                return {
                    ...previous,
                    [type]: previous[type] + 1,
                };
            });
        }
    }, [enabled, realtimeNotification]);

    return {
        notifications,
        unreadCount,
        unreadCountByType,
        currentPage,
        hasNext,
        isInitialLoading,
        isLoadingMore,
        error,
        isReady,
        loadInitial,
        loadMore,
        markAsRead,
        deleteNotification,
    };
}
