

## Consolidar Despesas Duplicadas

### 1. Prevenir duplicatas futuras — Edge Function

**Arquivo:** `supabase/functions/process-document/index.ts`

Antes de inserir nova despesa, buscar existente com mesmo `user_id` + `estabelecimento` + `emissao_mes_ano`:
- **Se encontrar:** somar `valor_total` e vincular documento à despesa existente
- **Se não encontrar:** criar normalmente

Também adicionar lógica para identificar parcelamentos (mesmo estabelecimento, meses consecutivos) vinculando ao mesmo grupo.

### 2. Consolidar duplicatas existentes — ExpensesPage

**Arquivo:** `src/pages/ExpensesPage.tsx`

Adicionar botão "Consolidar duplicatas" que:
- Agrupa despesas por `estabelecimento` + `emissao_mes_ano`
- Para grupos com >1 despesa: mantém a mais antiga, soma valores, move documentos, exclui as demais
- Exibe toast com contagem de consolidações

### 3. Atualizar geração manual — DocumentsPage

**Arquivo:** `src/pages/DocumentsPage.tsx`

No `handleGenerateExpenses`, antes de inserir: buscar despesa existente para mesmo estabelecimento+mês. Se existir, somar valor e vincular documento ao invés de criar nova.

### Resumo de arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/process-document/index.ts` | Busca despesa existente antes de criar |
| `src/pages/ExpensesPage.tsx` | Botão consolidar + lógica de merge |
| `src/pages/DocumentsPage.tsx` | Reusar despesas em geração manual |

