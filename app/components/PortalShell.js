'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import CollectionsChart from './CollectionsChart';
import '../preview/preview.css';

function SearchIcon() {
  return (
    <svg
      className="search-icon"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M13.2 13.2 16.5 16.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PortalShell({
  firstName = 'there',
  providerName = '',
  plans = [],
  loading = false,
  errorMessage = '',
  collections = null,
  collectionsLoading = false,
  collectionsError = '',
  demoBanner = false,
  accountSlot = null,
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const summary = useMemo(() => {
    const activePlans = plans.length;

    const totalAmount = plans.reduce(
      (sum, plan) => sum + Number(plan.amount || 0),
      0
    );

    const totalCollected = plans.reduce(
      (sum, plan) => sum + Number(plan.collected || 0),
      0
    );

    const totalRemaining = plans.reduce(
      (sum, plan) => sum + Number(plan.remaining || 0),
      0
    );

    const currentPlans = plans.filter(
      (plan) => plan.status === 'No Arrears'
    ).length;

    const arrears1To15 = plans.filter(
      (plan) => plan.status === '1 - 15 Days'
    ).length;

    const arrears16To30 = plans.filter(
      (plan) => plan.status === '16 - 30 Days'
    ).length;

    const arrears31To60 = plans.filter(
      (plan) => plan.status === '31 - 60 Days'
    ).length;

    const arrears61To90 = plans.filter(
      (plan) => plan.status === '61 - 90 Days'
    ).length;

    const arrears90Plus = plans.filter(
      (plan) => plan.status === '90+ Days'
    ).length;

    const arrears61Plus = arrears61To90 + arrears90Plus;

    return {
      activePlans,
      totalAmount,
      totalCollected,
      totalRemaining,
      currentPlans,
      arrears1To15,
      arrears16To30,
      arrears31To60,
      arrears61Plus,
    };
  }, [plans]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDate = (value) => {
    if (!value) {
      return '—';
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'No Arrears':
        return 'no-arrears';

      case '1 - 15 Days':
        return 'arrears-1-15';

      case '16 - 30 Days':
        return 'arrears-16-30';

      case '31 - 60 Days':
        return 'arrears-31-60';

      case '61+ Days':
      case '61 + Days':
      case '61 Days +':
      case '61 - 90 Days':
      case '90+ Days':
        return 'arrears-61-plus';

      default:
        return 'status-default';
    }
  };

  const getAuthorisationClass = (status) => {
    const value = String(status || '').toLowerCase();

    if (!value || value === '—') {
      return 'authorisation-neutral';
    }

    if (value.includes('cancel')) {
      return 'authorisation-cancelled';
    }

    if (value.includes('authoris') || value.includes('authoriz')) {
      return 'authorisation-complete';
    }

    if (value.includes('ready') || value.includes('send')) {
      return 'authorisation-ready';
    }

    return 'authorisation-progress';
  };

  const normalisedSearch = searchTerm.trim().toLowerCase();

  const filteredPlans = plans.filter((plan) => {
    if (!normalisedSearch) {
      return true;
    }

    return [
      plan.plan,
      plan.student,
      plan.course,
      plan.stage,
      plan.status,
      plan.authorisationStatus,
      plan.frequency,
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(normalisedSearch)
    );
  });

  const exportCSV = () => {
    const recordsToExport = filteredPlans;

    if (!recordsToExport || recordsToExport.length === 0) {
      window.alert('There are no records to export.');
      return;
    }

    const columns = [
      { heading: 'Plan Number', value: (plan) => plan.plan },
      { heading: 'Student', value: (plan) => plan.student },
      { heading: 'Stage', value: (plan) => plan.stage },
      {
        heading: 'Authorisation Status',
        value: (plan) => plan.authorisationStatus,
      },
      { heading: 'Agreement Date', value: (plan) => plan.agreementDate },
      { heading: 'Status', value: (plan) => plan.status },
      { heading: 'Plan Amount', value: (plan) => plan.amount },
      { heading: 'Collected to Date', value: (plan) => plan.collected },
      { heading: 'Remaining Balance', value: (plan) => plan.remaining },
      { heading: 'Overdue Balance', value: (plan) => plan.overdue },
      { heading: 'Days in Arrears', value: (plan) => plan.daysInArrears },
      { heading: 'Course', value: (plan) => plan.course },
      { heading: 'Payment Amount', value: (plan) => plan.paymentAmount },
      { heading: 'Payment Frequency', value: (plan) => plan.frequency },
    ];

    const escapeCSVValue = (value) => {
      const text = String(value ?? '');

      return `"${text.replaceAll('"', '""')}"`;
    };

    const headerRow = columns
      .map((column) => escapeCSVValue(column.heading))
      .join(',');

    const dataRows = recordsToExport.map((plan) =>
      columns
        .map((column) => escapeCSVValue(column.value(plan)))
        .join(',')
    );

    const csvContent = [headerRow, ...dataRows].join('\r\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    downloadLink.href = downloadUrl;
    downloadLink.download = `studentpay-portfolio-${date}.csv`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <main className="preview-portal">
      {demoBanner ? (
        <div className="preview-demo-banner" role="status">
          Brand preview · sample data only · not connected to Salesforce
        </div>
      ) : null}

      <header className="preview-topbar">
        <div className="preview-brand">
          <Image
            src="/brand/studentpay-nz-logo.jpg"
            alt="StudentPay NZ"
            width={58}
            height={44}
            className="preview-logo"
            priority
          />
          <span className="preview-brand-copy">
            <span className="preview-brand-kicker">StudentPay NZ</span>
            <span className="preview-brand-product">Provider Portal</span>
          </span>
        </div>

        <div className="preview-nav-spacer" />

        <div className="preview-user">
          {accountSlot || (
            <span className="preview-user-placeholder" aria-hidden="true">
              DS
            </span>
          )}
        </div>
      </header>

      <section className="preview-hero">
        <div>
          <span className="preview-eyebrow">StudentPay Provider Portal</span>
          <h1>Welcome {firstName}</h1>
          {providerName ? (
            <p className="preview-provider">{providerName}</p>
          ) : null}
        </div>
      </section>

      {loading && (
        <div className="preview-message">Loading Salesforce plans…</div>
      )}

      {!loading && errorMessage && (
        <div className="preview-message preview-error">{errorMessage}</div>
      )}

      {!loading && !errorMessage && plans.length === 0 && (
        <div className="preview-message">No plans found.</div>
      )}

      {!loading && !errorMessage && plans.length > 0 && (
        <>
          <section className="kpi-board" aria-label="Portfolio summary">
            <div className="kpi-group">
              <h2 className="kpi-heading">Core portfolio metrics</h2>
              <div className="summary-grid summary-grid-core">
                <article className="summary-card">
                  <span>Active Plans</span>
                  <strong className="lime-value">{summary.activePlans}</strong>
                </article>
                <article className="summary-card">
                  <span>Total Plan Amount</span>
                  <strong>{formatCurrency(summary.totalAmount)}</strong>
                </article>
                <article className="summary-card featured-card">
                  <span>Collected to Date</span>
                  <strong>{formatCurrency(summary.totalCollected)}</strong>
                </article>
                <article className="summary-card">
                  <span>Current Balance</span>
                  <strong>{formatCurrency(summary.totalRemaining)}</strong>
                </article>
                <button
                  type="button"
                  className="summary-card export-summary-card"
                  onClick={exportCSV}
                >
                  <span>Export Portfolio</span>
                  <span className="export-card-content">
                    <strong>CSV</strong>
                    <small>Download records</small>
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="preview-arrears-grid" aria-label="Arrears ageing">
            <article className="ageing-current">
              <span>Current</span>
              <strong>{summary.currentPlans}</strong>
            </article>
            <article className="ageing-early">
              <span>1–15 Days</span>
              <strong>{summary.arrears1To15}</strong>
            </article>
            <article className="ageing-mid">
              <span>16–30 Days</span>
              <strong>{summary.arrears16To30}</strong>
            </article>
            <article className="ageing-late">
              <span>31–60 Days</span>
              <strong>{summary.arrears31To60}</strong>
            </article>
            <article className="ageing-severe">
              <span>61+ Days</span>
              <strong>{summary.arrears61Plus}</strong>
            </article>
          </section>
        </>
      )}

      {(collectionsLoading || collectionsError || collections) && (
        <CollectionsChart
          collections={collections}
          loading={collectionsLoading}
          errorMessage={collectionsError}
        />
      )}

      {!loading && !errorMessage && plans.length > 0 && (
        <>
          <section className="preview-panel">
            <div className="preview-panel-header">
              <div>
                <span className="preview-eyebrow">Portfolio records</span>
                <h2>Payment Plans</h2>
                <p>Search and review current provider payment plans.</p>
              </div>

              <label className="search-field">
                <span className="sr-only">Search payment plans</span>
                <SearchIcon />
                <input
                  type="search"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
            </div>

            <div className="preview-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Plan #</th>
                    <th>Student</th>
                    <th>Stage</th>
                    <th>Authorisation</th>
                    <th>Agreement Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Remaining</th>
                    <th>Overdue</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id || plan.plan}>
                      <td className="plan-number">{plan.plan}</td>
                      <td className="student-name">{plan.student}</td>
                      <td>{plan.stage || '—'}</td>
                      <td>
                        <span
                          className={`authorisation-pill ${getAuthorisationClass(
                            plan.authorisationStatus
                          )}`}
                        >
                          {plan.authorisationStatus || '—'}
                        </span>
                      </td>
                      <td>{formatDate(plan.agreementDate)}</td>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            plan.status
                          )}`}
                        >
                          {plan.status || 'No Arrears'}
                        </span>
                      </td>
                      <td>{formatCurrency(plan.amount)}</td>
                      <td>{formatCurrency(plan.remaining)}</td>
                      <td
                        className={
                          Number(plan.overdue || 0) > 0 ? 'table-overdue' : ''
                        }
                      >
                        {formatCurrency(plan.overdue)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="details-button"
                          onClick={() => setSelectedPlan(plan)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPlans.length === 0 && (
                    <tr>
                      <td colSpan="10" className="no-results">
                        No payment plans match “{searchTerm}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="preview-table-footer">
              Showing {filteredPlans.length} of {plans.length} loaded plans
            </div>
          </section>
        </>
      )}

      {selectedPlan && (
        <div
          className="detail-overlay"
          role="presentation"
          onMouseDown={() => setSelectedPlan(null)}
        >
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="detail-modal-header">
              <div>
                <span className="preview-eyebrow">Payment plan</span>
                <h2 id="plan-detail-title">{selectedPlan.plan}</h2>
                <p>{selectedPlan.student}</p>
              </div>
              <button
                type="button"
                className="detail-close"
                onClick={() => setSelectedPlan(null)}
                aria-label="Close plan details"
              >
                ×
              </button>
            </div>

            <div className="detail-banner">
              <div>
                <span>Account balance</span>
                <strong>{formatCurrency(selectedPlan.remaining)}</strong>
              </div>
              <div className="detail-banner-status">
                <span
                  className={`status-badge ${getStatusClass(
                    selectedPlan.status
                  )}`}
                >
                  {selectedPlan.status}
                </span>
                <small>
                  {Number(selectedPlan.daysInArrears || 0) > 0
                    ? `${selectedPlan.daysInArrears} days overdue`
                    : 'No overdue days'}
                </small>
              </div>
            </div>

            <div className="detail-grid">
              <article className="detail-section">
                <h3>Plan Summary</h3>
                <div className="detail-row">
                  <span>Student</span>
                  <strong>{selectedPlan.student || '—'}</strong>
                </div>
                <div className="detail-row">
                  <span>Course</span>
                  <strong>{selectedPlan.course || '—'}</strong>
                </div>
                <div className="detail-row">
                  <span>Agreement Date</span>
                  <strong>{formatDate(selectedPlan.agreementDate)}</strong>
                </div>
                <div className="detail-row">
                  <span>Stage</span>
                  <strong>{selectedPlan.stage || '—'}</strong>
                </div>
                <div className="detail-row">
                  <span>Authorisation</span>
                  <strong>{selectedPlan.authorisationStatus || '—'}</strong>
                </div>
              </article>

              <article className="detail-section financial-section">
                <h3>Financial Summary</h3>
                <div className="detail-row">
                  <span>Total Plan Amount</span>
                  <strong>{formatCurrency(selectedPlan.amount)}</strong>
                </div>
                <div className="detail-row">
                  <span>Collected to Date</span>
                  <strong className="positive-value">
                    {formatCurrency(selectedPlan.collected)}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Remaining Balance</span>
                  <strong>{formatCurrency(selectedPlan.remaining)}</strong>
                </div>
                <div className="detail-row">
                  <span>Overdue Balance</span>
                  <strong className="overdue-value">
                    {formatCurrency(selectedPlan.overdue)}
                  </strong>
                </div>
              </article>

              <article className="detail-section">
                <h3>Payment Schedule</h3>
                <div className="detail-row">
                  <span>Payment Frequency</span>
                  <strong>{selectedPlan.frequency || '—'}</strong>
                </div>
                <div className="detail-row">
                  <span>Instalment Amount</span>
                  <strong>
                    {formatCurrency(selectedPlan.paymentAmount)}
                  </strong>
                </div>
              </article>

              <article className="detail-section collections-section">
                <h3>Collections Summary</h3>
                <div className="detail-row">
                  <span>Arrears Category</span>
                  <strong>{selectedPlan.status || '—'}</strong>
                </div>
                <div className="detail-row">
                  <span>Oldest Overdue</span>
                  <strong>
                    {Number(selectedPlan.daysInArrears || 0)} days
                  </strong>
                </div>
              </article>
            </div>

            <div className="detail-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedPlan(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
