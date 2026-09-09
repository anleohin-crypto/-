# QA WIP 10 – Leasing Team Manager 1.1.0

## Scope
Regression expansion for Planning Intelligence, Auto Planning, Forecast/Scenario isolation and Smart Excel duplicate detection.

## Automated core regression
- Total scenarios: 24
- Passed: 24
- Failed: 0

## New scenarios added in WIP 10
1. Planning Intelligence: one aggregated overload issue per employee.
2. Planning Intelligence: absence conflict only for tasks assigned to the absent employee and overlapping the absence window.
3. Auto Planning: full reassignment when a recipient has sufficient free capacity.
4. Auto Planning: split recommendation when only partial capacity is available.
5. Auto Planning apply is immutable and does not mutate the source task collection.
6. Forecast/Scenario: monthly hours move between periods while production allocations remain unchanged.
7. Smart Import: unique business identifiers are treated as exact duplicates.
8. Smart Import: identical task name alone is not sufficient to classify a row as duplicate.
9. Smart Import: duplicate records inside the same Excel import file are detected before commit.

## Defects / gaps corrected
- Client code, employee number and task number are now treated as strong unique business identifiers (exact duplicate), rather than only medium/high suspicion.
- Smart duplicate detection now compares imported rows against previous rows in the same workbook, not only against records already stored in the application.
- Duplicate detection remains record-level and weighted; a repeated value in one ordinary field is not enough by itself to reject a row.

## Release status
NOT READY FOR RELEASE. Full npm install/build, renderer UI regression, Excel file-level integration, persistence/restart and end-to-end desktop testing are still required by the Release Gate.
