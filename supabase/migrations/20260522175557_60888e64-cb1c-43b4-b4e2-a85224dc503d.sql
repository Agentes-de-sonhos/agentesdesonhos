insert into storage.buckets (id, name, public)
values ('hotel-imports', 'hotel-imports', false)
on conflict (id) do nothing;

create policy "Users can upload own hotel imports"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'hotel-imports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own hotel imports"
on storage.objects for select to authenticated
using (
  bucket_id = 'hotel-imports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own hotel imports"
on storage.objects for delete to authenticated
using (
  bucket_id = 'hotel-imports'
  and (storage.foldername(name))[1] = auth.uid()::text
);