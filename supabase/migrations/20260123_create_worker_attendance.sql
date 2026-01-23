-- Create worker_attendance table
create table if not exists public.worker_attendance (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    worker_id uuid references public.workers(id) on delete cascade not null,
    organization_id uuid references public.organizations(id) on delete cascade not null,
    date date not null,
    status text not null check (status in ('present', 'absent', 'half_day', 'holiday')),
    unique(worker_id, date)
);

-- Enable RLS
alter table public.worker_attendance enable row level security;

-- Policies
create policy "Users can view their organization's worker attendance"
    on public.worker_attendance for select
    using (auth.uid() in (
        select user_id from organization_members 
        where organization_id = worker_attendance.organization_id
    ));

create policy "Users can insert their organization's worker attendance"
    on public.worker_attendance for insert
    with check (auth.uid() in (
        select user_id from organization_members 
        where organization_id = worker_attendance.organization_id
    ));

create policy "Users can update their organization's worker attendance"
    on public.worker_attendance for update
    using (auth.uid() in (
        select user_id from organization_members 
        where organization_id = worker_attendance.organization_id
    ));

create policy "Users can delete their organization's worker attendance"
    on public.worker_attendance for delete
    using (auth.uid() in (
        select user_id from organization_members 
        where organization_id = worker_attendance.organization_id
    ));
