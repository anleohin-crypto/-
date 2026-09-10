# QA WIP15

## Fix
- Fixed task Excel date validation so an invalid provided date is not silently replaced by today's date.
- Invalid calendar dates now generate explicit row errors for planned start, planned end and deadline.
- Empty planned start retains legacy default-to-today behavior; malformed provided dates do not.

## CI context
- Static release/security checks passed.
- Core regression tests passed.
- XLSX integration reached date validation tests; WIP15 addresses the failing leap-day assertion.

## Release gate
- CLOSED until GitHub Actions completes XLSX, backup regression, Vite build and Windows installer successfully.
