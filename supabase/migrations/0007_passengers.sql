-- Ridu veža ne tik vaikus: keleivis gali būti vaikas, suaugęs arba vyresnio amžiaus.
-- Lentelė "children" palikta dėl suderinamumo, bet joje saugomi visi keleiviai.
create type passenger_type as enum ('child', 'adult', 'senior');

alter table children
  add column passenger_type passenger_type not null default 'child',
  add column is_self boolean not null default false,            -- klientas užsako sau
  add column dropoff text not null default 'alone' check (dropoff in ('alone', 'handover')), -- suaugusiam: išlipa pats ar perduoti asmeniui
  add column handover_to text,
  add column consent_at timestamptz;                            -- kai užsakoma kitam suaugusiajam: patvirtinta, kad keleivis sutinka
comment on table children is 'Keleiviai: vaikai ir suaugę. Suaugusiųjų sveikatos ar judumo duomenys nerenkami.';

-- Vaikus veža tik vairuotojai su patikrintu QR kodu darbui su vaikais ir vaikiškomis kėdutėmis
alter table drivers
  add column child_qr_verified boolean not null default false,
  add column child_seats boolean not null default false;

-- Laikas grafikui priklauso nuo keleivio tipo, todėl jis įrašomas sutartyje
alter table subscriptions add column passenger_type passenger_type not null default 'child';

-- Suaugusiųjų maršrutams
alter type place_kind add value if not exists 'work';
alter type place_kind add value if not exists 'clinic';
