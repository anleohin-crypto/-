# QA Progress – WIP 9

Status: **WIP / not a Release Candidate**

This iteration introduces the first repeatable core regression gate. The suite is intentionally focused on deterministic business logic and runs before packaging in GitHub Actions.

## Defects found and fixed in this QA iteration
1. **Scenario day allocation did not move for same-month shifts** – Fixed.
2. **Scenario allocation could remain assigned to the wrong month when an exact day crossed a month boundary** – Fixed.
3. **Capacity filtered by client/project could still count allocations from tasks outside the filter** – Fixed.
4. **Cross-month absences could be counted in full in more than one month, or missed in an intermediate month** – Fixed by proportional workday allocation.

## Automated regression coverage added
- Recurring schedules and exceptions.
- Duplicate explicit occurrence dates.
- Dependency FS constraints, cycles and cascade with lag.
- Critical Path simple chain.
- Baseline immutability and variance.
- Scenario isolation from production data.
- Day-level and month-boundary scenario allocation movement.
- Client-filtered capacity.
- Cross-month absence capacity impact.
- Data integrity checks for duplicate business identifiers, invalid references, invalid ranges and negative hours.

## Remaining release gates
Full dependency install, TypeScript validation, the new core regression suite, Vite build, Electron packaging, UI/E2E testing, import/export large-file and duplicate-resolution testing, persistence/restart testing, and full manual regression of all screens/buttons remain mandatory before release.
