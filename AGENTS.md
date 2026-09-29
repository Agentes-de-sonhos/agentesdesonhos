# Architecture rules

- White-label hero visual variants must be declared in the tenant profile and resolved by the shared home renderer with safe defaults, preserving tenant isolation.
- ADS briefing e-mail: server-to-server Edge Function `ads-briefing-email` with own relay-token auth (SHA-256 in private `ads_briefing_integration`), private service-role-only queue + production-run tables; retries piggyback on the `product-landing-lead-emails` cron. Why: owner-only internal production trigger, no public/tenant surface.
- ADS site previews use path-keyed local fixtures on synthetic hostnames and the shared white-label renderer, gated to technical preview hosts with all commercial actions and backend access blocked. Why: enables review without publishing or touching tenant data.
