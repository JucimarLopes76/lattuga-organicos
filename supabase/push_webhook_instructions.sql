-- Configurando o Webhook (Trigger) que disparará a Edge Function 'send-order-push' 
-- sempre que um pedido for inserido na tabela orders

-- Habilita reqs http via db se usar pg_net, mas com supabase no projeto:
-- usar Supabase origin hooks é mais fácil, mas para migração sql manual via Dashboard, 
-- daremos a instrução para criar no Dashboard (Webhook) com a UI do Supabase 
-- pois criar "pg_net" trigger em SQL cru sem as chaves da Cloud é complexo e não escalável sem o dashboard.

-- Um aviso/metadata apenas:
-- "Para ativar esse trigger de verdade, recomente-se ativar via:
-- Supabase Dashboard -> Database -> Webhooks -> Create Webhook
-- Table: orders
-- Events: Insert
-- Type: Supabase Edge Function
-- Method: POST
-- Edge Function: send-order-push
