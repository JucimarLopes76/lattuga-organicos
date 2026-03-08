-- Tabela para armazenar as inscrições de Push Notification dos dispositivos dos admins
create table if not exists public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    subscription_json jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique(user_id, subscription_json)
);

-- RLS
alter table public.push_subscriptions enable row level security;

-- Admins podem ler e gerenciar suas próprias inscrições
create policy "Users can view and manage their own push subscriptions"
    on public.push_subscriptions
    for all
    using (auth.uid() = user_id);
