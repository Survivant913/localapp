-- Création de la table de partage pour les listes de tâches
CREATE TABLE IF NOT EXISTS public.todo_list_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de RLS sur la nouvelle table
ALTER TABLE public.todo_list_shares ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les partages dont ils sont propriétaires ou s'ils sont invités
CREATE POLICY "Users can view their own todo list shares" ON public.todo_list_shares
FOR SELECT USING (
    auth.uid() = owner_id OR user_email = (auth.jwt() ->> 'email')::text
);

CREATE POLICY "Users can insert their own todo list shares" ON public.todo_list_shares
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own todo list shares or leave" ON public.todo_list_shares
FOR DELETE USING (
    auth.uid() = owner_id OR user_email = (auth.jwt() ->> 'email')::text
);

-- Activation de Realtime pour todo_list_shares
alter publication supabase_realtime add table todo_list_shares;

-- Mise à jour des politiques pour 	odo_lists
-- Le propriétaire ET les invités doivent pouvoir voir la liste
DROP POLICY IF EXISTS "Users can view their own todo lists" ON public.todo_lists;
CREATE POLICY "Users can view their own or shared todo lists" ON public.todo_lists
FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.todo_list_shares 
        WHERE todo_list_shares.list_id = todo_lists.id::text 
        AND todo_list_shares.user_email = (auth.jwt() ->> 'email')::text
    )
);

-- Mise à jour des politiques pour 	odos
-- Les invités doivent pouvoir voir, insérer, modifier et supprimer les tâches dans les listes partagées
DROP POLICY IF EXISTS "Users can view their own todos" ON public.todos;
CREATE POLICY "Users can view their own or shared todos" ON public.todos
FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.todo_list_shares 
        WHERE todo_list_shares.list_id = todos.list_id::text 
        AND todo_list_shares.user_email = (auth.jwt() ->> 'email')::text
    )
);

DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
CREATE POLICY "Users can insert their own or shared todos" ON public.todos
FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.todo_list_shares 
        WHERE todo_list_shares.list_id = todos.list_id::text 
        AND todo_list_shares.user_email = (auth.jwt() ->> 'email')::text
    )
);

DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
CREATE POLICY "Users can update their own or shared todos" ON public.todos
FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.todo_list_shares 
        WHERE todo_list_shares.list_id = todos.list_id::text 
        AND todo_list_shares.user_email = (auth.jwt() ->> 'email')::text
    )
);

DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;
CREATE POLICY "Users can delete their own or shared todos" ON public.todos
FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.todo_list_shares 
        WHERE todo_list_shares.list_id = todos.list_id::text 
        AND todo_list_shares.user_email = (auth.jwt() ->> 'email')::text
    )
);

