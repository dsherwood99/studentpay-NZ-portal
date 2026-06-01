'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import './styles.css';



export default function Home() {

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      const response = await fetch('/api/plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.plans);
        setSelectedPlan(data.plans[0] || null);
      }

      setLoading(false);
    }

    loadPlans();
  }, []);

  const summary = useMemo(() => {
    const activePlans = plans.length;
    const totalAmount = plans.reduce((sum, plan) => sum + Number(plan.amount || 0), 0);
    const totalRemaining = plans.reduce((sum, plan) => sum + Number(plan.remaining || 0), 0);
    const totalOverdue = plans.reduce((sum, plan) => sum + Number(plan.overdue || 0), 0);
    const plansInArrears = plans.filter((plan) => Number(plan.overdue || 0) > 0).length;

    return {
      activePlans,
      totalAmount,
      totalRemaining,
      totalOverdue,
      plansInArrears,
    };
  }, [plans]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2,
    }).format(Number(value || 0));

  return (
    <main className="portal">

      {loading && <div className="loading-box">Loading Salesforce plans...</div>}
{!loading && plans.length === 0 && <div className="loading-box">No plans found.</div>}
    
<header className="topbar">
  <div className="brand-logo">
    <img src="/studentpay-logo.png" alt="StudentPay" style={{ height: '70px' }} />
    <span className="brand-divider"></span>
    <span className="logo-region">New Zealand</span>
  </div>

  <nav className="nav">
    <a className="active">Dashboard</a>
    <a>Payment Plans</a>
    <a>Reports</a>
    <a>Support</a>
  </nav>

  <div className="provider">
  <UserButton afterSignOutUrl="/" />
</div>
</header>
      

      <section className="hero">
        <div>
          <h1>Provider Dashboard</h1>
          <p>View current payment plan performance, arrears and portfolio balances.</p>
        </div>
        <button>Export CSV</button>
      </section>

      <section className="summary-grid">
        <div className="summary-card">
          <span>Active Plans</span>
          <strong className="green">{summary.activePlans}</strong>
        </div>
        <div className="summary-card">
          <span>Total Plan Amount</span>
          <strong>{formatCurrency(summary.totalAmount)}</strong>
        </div>
        <div className="summary-card">
          <span>Current Balance</span>
          <strong>{formatCurrency(summary.totalRemaining)}</strong>
        </div>
        <div className="summary-card">
          <span>Overdue Balance</span>
          <strong className="red">{formatCurrency(summary.totalOverdue)}</strong>
        </div>
        <div className="summary-card">
          <span>Plans in Arrears</span>
          <strong className="orange">{summary.plansInArrears}</strong>
        </div>
      </section>

      <section className="arrears-grid">
        <div><span>Current</span><strong>22</strong></div>
        <div><span>0 - 15 Days</span><strong>2</strong></div>
        <div><span>16 - 30 Days</span><strong>2</strong></div>
        <div><span>31 - 60 Days</span><strong>1</strong></div>
        <div><span>61+ Days</span><strong>1</strong></div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Payment Plans</h2>
            <p>Search, review and export current provider payment plans.</p>
          </div>
          <input placeholder="Search by student, plan number or status" />
        </div>

        <div className="table-wrap">
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
                <th>Remaining Balance</th>
                <th>Overdue</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.plan}>
                  <td>{plan.plan}</td>
                  <td className="student-name">{plan.student}</td>
                  <td>{plan.stage}</td>
                  <td>{plan.authorisationStatus}</td>
                  <td>{plan.agreementDate}</td>
                  <td>
                    <span className={`badge ${plan.status.toLowerCase().replaceAll(' ', '-')}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td>{formatCurrency(plan.amount)}</td>
                  <td>{formatCurrency(plan.remaining)}</td>
                  <td>{formatCurrency(plan.overdue)}</td>
                  <td><button className="view-button" onClick={() => setSelectedPlan(plan)}>
    Details
  </button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPlan && (
      <section className="detail-main">
        <div className="detail-heading">
          <h2>{selectedPlan.plan}</h2>
          <span className="status-pill">{selectedPlan.status}</span>
        </div>

        <div className="tabs">
          <span className="active">Overview</span>
          <span>Recent Payments</span>
          <span>Recent Cases</span>
        </div>

        <div className="detail-card">
  <div className="detail-section">
    <h3>Plan Summary</h3>
    <div className="detail-row"><span>Student</span><strong>{selectedPlan.student}</strong></div>
    <div className="detail-row"><span>Course</span><strong>{selectedPlan.course}</strong></div>
    <div className="detail-row"><span>Agreement Date</span><strong>{selectedPlan.agreementDate}</strong></div>
    <div className="detail-row"><span>Stage</span><strong>{selectedPlan.stage}</strong></div>
    <div className="detail-row"><span>Authorisation Status</span><strong>{selectedPlan.authorisationStatus}</strong></div>
  </div>

  <div className="detail-section">
    <h3>Financial Summary</h3>
    <div className="detail-row"><span>Total Plan Amount</span><strong>{formatCurrency(selectedPlan.amount)}</strong></div>
    <div className="detail-row"><span>Remaining Balance</span><strong>{formatCurrency(selectedPlan.remaining)}</strong></div>
    <div className="detail-row"><span>Overdue Balance</span><strong>{formatCurrency(selectedPlan.overdue)}</strong></div>
  </div>

  <div className="detail-section">
    <h3>Payment Schedule</h3>
    <div className="detail-row"><span>Payment Frequency</span><strong>{selectedPlan.frequency}</strong></div>
    <div className="detail-row"><span>Instalment Amount</span><strong>{formatCurrency(selectedPlan.paymentAmount)}</strong></div>
  </div>

  <div className="detail-section">
    <h3>Collections Summary</h3>
    <div className="detail-row"><span>Arrears Category</span><strong>{selectedPlan.status}</strong></div>
    <div className="detail-row"><span>Days in Arrears</span><strong>{selectedPlan.daysInArrears}</strong></div>
    
  </div>
</div>
      </section>
      )}
    </main>
  );
}