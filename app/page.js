import './styles.css';

const plans = [
  {
    plan: 'NZ-000128',
    student: 'Sarah Thompson',
      stage: 'Payment Plan Signed',
  authorisationStatus: 'Active',
    course: 'Diploma of Beauty Therapy',
    agreementDate: '27 May 2026',
    status: 'Current',
    paid: '$1,200',
    amount: '$3,600',
    remaining: '$2,400',
    overdue: '$0',
    nextPayment: '03 Jun 2026',
    lastPayment: '27 May 2026',
    arrears: 'No Arrears',
    daysInArrears: '0',
    frequency: 'Weekly',
    paymentAmount: '$150',
    authorisation: 'Active',
  },
  {
    plan: 'NZ-000129',
    student: 'Emily Roberts',
      stage: 'Payment Plan Signed',
  authorisationStatus: 'In Progress',
    course: 'Certificate in Makeup Artistry',
    agreementDate: '10 May 2026',
    status: 'Overdue',
    paid: '$900',
    amount: '$3,200',
    remaining: '$3,150',
    overdue: '$450',
    nextPayment: '31 May 2026',
    lastPayment: '10 May 2026',
    arrears: '16 - 30 Days',
    daysInArrears: '21',
    frequency: 'Weekly',
    paymentAmount: '$150',
    authorisation: 'Active',
  },
  {
    plan: 'NZ-000130',
    student: 'Jessica Martin',
      stage: 'Payment Plan Signed',
  authorisationStatus: 'Active',
    course: 'Eyelash Extension Course Bundle',
    agreementDate: '15 Apr 2026',
    status: 'Serious Arrears',
    paid: '$450',
    amount: '$5,600',
    remaining: '$4,050',
    overdue: '$1,350',
    nextPayment: 'Overdue',
    lastPayment: '15 Apr 2026',
    arrears: '61 - 90 Days',
    daysInArrears: '66',
    frequency: 'Fortnightly',
    paymentAmount: '$225',
    authorisation: 'Active',
  },
];

const selectedPlan = plans[1];

export default function Home() {
  return (
    <main className="portal">
    
<header className="topbar">
  <div className="brand-logo">
    <img src="/studentpay-logo.png" alt="StudentPay" className="logo" />
    <span className="logo-region">NZ</span>
  </div>

  <nav className="nav">
    <a className="active">Dashboard</a>
    <a>Payment Plans</a>
    <a>Reports</a>
    <a>Support</a>
  </nav>

  <div className="provider">
    <small>Logged in as</small>
    <strong>Bela Beauty College</strong>
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
          <strong className="green">28</strong>
        </div>
        <div className="summary-card">
          <span>Paid To Date</span>
          <strong>$37,800</strong>
        </div>
        <div className="summary-card">
          <span>Current Balance</span>
          <strong>$84,250</strong>
        </div>
        <div className="summary-card">
          <span>Overdue Balance</span>
          <strong className="red">$4,650</strong>
        </div>
        <div className="summary-card">
          <span>Plans in Arrears</span>
          <strong className="orange">6</strong>
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
                  <td>{plan.amount}</td>
                  <td>{plan.remaining}</td>
                  <td>{plan.overdue}</td>
                  <td><button className="view-button">Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
            <div className="detail-row"><span>Plan Status</span><strong>{selectedPlan.status}</strong></div>
            <div className="detail-row"><span>Authorisation Status</span><strong>{selectedPlan.authorisation}</strong></div>
          </div>

          <div className="detail-section">
            <h3>Financial Summary</h3>
            <div className="detail-row"><span>Paid To Date</span><strong>{selectedPlan.paid}</strong></div>
            <div className="detail-row"><span>Current Balance</span><strong>{selectedPlan.remaining}</strong></div>
            <div className="detail-row"><span>Overdue Balance</span><strong>{selectedPlan.overdue}</strong></div>
            <div className="detail-row"><span>Last Payment</span><strong>{selectedPlan.lastPayment}</strong></div>
            <div className="detail-row"><span>Next Payment</span><strong>{selectedPlan.nextPayment}</strong></div>
          </div>

          <div className="detail-section">
            <h3>Payment Schedule</h3>
            <div className="detail-row"><span>Payment Frequency</span><strong>{selectedPlan.frequency}</strong></div>
            <div className="detail-row"><span>Instalment Amount</span><strong>{selectedPlan.paymentAmount}</strong></div>
          </div>

          <div className="detail-section">
            <h3>Collections Summary</h3>
            <div className="detail-row"><span>Arrears Category</span><strong>{selectedPlan.arrears}</strong></div>
            <div className="detail-row"><span>Days in Arrears</span><strong>{selectedPlan.daysInArrears}</strong></div>
            <div className="detail-row"><span>Overdue Balance</span><strong>{selectedPlan.overdue}</strong></div>
          </div>
        </div>
      </section>
    </main>
  );
}