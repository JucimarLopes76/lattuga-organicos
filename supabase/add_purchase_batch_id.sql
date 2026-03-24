-- Executar este SQL no SQL Editor do Supabase (Opção SQL Editor na barra lateral esquerda -> New Query)
-- Esse script adiciona as colunas necessárias para o rastreio das compras nos detalhes do Financeiro

-- 1. Tabela de Registros de Compras de Produtos
ALTER TABLE public.product_purchases 
ADD COLUMN IF NOT EXISTS batch_id UUID null;

-- 2. Tabela de Despesas Financeiras
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS purchase_batch_id UUID null;
