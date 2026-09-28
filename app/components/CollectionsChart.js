'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  collectedThroughLabel,
  comparisonToneClass,
  settlementLagNote,
} from '../../lib/collections-copy.js';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatCompactAxis(value) {
  const numeric = Number(value || 0);

  if (numeric === 0) {
    return '$0';
  }

  if (Math.abs(numeric) >= 1000) {
    const thousands = numeric / 1000;
    const label = Number.isInteger(thousands)
      ? String(thousands)
      : thousands.toFixed(1).replace(/\.0$/, '');

    return `$${label}k`;
  }

  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatPercent(value) {
  return new Intl.NumberFormat('en-NZ', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
}

function monthNameFromLabel(label) {
  return String(label || '').replace(/\s+\d{4}$/, '');
}

function buildChartRows(collections) {
  const currentSeries = collections?.current_month?.series || [];
  const previousSeries = collections?.previous_month?.series || [];
  const lastDay = Math.max(
    currentSeries.at(-1)?.day || 0,
    previousSeries.at(-1)?.day || 0,
    1
  );
  const currentByDay = new Map(currentSeries.map((point) => [point.day, point]));
  const previousByDay = new Map(
    previousSeries.map((point) => [point.day, point])
  );
  const rows = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const current = currentByDay.get(day);
    const previous = previousByDay.get(day);

    rows.push({
      day,
      current: current ? current.cumulative : null,
      previous: previous ? previous.cumulative : null,
    });
  }

  return rows;
}

function CollectionsTooltip({
  active,
  payload,
  label,
  currentLabel,
  previousLabel,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const current = payload.find((entry) => entry.dataKey === 'current');
  const previous = payload.find((entry) => entry.dataKey === 'previous');

  return (
    <div className="collections-tooltip">
      <p className="collections-tooltip-day">
        {label} {monthNameFromLabel(currentLabel)}
      </p>
      {current?.value != null ? (
        <p>
          <span>This month · {monthNameFromLabel(currentLabel)}</span>
          <strong>{formatCurrency(current.value)} cumulative</strong>
        </p>
      ) : null}
      {previous?.value != null ? (
        <p>
          <span>
            Last month · {label} {monthNameFromLabel(previousLabel)}
          </span>
          <strong>{formatCurrency(previous.value)} cumulative</strong>
        </p>
      ) : null}
    </div>
  );
}

function comparisonCopy(collections) {
  if (!collections) {
    return '';
  }

  if (
    collections.comparison_percent === null ||
    collections.comparison_percent === undefined
  ) {
    return 'No collections in the same period last month';
  }

  if (collections.comparison_percent === 0) {
    return 'Flat vs same period last month';
  }

  const arrow = collections.comparison_percent > 0 ? '↑' : '↓';

  return `${arrow} ${formatPercent(collections.comparison_percent)}% vs same period last month`;
}

export default function CollectionsChart({
  collections = null,
  loading = false,
  errorMessage = '',
}) {
  const rows = buildChartRows(collections);
  const comparison = comparisonCopy(collections);
  const cutoffDate = collections?.reporting_cutoff_date;
  const isEmpty =
    !loading &&
    !errorMessage &&
    collections &&
    collections.current_month?.month_to_date === 0 &&
    collections.previous_month?.full_month_total === 0;

  return (
    <section className="collections-card" aria-label="Collections">
      <div className="collections-header">
        <div>
          <span className="preview-eyebrow">Collections</span>
          <p className="collections-mtd">
            {formatCurrency(collections?.current_month?.month_to_date || 0)}
          </p>
          <p className="collections-mtd-label">
            {cutoffDate ? collectedThroughLabel(cutoffDate) : ''}
          </p>
          {loading ? (
            <p className="collections-comparison-neutral">Loading collections…</p>
          ) : errorMessage ? (
            <p className="collections-comparison-down">{errorMessage}</p>
          ) : (
            <>
              <p className={comparisonToneClass()}>{comparison}</p>
              {cutoffDate ? (
                <p className="collections-note">{settlementLagNote(cutoffDate)}</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="collections-placeholder">Loading collections…</div>
      ) : errorMessage ? (
        <div className="collections-placeholder collections-placeholder-error">
          Collections are unavailable right now. Payment plans are unaffected.
        </div>
      ) : (
        <>
          {isEmpty ? (
            <p className="collections-empty">
              No collections recorded this month or last month.
            </p>
          ) : null}
          <div className="collections-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rows}
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="var(--brand-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tick={{ fill: 'var(--brand-muted)', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={formatCompactAxis}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fill: 'var(--brand-muted)', fontSize: 12 }}
                />
                <Tooltip
                  content={
                    <CollectionsTooltip
                      currentLabel={collections?.current_month?.label}
                      previousLabel={collections?.previous_month?.label}
                    />
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="plainline"
                  formatter={(value) => (
                    <span className="collections-legend-label">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="This month"
                  stroke="var(--brand-primary)"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="Last month"
                  stroke="var(--brand-muted)"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
