import './styles.css';

const plans = [
  {
    student: 'Sarah Thompson',
    plan: 'NZ-000128',
    status: 'Current',
    paid: '$1,200',
    remaining: '$2,400',
    overdue: '$0',
    nextPayment: '03 Jun 2026',
    lastPayment: '27 May 2026',
    badge: 'current'
  },
  {
    student: 'Emily Roberts',
    plan: 'NZ-000129',
    status: 'Overdue',
    paid: '$900',
    remaining: '$3,150',
    overdue: '$450',
    nextPayment: '31 May 2026',
    lastPayment: '10 May 2026',
    badge: 'overdue'
  },
  {
    student: 'Jessica Martin',
    plan: 'NZ-000130',
    status: 'Serious Arrears',
    paid: '$450',
    remaining: '$4,050',
    overdue: '$1,350',
    nextPayment: 'Overdue',
    lastPayment: '15 Apr 2026',
    badge: 'serious'
  }
];

export default function Home() {
  return (
    <main className="portal">
      <header className="topbar">
        <div>
          <div className="brand">StudentPay</div>
          <div className="tagline">Provider Portal</div>
        </div>
        <div className="provider-box">
          <span>Logged in as</span>
          <strong>Bela Beauty College</strong>
        </div>
      </header>

      <section className="hero">
        <div>
          <h1>Payment Plan Dashboard</h1>
          <p>View the current status of your active StudentPay payment plans.</p>
        </div>
        <button className="primary-button">Export CSV</button>
      </section>

      <section className="summary-grid" aria-label="Payment plan summary">
        <div className="card metric-card">
          <span>Active Plans</span>
          <strong className="green">28</strong>
        </div>
        <div className="card metric-card">
          <span>Total Remaining Balance</span>
          <strong>$84,250</strong>
        </div>
        <div className="card metric-card">
          <span>Paid To Date</span>
          <strong>$37,800</strong>
        </div>
        <div className="card metric-card alert-card">
          <span>Overdue Balance</span>
          <strong>$4,650</strong>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <h2>Payment Plans</h2>
            <p>Search, review and export current plan status.</p>
          </div>
          <input type="text" placeholder="Search by student, plan number or status" />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Plan No.</th>
                <th>Status</th>
                <th>Paid To Date</th>
                <th>Remaining</th>
                <th>Overdue</th>
                <th>Next Payment</th>
                <th>Last Payment</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.plan}>
                  <td><strong>{plan.student}</strong></td>
                  <td>{plan.plan}</td>
                  <td><span className={`badge ${plan.badge}`}>{plan.status}</span></td>
                  <td>{plan.paid}</td>
                  <td>{plan.remaining}</td>
                  <td>{plan.overdue}</td>
                  <td>{plan.nextPayment}</td>
                  <td>{plan.lastPayment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="detail-panel">
        <div className="card">
          <h2>Selected Plan Detail</h2>
          <p className="muted">Example detail view when a provider selects a payment plan.</p>
          <DetailRow label="Student" value="Emily Roberts" />
          <DetailRow label="Plan Number" value="NZ-000129" />
          <DetailRow label="Authorisation Status" value="Active" />
          <DetailRow label="Payment Frequency" value="Weekly" />
          <DetailRow label="Instalment Amount" value="$150" />
        </div>

        <div className="card">
          <h2>Collections Status</h2>
          <p className="muted">Provider-facing collections summary only.</p>
          <DetailRow label="Arrears Status" value="Overdue" />
          <DetailRow label="Days in Arrears" value="21 days" />
          <DetailRow label="Missed Payments" value="3" />
          <DetailRow label="Last Payment" value="10 May 2026" />
          <DetailRow label="Next Scheduled Payment" value="31 May 2026" />
        </div>
      </section>
    </main>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
