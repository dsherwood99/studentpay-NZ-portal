'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import CollectionsChart from './CollectionsChart';
import PlanDetailModal from './PlanDetailModal';
import { buildPortfolioCsv } from '../../lib/portfolio-export.js';
import { buildPortfolioSummary } from '../../lib/portfolio-summary.js';
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
  enrolmentEnabled = false,
  onNewEnrolment = null,
  enrolmentView = null,
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const summary = useMemo(() => buildPortfolioSummary(plans), [plans]);

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

    if (value.includes('action')) {
      return 'authorisation-action';
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

    const csvContent = buildPortfolioCsv(recordsToExport);

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

      {enrolmentView || (
      <>
      <section className="preview-hero">
        <div>
          <span className="preview-eyebrow">StudentPay Provider Portal</span>
          <h1>Welcome {firstName}</h1>
          {providerName ? (
            <p className="preview-provider">{providerName}</p>
          ) : null}
        </div>
        {enrolmentEnabled && onNewEnrolment ? (
          <button type="button" className="primary-button" onClick={onNewEnrolment}>
            New enrolment
          </button>
        ) : null}
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
        <PlanDetailModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          statusClass={getStatusClass(selectedPlan.status)}
        />
      )}
      </>
      )}
    </main>
  );
}
