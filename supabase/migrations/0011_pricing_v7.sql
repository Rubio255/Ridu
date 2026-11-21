-- Kainodara v7: standartinė kelionės vertė ir vairuotojo dalis saugomos užsakant, kredito planai klientams.

-- Abonemento standartinė vienos kelionės vertė (visam automobiliui, su PVM), užfiksuota užsakant
alter table subscriptions add column if not exists standard_trip_eur numeric(10,2);

-- Kelionės: keleivių standartinė vertė (iš jos leidžiamas plano kreditas) ir vairuotojo dalis be PVM
alter table trips add column if not exists standard_eur numeric(10,2);
alter table trips add column if not exists driver_share_eur numeric(10,2);

-- Kliento kredito planas: basic / family / premium (null – mokama pagal abonementų kainą)
alter table profiles add column if not exists plan_id text check (plan_id in ('basic', 'family', 'premium'));
alter table profiles add column if not exists plan_since date;
