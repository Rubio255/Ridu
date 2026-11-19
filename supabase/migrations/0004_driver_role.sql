-- Samdomi vairuotojai (individuali veikla pagal pažymą). Atskira migracija, nes nauja enum reikšmė
-- negali būti naudojama toje pačioje transakcijoje.
alter type user_role add value if not exists 'driver';
