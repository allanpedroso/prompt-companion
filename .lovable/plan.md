

## Plano: Autenticacao + Persistencia no Banco

### Resumo

Adicionar autenticacao por email/senha e migrar dados de mock para tabelas no banco. Cada usuario tera seus proprios documentos e despesas isolados via RLS.

### 1. Tabelas no banco (migrations)

```sql
-- Profiles (auto-criado no signup via trigger)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estabelecimento TEXT NOT NULL,
  cnpj_cpf TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  status TEXT NOT NULL DEFAULT 'pendente',
  nf_numero TEXT,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  emissao_mes_ano TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own expenses" ON public.expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT,
  file_path TEXT,
  type TEXT NOT NULL DEFAULT 'unknown',
  confidence NUMERIC(5,2) DEFAULT 0,
  extracted JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

Storage bucket `documents` para upload de arquivos reais (PDFs/imagens).

### 2. Pagina de Auth

Novo `src/pages/AuthPage.tsx` com formulario de login e cadastro (email + senha). Tabs para alternar entre Login e Cadastro. Campo de nome no cadastro. Email verification habilitado (padrao).

### 3. Auth Context

Novo `src/contexts/AuthContext.tsx` com `useAuth()` hook. Gerencia sessao via `onAuthStateChange`. Expoe `user`, `signIn`, `signUp`, `signOut`, `loading`.

### 4. Rotas protegidas

Editar `src/App.tsx`:
- Rota `/auth` publica com `AuthPage`
- Todas as outras rotas protegidas: se nao logado, redireciona para `/auth`
- Componente `ProtectedRoute` wrapper

### 5. Sidebar atualizada

Editar `src/components/AppSidebar.tsx`:
- Mostrar nome e email do usuario logado no footer
- Botao de logout

### 6. Hooks de dados

Novos hooks com react-query + supabase client para substituir mock:
- `src/hooks/useExpenses.ts` — CRUD despesas do usuario
- `src/hooks/useDocuments.ts` — CRUD documentos do usuario

### 7. Atualizar paginas

- `DashboardPage`: usar hooks reais em vez de `mockExpenses`/`mockDocuments`
- `ExpensesPage`: usar hook `useExpenses` com documentos relacionados
- `DocumentsPage`: usar hook `useDocuments`
- `SearchPage`: buscar no banco
- `UploadPage`: upload real para storage + insert na tabela documents

### Arquivos afetados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabelas profiles, expenses, documents + RLS + trigger |
| Storage bucket `documents` | Criar via migration |
| `src/pages/AuthPage.tsx` | Novo |
| `src/contexts/AuthContext.tsx` | Novo |
| `src/hooks/useExpenses.ts` | Novo |
| `src/hooks/useDocuments.ts` | Novo |
| `src/App.tsx` | Adicionar rota auth + protecao |
| `src/components/AppSidebar.tsx` | User info + logout |
| `src/pages/DashboardPage.tsx` | Usar hooks reais |
| `src/pages/ExpensesPage.tsx` | Usar hooks reais |
| `src/pages/DocumentsPage.tsx` | Usar hooks reais |
| `src/pages/SearchPage.tsx` | Usar hooks reais |
| `src/pages/UploadPage.tsx` | Upload real para storage |

