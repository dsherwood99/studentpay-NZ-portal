'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PLAN_DETAIL_TABS,
  planDetailTabOnOpen,
} from '../../lib/plan-detail-tabs.js';

function display(value) {
  if (value == null || value === '') {
    return '—';
  }
  return value;
}

function DetailRow({ label, children }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export default function PlanDetailModal({
  plan,
  onClose,
  formatCurrency,
  formatDate,
  statusClass,
}) {
  const [tab, setTab] = useState(planDetailTabOnOpen);
  const [directDebit, setDirectDebit] = useState({ status: 'idle' });
  const [transactions, setTransactions] = useState({ status: 'idle' });
  const [directDebitAttempt, setDirectDebitAttempt] = useState(0);
  const [transactionAttempt, setTransactionAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const directDebitCache = useRef(null);
  const transactionCache = useRef(null);

  useEffect(() => {
    if (tab !== 'direct-debit') {
      return undefined;
    }
    if (directDebitCache.current) {
      setDirectDebit(directDebitCache.current);
      return undefined;
    }

    const controller = new AbortController();
    setDirectDebit({ status: 'loading' });

    fetch(`/api/plans/${encodeURIComponent(plan.plan)}/direct-debit`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) {
          throw new Error('direct-debit');
        }
        const next = { status: 'ready', payload };
        directDebitCache.current = next;
        setDirectDebit(next);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }
        setDirectDebit({ status: 'error' });
      });

    return () => controller.abort();
  }, [tab, plan.plan, directDebitAttempt]);

  useEffect(() => {
    if (tab !== 'transactions') {
      return undefined;
    }
    if (transactionCache.current) {
      setTransactions(transactionCache.current);
      return undefined;
    }

    const controller = new AbortController();
    setTransactions({ status: 'loading' });

    fetch(`/api/plans/${encodeURIComponent(plan.plan)}/transactions?days=60`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) {
          throw new Error('transactions');
        }
        const next = { status: 'ready', payload };
        transactionCache.current = next;
        setTransactions(next);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }
        setTransactions({ status: 'error' });
      });

    return () => controller.abort();
  }, [tab, plan.plan, transactionAttempt]);

  async function copyAuthorisationUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const authorisation = directDebit.payload?.directDebit || null;

  return (
    <div
      className="detail-overlay"
      role="presentation"
      onMouseDown={onClose}
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
            <h2 id="plan-detail-title">{plan.plan}</h2>
            <p>{plan.student}</p>
          </div>
          <button
            type="button"
            className="detail-close"
            onClick={onClose}
            aria-label="Close plan details"
          >
            ×
          </button>
        </div>

        <div className="detail-tabs" role="tablist" aria-label="Payment plan details">
          {PLAN_DETAIL_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`plan-detail-tab-${item.id}`}
              className="detail-tab"
              aria-selected={tab === item.id}
              aria-controls={`plan-detail-panel-${item.id}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="detail-modal-body">
          {tab === 'summary' && (
            <div
              role="tabpanel"
              id="plan-detail-panel-summary"
              aria-labelledby="plan-detail-tab-summary"
            >
              <div className="detail-banner">
                <div>
                  <span>Account balance</span>
                  <strong>{formatCurrency(plan.remaining)}</strong>
                </div>
                <div className="detail-banner-status">
                  <span className={`status-badge ${statusClass}`}>{plan.status}</span>
                  <small>
                    {Number(plan.daysInArrears || 0) > 0
                      ? `${plan.daysInArrears} days overdue`
                      : 'No overdue days'}
                  </small>
                </div>
              </div>

              <div className="detail-grid">
                <article className="detail-section">
                  <h3>Plan Summary</h3>
                  <DetailRow label="Student">{plan.student || '—'}</DetailRow>
                  <DetailRow label="Course">{plan.course || '—'}</DetailRow>
                  <DetailRow label="Agreement Date">
                    {formatDate(plan.agreementDate)}
                  </DetailRow>
                  <DetailRow label="Stage">{plan.stage || '—'}</DetailRow>
                  <DetailRow label="Authorisation">
                    {plan.authorisationStatus || '—'}
                  </DetailRow>
                </article>

                <article className="detail-section financial-section">
                  <h3>Financial Summary</h3>
                  <DetailRow label="Total Plan Amount">
                    {formatCurrency(plan.amount)}
                  </DetailRow>
                  <DetailRow label="Collected to Date">
                    <span className="positive-value">
                      {formatCurrency(plan.collected)}
                    </span>
                  </DetailRow>
                  <DetailRow label="Remaining Balance">
                    {formatCurrency(plan.remaining)}
                  </DetailRow>
                  <DetailRow label="Overdue Balance">
                    <span className="overdue-value">{formatCurrency(plan.overdue)}</span>
                  </DetailRow>
                </article>

                <article className="detail-section">
                  <h3>Payment Schedule</h3>
                  <DetailRow label="Payment Frequency">
                    {plan.frequency || '—'}
                  </DetailRow>
                  <DetailRow label="Instalment Amount">
                    {formatCurrency(plan.paymentAmount)}
                  </DetailRow>
                </article>

                <article className="detail-section collections-section">
                  <h3>Collections Summary</h3>
                  <DetailRow label="Arrears Category">{plan.status || '—'}</DetailRow>
                  <DetailRow label="Oldest Overdue">
                    {Number(plan.daysInArrears || 0)} days
                  </DetailRow>
                </article>
              </div>
            </div>
          )}

          {tab === 'direct-debit' && (
            <div
              role="tabpanel"
              id="plan-detail-panel-direct-debit"
              aria-labelledby="plan-detail-tab-direct-debit"
              className="detail-panel"
            >
              {directDebit.status === 'loading' && (
                <p className="detail-status">Loading Direct Debit details…</p>
              )}
              {directDebit.status === 'error' && (
                <div className="detail-status">
                  <p>Direct Debit details could not be loaded.</p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      directDebitCache.current = null;
                      setDirectDebitAttempt((attempt) => attempt + 1);
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {directDebit.status === 'ready' && !authorisation && (
                <p className="detail-status">
                  No Direct Debit Authorisation has been created for this Payment Plan.
                </p>
              )}
              {directDebit.status === 'ready' && authorisation && (
                <>
                  <article className="detail-section detail-section-single">
                    <h3>Direct Debit Authorisation</h3>
                    <DetailRow label="Status">{display(authorisation.status)}</DetailRow>
                    <DetailRow label="Authorised At">
                      {display(authorisation.authorisedAt)}
                    </DetailRow>
                    <DetailRow label="Cancelled At">
                      {display(authorisation.cancelledAt)}
                    </DetailRow>
                    <DetailRow label="Failed At">{display(authorisation.failedAt)}</DetailRow>
                    <DetailRow label="Failure Reason">
                      {display(authorisation.failureReason)}
                    </DetailRow>
                  </article>

                  <article className="detail-section detail-section-single">
                    <h3>Authorisation Redirect URL</h3>
                    {authorisation.authorisationUrl ? (
                      <>
                        <a
                          className="detail-url"
                          href={authorisation.authorisationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {authorisation.authorisationUrl}
                        </a>
                        <div className="detail-url-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              copyAuthorisationUrl(authorisation.authorisationUrl)
                            }
                          >
                            {copied ? 'Copied' : 'Copy link'}
                          </button>
                          <a
                            className="secondary-button detail-url-open"
                            href={authorisation.authorisationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open authorisation link
                          </a>
                        </div>
                      </>
                    ) : (
                      <p className="detail-note">
                        The Direct Debit setup link is not currently available.
                      </p>
                    )}
                  </article>
                </>
              )}
            </div>
          )}

          {tab === 'transactions' && (
            <div
              role="tabpanel"
              id="plan-detail-panel-transactions"
              aria-labelledby="plan-detail-tab-transactions"
              className="detail-panel"
            >
              <div className="detail-panel-heading">
                <h3>Recent transactions</h3>
                <p>Last 60 days</p>
              </div>
              {transactions.status === 'loading' && (
                <p className="detail-status">Loading recent transactions…</p>
              )}
              {transactions.status === 'error' && (
                <div className="detail-status">
                  <p>Recent transactions could not be loaded.</p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      transactionCache.current = null;
                      setTransactionAttempt((attempt) => attempt + 1);
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {transactions.status === 'ready' &&
                (transactions.payload.transactions || []).length === 0 && (
                  <p className="detail-status">No transactions in the last 60 days.</p>
                )}
              {transactions.status === 'ready' &&
                (transactions.payload.transactions || []).length > 0 && (
                  <div className="detail-transaction-scroll">
                    <div className="txn-table" role="table">
                      <div className="txn-row txn-head" role="row">
                        <span role="columnheader">Date</span>
                        <span role="columnheader">Transaction</span>
                        <span role="columnheader">Amount</span>
                        <span role="columnheader">Balance</span>
                      </div>
                      {transactions.payload.transactions.map((entry, index) => (
                        <div className="txn-row" role="row" key={`${entry.date}-${entry.label}-${index}`}>
                          <span role="cell" data-label="Date">
                            {entry.date}
                          </span>
                          <span role="cell" data-label="Transaction">
                            <strong>{entry.label}</strong>
                            {entry.detail ? <small>{entry.detail}</small> : null}
                          </span>
                          <span role="cell" data-label="Amount">
                            {formatCurrency(entry.amount)}
                          </span>
                          <span role="cell" data-label="Balance">
                            {formatCurrency(entry.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="detail-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
