---
name: Product Landing Lead Notifications
description: E-mail notifications for new leads from white-label product landings — recipients, default assignee, timezone-aware window, queue worker
type: feature
---
Reusable across all product landings (started with Transamérica Comandatuba).

- In-app realtime alert + CRM creation stay always on; e-mail is opt-in per landing.
- Config tables: `product_landing_notification_settings`, `product_landing_notification_recipients`, queue `product_landing_lead_deliveries`.
- Recipients must be the account owner and/or **active** team members with `agency_team_members.notification_email`. Blocked members are auto-removed from recipients by trigger.
- Default assignee written server-side to `product_landing_leads.assigned_team_member_id` and `opportunities.assigned_team_member_id` (+ `assignment_reason`).
- Window: `notify_days` + `notify_start`/`notify_end` in the landing timezone. Outside the window the e-mail is scheduled for the next window start — never dropped. SQL `product_landing_next_notify_at` is the source of truth; `src/lib/leadNotificationSchedule.ts` mirrors it for UI/tests.
- Delivery worker: Edge Function `product-landing-lead-emails` (Resend), invoked by pg_cron every minute with header `x-cron-secret` = `LEAD_EMAIL_CRON_SECRET`. Claims via `claim_product_landing_lead_deliveries`, finishes via `complete_product_landing_lead_delivery` (retries, then `failed`).
- Test-mode leads (`is_test`) still notify but never count as commercial metrics.