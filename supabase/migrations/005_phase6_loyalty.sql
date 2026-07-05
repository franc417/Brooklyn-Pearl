-- ============================================================================
-- Brooklyn Pearl Resort — Phase 6 Migration
-- Adds is_loyalty_reward so a free booking (granted via loyalty) can also
-- transition to 'confirmed' without the Phase 2 triggers mistaking it for a
-- tenth paid stay -- which would let a guest chain free rewards indefinitely.
-- The trigger functions are redefined (not just the tables altered) so the
-- correct counter increments atomically and application code never has to
-- remember to touch loyalty_counters directly -- same reasoning as Phase 2.
-- ============================================================================

alter table bookings add column is_loyalty_reward boolean not null default false;
alter table swimming_bookings add column is_loyalty_reward boolean not null default false;

-- Phase 0 only ever added a SELECT policy for guests -- there was no signup
-- flow yet to need an INSERT one. Without this, a new guest creating their
-- own profile row from the browser is silently rejected by RLS's default-deny.
create policy "Guests can create their own profile"
  on guests for insert
  with check (auth.uid() = id);

create or replace function increment_loyalty_hotel_bnb() returns trigger as $$
declare
  v_category text;
begin
  if new.guest_id is null then
    return new; -- loyalty only accrues to real accounts, per Phase 1 decision
  end if;

  select category::text into v_category from room_types where id = new.room_type_id;

  if new.is_loyalty_reward then
    insert into loyalty_counters (guest_id, service_category, free_rewards_granted)
      values (new.guest_id, v_category, 1)
    on conflict (guest_id, service_category)
      do update set free_rewards_granted = loyalty_counters.free_rewards_granted + 1, updated_at = now();
  else
    insert into loyalty_counters (guest_id, service_category, paid_count)
      values (new.guest_id, v_category, 1)
    on conflict (guest_id, service_category)
      do update set paid_count = loyalty_counters.paid_count + 1, updated_at = now();
  end if;

  return new;
end;
$$ language plpgsql;

create or replace function increment_loyalty_swimming() returns trigger as $$
begin
  if new.guest_id is null then
    return new;
  end if;

  if new.is_loyalty_reward then
    insert into loyalty_counters (guest_id, service_category, free_rewards_granted)
      values (new.guest_id, 'swimming', 1)
    on conflict (guest_id, service_category)
      do update set free_rewards_granted = loyalty_counters.free_rewards_granted + 1, updated_at = now();
  else
    insert into loyalty_counters (guest_id, service_category, paid_count)
      values (new.guest_id, 'swimming', 1)
    on conflict (guest_id, service_category)
      do update set paid_count = loyalty_counters.paid_count + 1, updated_at = now();
  end if;

  return new;
end;
$$ language plpgsql;
