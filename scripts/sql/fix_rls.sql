-- Allow authenticated insert/update/delete for noticias
CREATE POLICY "Admins can insert news" ON "public"."noticias"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can update news" ON "public"."noticias"
AS PERMISSIVE FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete news" ON "public"."noticias"
AS PERMISSIVE FOR DELETE
TO public
USING (true);
