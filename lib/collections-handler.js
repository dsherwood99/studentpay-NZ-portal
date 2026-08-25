import { getReportingWindow } from './auckland-calendar.js';
import {
  buildCollectionsPayload,
  buildEmptyCollectionsPayload,
} from './collections-series.js';
import { queryPostedPaymentReceivedByDay } from './collections-query.js';
import { assertAggregateOnly } from './collections-safety.js';
import {
  hasForbiddenTenancyQuery,
  resolveProviderScope,
} from './provider-scope.js';

function json(body, status) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function handleCollectionsRequest({
  user,
  requestUrl,
  now = new Date(),
  queryDailyTotals = queryPostedPaymentReceivedByDay,
}) {
  const url = new URL(requestUrl, 'http://localhost');

  if (hasForbiddenTenancyQuery(url.searchParams)) {
    return json(
      {
        success: false,
        error: 'Provider cannot be specified in the request.',
      },
      400
    );
  }

  const scope = resolveProviderScope(user);

  if (!scope.ok) {
    return json(
      {
        success: false,
        error: scope.message,
      },
      scope.status
    );
  }

  const window = getReportingWindow(now);

  if (scope.empty) {
    return json(
      {
        success: true,
        ...buildEmptyCollectionsPayload(window),
      },
      200
    );
  }

  const currentRowsPromise =
    window.currentThroughDay > 0 && window.currentEnd
      ? queryDailyTotals({
          startDate: window.currentStart,
          endDate: window.currentEnd,
          educationProviderPredicate: scope.educationProviderPredicate,
        })
      : Promise.resolve([]);

  const [currentRows, previousRows] = await Promise.all([
    currentRowsPromise,
    queryDailyTotals({
      startDate: window.previousStart,
      endDate: window.previousEnd,
      educationProviderPredicate: scope.educationProviderPredicate,
    }),
  ]);

  const payload = assertAggregateOnly(
    buildCollectionsPayload({
      window,
      currentRows,
      previousRows,
    })
  );

  return json(
    {
      success: true,
      ...payload,
    },
    200
  );
}
