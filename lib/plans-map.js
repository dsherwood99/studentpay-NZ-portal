export function mapOpportunityToPlan(record) {
  return {
    id: record.Id,
    plan: record.Plan_Number__c || '',
    student: record.Payer_Contact__r?.Name || 'Unknown',
    stage: record.StageName || '',
    authorisationStatus: record.Authorisation_Status__c || '',
    agreementDate: record.Agreement_Date__c || '',
    amount: record.Amount ?? 0,
    collected: record.Paid_To_Date__c ?? 0,
    remaining: record.Remaining_Balance__c ?? 0,
    overdue: record.Overdue_Balance__c ?? 0,
    status: record.Arrears_Category__c || 'No Arrears',
    course: record.Course_Name__c || '',
    paymentAmount: record.Value_of_Each_Instalment__c ?? 0,
    frequency: record.Payment_Frequency__c || '',
    daysInArrears: record.Oldest_Overdue_Days__c ?? 0,
  };
}

export function buildPlansSoql(educationProviderPredicate) {
  return `
      SELECT
        Id,
        Name,
        Plan_Number__c,
        StageName,
        Amount,
        Agreement_Date__c,
        Education_Provider__c,
        Authorisation_Status__c,
        Payer_Contact__r.Name,
        Course_Name__c,
        Remaining_Balance__c,
        Current_Balance__c,
        Overdue_Balance__c,
        Paid_To_Date__c,
        Arrears_Category__c,
        Value_of_Each_Instalment__c,
        Payment_Frequency__c,
        Oldest_Overdue_Days__c
      FROM Opportunity
      WHERE ${educationProviderPredicate}
      ORDER BY Agreement_Date__c DESC
    `;
}
