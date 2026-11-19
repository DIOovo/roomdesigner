# Paid generation only

Free generation and complimentary signup credits have been retired. Historical
free grants are retained for audit but are not included in spendable balances.
Existing subscriptions, credit packs, manual grants, and paid refunds keep their
previous rules. The internal `free` plan value remains the no-subscription account
type; it does not grant generation credits.

Deployment order:

1. Back up production and apply only `supabase/migrations/009_paid_generation_only.sql`.
2. Deploy the accompanying application change.
3. Verify anonymous requests return 401, a free-only account returns 402,
   and an account with purchased credits reserves a paid grant.

The new application uses `reserve_paid_generation_credit` and fails closed if
the migration has not been applied. The old reservation RPC delegates to the
paid-only function so older deployed code cannot spend free grants either.
Signup and anonymous account-linking functions no longer insert promotional grants.
No historical payment, generation, or grant rows are deleted.

The payment availability gate is unchanged. If purchases are disabled, users
without existing paid credits cannot generate until checkout is enabled.

Applying this migration and deploying are required to change the live policy;
pushing the feature branch alone does not change the production website.
