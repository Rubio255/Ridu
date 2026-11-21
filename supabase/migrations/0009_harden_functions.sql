-- Saugumas: pagalbinių SECURITY DEFINER funkcijų negali kviesti neprisijungę lankytojai.
-- handle_new_user kviečia tik trigeris; is_* funkcijos reikalingos prisijungusiųjų RLS taisyklėms.
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function is_owner() from public, anon;
revoke execute on function is_driver() from public, anon;
revoke execute on function is_guardian(uuid) from public, anon;
grant execute on function is_owner() to authenticated;
grant execute on function is_driver() to authenticated;
grant execute on function is_guardian(uuid) to authenticated;
