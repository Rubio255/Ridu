-- Kelionė rodoma žingsniais: kada keleivis paimtas ir kada nuvežtas
alter table trips
  add column picked_up_at timestamptz,
  add column delivered_at timestamptz;

-- Šeimos slaptas žodis: vairuotojas jį pasako vaikui prieš įlipant.
-- Mato tik globėjai, MB ir vairuotojas (rašoma per serverį).
alter table children add column code_word text check (char_length(code_word) <= 40);
