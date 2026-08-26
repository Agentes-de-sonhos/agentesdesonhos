-- Escopo de agência para políticas de equipe (corrige vazamento entre agências)

-- Itineraries
DROP POLICY IF EXISTS team_itineraries_select ON public.itineraries;
CREATE POLICY team_itineraries_select ON public.itineraries FOR SELECT TO authenticated
USING (public.can_team('itineraries.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_itineraries_update ON public.itineraries;
CREATE POLICY team_itineraries_update ON public.itineraries FOR UPDATE TO authenticated
USING (public.can_team('itineraries.edit') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_itineraries_delete ON public.itineraries;
CREATE POLICY team_itineraries_delete ON public.itineraries FOR DELETE TO authenticated
USING (public.can_team('itineraries.delete') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_itineraries_insert ON public.itineraries;
CREATE POLICY team_itineraries_insert ON public.itineraries FOR INSERT TO authenticated
WITH CHECK (public.can_team('itineraries.create') AND user_id = public.user_agency_id(auth.uid()));

-- Quotes
DROP POLICY IF EXISTS team_quotes_select ON public.quotes;
CREATE POLICY team_quotes_select ON public.quotes FOR SELECT TO authenticated
USING (public.can_team('quotes.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_quotes_update ON public.quotes;
CREATE POLICY team_quotes_update ON public.quotes FOR UPDATE TO authenticated
USING (public.can_team('quotes.edit') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_quotes_delete ON public.quotes;
CREATE POLICY team_quotes_delete ON public.quotes FOR DELETE TO authenticated
USING (public.can_team('quotes.delete') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_quotes_insert ON public.quotes;
CREATE POLICY team_quotes_insert ON public.quotes FOR INSERT TO authenticated
WITH CHECK (public.can_team('quotes.create') AND user_id = public.user_agency_id(auth.uid()));

-- Trips (carteiras digitais)
DROP POLICY IF EXISTS team_trips_select ON public.trips;
CREATE POLICY team_trips_select ON public.trips FOR SELECT TO authenticated
USING (public.can_team('wallet.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_trips_update ON public.trips;
CREATE POLICY team_trips_update ON public.trips FOR UPDATE TO authenticated
USING (public.can_team('wallet.edit') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_trips_delete ON public.trips;
CREATE POLICY team_trips_delete ON public.trips FOR DELETE TO authenticated
USING (public.can_team('wallet.delete') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_trips_insert ON public.trips;
CREATE POLICY team_trips_insert ON public.trips FOR INSERT TO authenticated
WITH CHECK (public.can_team('wallet.create') AND user_id = public.user_agency_id(auth.uid()));

-- Sales
DROP POLICY IF EXISTS team_sales_select ON public.sales;
CREATE POLICY team_sales_select ON public.sales FOR SELECT TO authenticated
USING (public.can_team('financial.sales.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_sales_update ON public.sales;
CREATE POLICY team_sales_update ON public.sales FOR UPDATE TO authenticated
USING (public.can_team('financial.sales.manage') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_sales_delete ON public.sales;
CREATE POLICY team_sales_delete ON public.sales FOR DELETE TO authenticated
USING (public.can_team('financial.sales.manage') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_sales_insert ON public.sales;
CREATE POLICY team_sales_insert ON public.sales FOR INSERT TO authenticated
WITH CHECK (public.can_team('financial.sales.manage') AND user_id = public.user_agency_id(auth.uid()));

-- Invoices
DROP POLICY IF EXISTS team_invoices_select ON public.invoices;
CREATE POLICY team_invoices_select ON public.invoices FOR SELECT TO authenticated
USING (public.can_team('financial.invoices.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_invoices_update ON public.invoices;
CREATE POLICY team_invoices_update ON public.invoices FOR UPDATE TO authenticated
USING (public.can_team('financial.invoices.manage') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_invoices_delete ON public.invoices;
CREATE POLICY team_invoices_delete ON public.invoices FOR DELETE TO authenticated
USING (public.can_team('financial.invoices.manage') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_invoices_insert ON public.invoices;
CREATE POLICY team_invoices_insert ON public.invoices FOR INSERT TO authenticated
WITH CHECK (public.can_team('financial.invoices.manage') AND user_id = public.user_agency_id(auth.uid()));

-- Income entries
DROP POLICY IF EXISTS team_income_select ON public.income_entries;
CREATE POLICY team_income_select ON public.income_entries FOR SELECT TO authenticated
USING (public.can_team('financial.access') AND public.can_team('financial.income.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_income_update ON public.income_entries;
CREATE POLICY team_income_update ON public.income_entries FOR UPDATE TO authenticated
USING (public.can_team('financial.income.manage') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_income_delete ON public.income_entries;
CREATE POLICY team_income_delete ON public.income_entries FOR DELETE TO authenticated
USING (public.can_team('financial.income.manage') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_income_write ON public.income_entries;
CREATE POLICY team_income_write ON public.income_entries FOR INSERT TO authenticated
WITH CHECK (public.can_team('financial.income.manage') AND user_id = public.user_agency_id(auth.uid()));

-- Expense entries
DROP POLICY IF EXISTS team_expense_select ON public.expense_entries;
CREATE POLICY team_expense_select ON public.expense_entries FOR SELECT TO authenticated
USING (public.can_team('financial.access') AND public.can_team('financial.expenses.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_expense_update ON public.expense_entries;
CREATE POLICY team_expense_update ON public.expense_entries FOR UPDATE TO authenticated
USING (public.can_team('financial.expenses.manage') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_expense_delete ON public.expense_entries;
CREATE POLICY team_expense_delete ON public.expense_entries FOR DELETE TO authenticated
USING (public.can_team('financial.expenses.manage') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_expense_write ON public.expense_entries;
CREATE POLICY team_expense_write ON public.expense_entries FOR INSERT TO authenticated
WITH CHECK (public.can_team('financial.expenses.manage') AND user_id = public.user_agency_id(auth.uid()));

-- Financial goals
DROP POLICY IF EXISTS team_goals_select ON public.financial_goals;
CREATE POLICY team_goals_select ON public.financial_goals FOR SELECT TO authenticated
USING (public.can_team('goals.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_goals_update ON public.financial_goals;
CREATE POLICY team_goals_update ON public.financial_goals FOR UPDATE TO authenticated
USING (public.can_team('goals.edit') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_goals_delete ON public.financial_goals;
CREATE POLICY team_goals_delete ON public.financial_goals FOR DELETE TO authenticated
USING (public.can_team('goals.edit') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_goals_write ON public.financial_goals;
CREATE POLICY team_goals_write ON public.financial_goals FOR INSERT TO authenticated
WITH CHECK (public.can_team('goals.edit') AND user_id = public.user_agency_id(auth.uid()));

-- Agenda (agency_events)
DROP POLICY IF EXISTS team_agenda_select ON public.agency_events;
CREATE POLICY team_agenda_select ON public.agency_events FOR SELECT TO authenticated
USING (public.can_team('agenda.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_agenda_update ON public.agency_events;
CREATE POLICY team_agenda_update ON public.agency_events FOR UPDATE TO authenticated
USING (public.can_team('agenda.edit') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_agenda_delete ON public.agency_events;
CREATE POLICY team_agenda_delete ON public.agency_events FOR DELETE TO authenticated
USING (public.can_team('agenda.delete') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_agenda_insert ON public.agency_events;
CREATE POLICY team_agenda_insert ON public.agency_events FOR INSERT TO authenticated
WITH CHECK (public.can_team('agenda.create') AND user_id = public.user_agency_id(auth.uid()));

-- Clients (mantém regra de responsabilidade + escopo de agência)
DROP POLICY IF EXISTS team_clients_select ON public.clients;
CREATE POLICY team_clients_select ON public.clients FOR SELECT TO authenticated
USING (public.can_team('clients.view') AND user_id = public.user_agency_id(auth.uid())
       AND public.team_record_visible('clients', created_by_team_member_id, assigned_team_member_id));
DROP POLICY IF EXISTS team_clients_delete ON public.clients;
CREATE POLICY team_clients_delete ON public.clients FOR DELETE TO authenticated
USING (public.can_team('clients.delete') AND user_id = public.user_agency_id(auth.uid())
       AND public.team_record_visible('clients', created_by_team_member_id, assigned_team_member_id));

-- Operations
DROP POLICY IF EXISTS team_ops_select ON public.operations;
CREATE POLICY team_ops_select ON public.operations FOR SELECT TO authenticated
USING (public.can_team('operations.view') AND user_id = public.user_agency_id(auth.uid())
       AND public.team_record_visible('operations', created_by_team_member_id, assigned_team_member_id));
DROP POLICY IF EXISTS team_ops_delete ON public.operations;
CREATE POLICY team_ops_delete ON public.operations FOR DELETE TO authenticated
USING (public.can_team('operations.delete') AND user_id = public.user_agency_id(auth.uid())
       AND public.team_record_visible('operations', created_by_team_member_id, assigned_team_member_id));

-- Operation services
DROP POLICY IF EXISTS team_op_services_select ON public.operation_services;
CREATE POLICY team_op_services_select ON public.operation_services FOR SELECT TO authenticated
USING (public.can_team('operations.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_op_services_delete ON public.operation_services;
CREATE POLICY team_op_services_delete ON public.operation_services FOR DELETE TO authenticated
USING (public.can_team('operations.delete') AND user_id = public.user_agency_id(auth.uid()));

-- Operation tasks
DROP POLICY IF EXISTS team_tasks_select ON public.operation_tasks;
CREATE POLICY team_tasks_select ON public.operation_tasks FOR SELECT TO authenticated
USING (public.can_team('tasks.view') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_tasks_update ON public.operation_tasks;
CREATE POLICY team_tasks_update ON public.operation_tasks FOR UPDATE TO authenticated
USING (public.can_team('tasks.edit') AND user_id = public.user_agency_id(auth.uid()))
WITH CHECK (user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_tasks_delete ON public.operation_tasks;
CREATE POLICY team_tasks_delete ON public.operation_tasks FOR DELETE TO authenticated
USING (public.can_team('tasks.delete') AND user_id = public.user_agency_id(auth.uid()));
DROP POLICY IF EXISTS team_tasks_insert ON public.operation_tasks;
CREATE POLICY team_tasks_insert ON public.operation_tasks FOR INSERT TO authenticated
WITH CHECK (public.can_team('tasks.create') AND user_id = public.user_agency_id(auth.uid()));