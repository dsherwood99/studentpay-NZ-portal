# NZ Provider Portal — Collections dashboard

Live surface: [portal.studentpay.co.nz](https://portal.studentpay.co.nz)

This document is the reporting contract for the Collections chart. It does not change Salesforce data, Clerk tenancy, or `/api/plans`.

## Collection definition

A collection is an `Account_Transaction__c` row where:

- `Transaction_Type__c = 'Payment Received'`
- `Status__c = 'Posted'`

Amount is `Credit_Amount__c`. Calendar day is `Transaction_Date__c` (Salesforce Date; no UTC conversion).

Pending, Reversed, Charge, Adjustment Credit, and Write Off rows are not collections.

## Settlement / reporting lag

GoCardless payments can post several business days later, still dated with the original `Transaction_Date__c`. The chart does **not** change the Posted Payment Received definition. It applies a reporting cutoff instead.

- Lag: 5 business days (`COLLECTIONS_SETTLEMENT_LAG_BUSINESS_DAYS`)
- Timezone: Pacific/Auckland
- Business day (v1): Monday–Friday
- `reporting_cutoff_date` = today minus 5 business days

The cutoff affects reporting windows only. It does not write to Salesforce.

## Current period

Solid “This month” series and the headline amount:

**current month day 1 → reporting cutoff**

Not “today’s month-to-date”. Headline copy is `Collected through {cutoff date}`.

## Comparison percentage

`(current cutoff total − previous same-period total) / previous same-period total`

Previous same-period = **previous month day 1 → the same day number as the cutoff**.

If previous same-period total is 0, `comparison_percent` is `null`.

The headline % does **not** use the full previous month.

## Previous-month line

The dotted “Last month” line is the **full previous calendar month**, for context only.

## Tenancy and safety

- Provider scope comes from Clerk `publicMetadata`, not request query params.
- Collections SOQL is aggregate-only (`GROUP BY Transaction_Date__c`).
- Salesforce access is read-only query. Collections reporting performs no DML.

## Future enhancement

NZ public-holiday-aware business-day calculation is **not** included. `subtractBusinessDays` already accepts an `isHoliday` hook so this can be added later without changing the collection definition or chart library.
