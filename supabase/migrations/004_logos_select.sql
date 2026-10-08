-- Supabase Storage exige une règle de lecture pour supprimer ou remplacer un fichier via l'API.
-- Sans elle, « Retirer le logo » laisse le fichier en place. Lecture limitée au dossier de l'utilisateur
-- (les logos restent publics via leur URL, le bucket étant public).
create policy "logos : lecture perso" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
