# Payment plan details

The Provider Portal payment plan modal is a read-only view of one plan. Opening Details does not create or update Opportunities, Direct Debit Authorisations, account transactions, payment attempts, charge schedules, or GoCardless records.

The plan list is unchanged. Direct Debit details and recent transactions load only after the matching tab is selected, and they are cached while that modal stays open. Closing the modal and opening it again returns to Summary.

## Tabs

The plan number, student name, and Close action stay visible.

| Tab | When it loads | What it shows |
|---|---|---|
| Summary | Immediately, from the plan already on screen | Account balance, plan summary, financial summary, payment schedule, collections summary |
| Direct Debit Details | First time the tab is selected | Current Direct Debit Authorisation for that plan |
| Recent Transactions | First time the tab is selected | Statement lines whose transaction date is inside the last 60 New Zealand days |

Summary remains the default tab.

## Direct Debit source

The current authorisation is `Opportunity.Current_Direct_Debit_Authorisation__c` (`Direct_Debit_Authorisation__c`).

| Shown as | Salesforce field |
|---|---|
| Status | Provider-facing label from `Authorisation_Status__c`, `Direct_Debit_Setup_Complete__c`, `GC_Mandate_Status__c`, and `GC_Billing_Request_Status__c` |
| Authorised At | `Authorised_At__c` |
| Cancelled At | `Cancelled_At__c` |
| Failed At | `Failed_At__c` |
| Failure Reason | `Failure_Reason__c` |
| Authorisation Redirect URL | `Authorisation_Redirect_URL__c`, otherwise the stored `GC_Billing_Request_URL__c` |

Status uses the same labels as the plan table: Authorised, Setup in progress, Action required, or Cancelled. Times are Pacific/Auckland. A blank value is shown as an em dash. The URL is the stored GoCardless hosted link. The portal does not build a link from GoCardless ids.

Empty and error states:

- No current authorisation: “No Direct Debit Authorisation has been created for this Payment Plan.”
- Authorisation exists, link is blank: “The Direct Debit setup link is not currently available.”
- Request failed: “Direct Debit details could not be loaded.” Retry stays on this tab.

Salesforce ids, GoCardless customer ids, billing-request ids, and credentials are not shown. The hosted URL is shown because that is the setup link.

## Transactions source

Rows come from `Account_Transaction__c` for the opportunity found by the scoped plan lookup.

Ordering and the running balance follow the payer statement, not `CreatedDate`:

- transaction date first
- same day: Charge, then fees and adjustment debits, then Payment Received or Manual, then Reversal, Adjustment Credit, or Write Off
- running balance starts at 0 across the visible statement, then the view keeps only the last 60 days

Visible rows match the statement: not cancelled, not internal-only, and not hidden from the statement. Amount is the statement net (`Net_Amount__c`, otherwise debit minus credit), so a payment credit is negative and a charge debit is positive. The balance on a recent row still includes activity older than 60 days.

The 60-day window is inclusive. `Transaction_Date__c` must be from New Zealand today minus 60 days through today. A request cannot widen that window.

An empty window shows “No transactions in the last 60 days.” A failed request shows “Recent transactions could not be loaded.” and does not close the modal.

## Routes

Both routes are portal reads. They use the signed-in Clerk user. They do not accept a provider id or an opportunity id from the browser.

`GET /api/plans/:planNumber/direct-debit`

```json
{
  "success": true,
  "plan": "PLN-1000000446",
  "directDebit": {
    "status": "Authorised",
    "authorisedAt": "29 Sep 2026, 10:14 am",
    "cancelledAt": null,
    "failedAt": null,
    "failureReason": null,
    "authorisationUrl": "https://pay.gocardless.com/..."
  }
}
```

`directDebit` is `null` when the plan has no current authorisation. The displayed portal text uses an em dash for null fields.

`GET /api/plans/:planNumber/transactions?days=60`

`days` is accepted for callers, and the window stays 60 days.

```json
{
  "success": true,
  "plan": "PLN-1000000446",
  "days": 60,
  "from": "2026-07-31",
  "to": "2026-09-29",
  "transactions": [
    {
      "date": "29 Sep 2026",
      "label": "Payment Received",
      "detail": null,
      "amount": -35,
      "balance": 70
    }
  ]
}
```

The plan number must look like `PLN-` followed by digits. Any other value, including a Salesforce opportunity id, is rejected before Salesforce is queried. The opportunity is loaded with the session provider predicate (`Education_Provider__c` for a provider user, or any named provider for an admin). A plan that belongs to another provider returns the same not-found response as a missing plan.

These reads are disabled when `STUDENTPAY_ENV=sandbox`, so a sandbox portal session cannot query the production org. Production plan lists continue to use `/api/plans` only.
