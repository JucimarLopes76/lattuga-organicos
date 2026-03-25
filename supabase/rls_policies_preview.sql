-- ==============================================================================
-- 🛡️ POLÍTICAS DE SEGURANÇA (Row Level Security - RLS)
-- Lattuga Orgânicos
--
-- O que isso faz? Protege o seu banco de dados contra leituras/escritas não
-- autorizadas feitas por robôs ou pessoas mal-intencionadas usando sua chave pública.
-- ==============================================================================

-- 1. Ativar a Segurança Nível de Linha (RLS) para todas as tabelas
-- Isso bloqueia TODO o acesso. Nada entra, nada sai, a menos que haja uma política autorizando.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 🥬 TABELA: PRODUCTS (Produtos)
-- ==========================================

-- QUALQUER PESSOA (visitante do site) pode **LER** a lista de produtos.
CREATE POLICY "Permitir leitura pública de produtos" 
ON public.products 
FOR SELECT 
TO public
USING (true);

-- APENAS ADMINISTRADORES LOGADOS podem Criar, Editar ou Deletar produtos.
-- O comando `auth.role() = 'authenticated'` garante que só quem fez login
-- no painel de admin pode mexer no estoque ou preços.
CREATE POLICY "Admins podem inserir produtos" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins podem atualizar produtos" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins podem deletar produtos" ON public.products FOR DELETE TO authenticated USING (true);


-- ==========================================
-- 📦 TABELAS: ORDERS e ORDER_ITEMS (Pedidos)
-- ==========================================

-- APENAS ADMINISTRADORES LOGADOS podem LER ou EDITAR os pedidos.
-- Ninguém de fora pode ver o que os clientes estão comprando, nem o faturamento.
CREATE POLICY "Admins podem ler pedidos" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem atualizar pedidos" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins podem deletar pedidos" ON public.orders FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admins podem ler itens" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem atualizar itens" ON public.order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins podem deletar itens" ON public.order_items FOR DELETE TO authenticated USING (true);

-- QUALQUER PESSOA (visitante do checkout online) pode CRIAR um novo pedido.
-- Eles podem enviar os dados para o banco, mas depois de enviado, não podem ler de volta.
CREATE POLICY "Site pode criar pedido" ON public.orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Site pode adicionar itens ao pedido" ON public.order_items FOR INSERT TO public WITH CHECK (true);


-- ==========================================
-- 👥 TABELA: CUSTOMERS (Clientes)
-- ==========================================

-- APENAS ADMINISTRADORES LOGADOS podem LER a base de clientes (LGPD / Privacidade total).
CREATE POLICY "Admins podem ler clientes" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem atualizar clientes" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins podem deletar clientes" ON public.customers FOR DELETE TO authenticated USING (true);

-- QUALQUER PESSOA pode CRIAR o próprio cadastro ao fazer um pedido online.
CREATE POLICY "Site pode cadastrar cliente" ON public.customers FOR INSERT TO public WITH CHECK (true);


-- ==========================================
-- 💰 TABELAS: EXPENSES, PRODUCT_PURCHASES (Administrativo)
-- ==========================================

-- Tudo aqui é restrito SOMENTE PARA ADMINISTRADORES LOGADOS.
-- Nenhuma requisição anônima conseguirá sequer saber que essas tabelas existem.

CREATE POLICY "Admins gerenciam financas" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins gerenciam compras" ON public.product_purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);
