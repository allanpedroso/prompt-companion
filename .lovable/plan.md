
## Objetivo
Permitir que usuários recuperem o acesso através de e-mail de redefinição de senha.

## O que será feito

1. **Link "Esqueci minha senha"** no formulário de login (`src/pages/AuthPage.tsx`)
   - Abre um modo de "recuperação" no mesmo card onde o usuário digita o e-mail
   - Ao enviar, chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
   - Mostra toast de confirmação

2. **Nova página `/reset-password`** (`src/pages/ResetPasswordPage.tsx`)
   - Rota pública (fora do guard de autenticação)
   - Detecta o token de recuperação na URL
   - Formulário para definir nova senha (com confirmação)
   - Chama `supabase.auth.updateUser({ password })`
   - Redireciona para `/` após sucesso

3. **Registrar a rota** em `src/App.tsx`

## Observação sobre e-mails
O envio usará o template padrão de recuperação de senha do Lovable Cloud (já funciona automaticamente, sem configuração extra). Se você quiser e-mails personalizados com a marca Gest Corp e domínio próprio, posso configurar isso em uma etapa separada depois.

## Arquivos afetados
- `src/pages/AuthPage.tsx` (editar)
- `src/pages/ResetPasswordPage.tsx` (criar)
- `src/App.tsx` (adicionar rota)
