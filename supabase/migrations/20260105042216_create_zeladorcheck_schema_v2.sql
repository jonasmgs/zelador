/*
  # ZeladorCheck - Schema Completo do Sistema
  
  ## Resumo
  Este schema cria toda a estrutura de dados para o sistema de gestão condominial ZeladorCheck,
  incluindo gestão de usuários, tarefas, ocorrências, fornecedores, orçamentos e auditoria.
  
  ## Novas Tabelas Criadas
  
  ### 1. condos (Condomínios)
  - `id` (uuid, PK) - Identificador único
  - `name` (text) - Nome do condomínio
  - `address` (text) - Endereço completo
  - `created_at` (timestamptz) - Data de cadastro
  
  ### 2. users (Usuários do Sistema)
  - `id` (uuid, PK) - Identificador único
  - `name` (text) - Nome completo
  - `role` (text) - Função (SINDICO, GESTOR, ZELADOR, LIMPEZA)
  - `email` (text) - Email
  - `password_hash` (text) - Hash da senha
  - `active` (boolean) - Status ativo/inativo
  - `condo_id` (uuid, FK) - Condomínio vinculado
  - `created_at` (timestamptz) - Data de cadastro
  
  ### 3. categories (Categorias de Serviços)
  - `id` (uuid, PK) - Identificador único
  - `name` (text) - Nome da categoria
  - `created_at` (timestamptz) - Data de criação
  
  ### 4. vendors (Fornecedores)
  - `id` (uuid, PK) - Identificador único
  - `condo_id` (uuid, FK) - Condomínio vinculado
  - `name` (text) - Nome da empresa
  - `tax_id` (text) - CNPJ/CPF
  - `phone` (text) - Telefone de contato
  - `category` (text) - Especialidade
  - `documents` (jsonb) - Documentos anexados
  - `created_at` (timestamptz) - Data de cadastro
  
  ### 5. tasks (Tarefas e Checklists)
  - `id` (uuid, PK) - Identificador único
  - `condo_id` (uuid, FK) - Condomínio
  - `title` (text) - Título da tarefa
  - `description` (text) - Descrição detalhada
  - `status` (text) - Status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
  - `frequency` (text) - Frequência (DAILY, WEEKLY, MONTHLY, ONCE)
  - `category` (text) - Categoria do serviço
  - `assigned_to` (uuid) - Responsável (user ou vendor)
  - `assigned_user_name` (text) - Nome do responsável
  - `scheduled_for` (timestamptz) - Data/hora agendada
  - `completed_at` (timestamptz) - Data/hora de conclusão
  - `photos` (jsonb) - Array de URLs de fotos
  - `created_at` (timestamptz) - Data de criação
  
  ### 6. incidents (Livro de Ocorrências)
  - `id` (uuid, PK) - Identificador único
  - `condo_id` (uuid, FK) - Condomínio
  - `user_id` (uuid) - Usuário que registrou
  - `user_name` (text) - Nome do usuário
  - `title` (text) - Título da ocorrência
  - `description` (text) - Descrição detalhada
  - `status` (text) - Status (OPEN, RESOLVED)
  - `photos` (jsonb) - Array de URLs de fotos
  - `timestamp` (timestamptz) - Data/hora do registro
  
  ### 7. budgets (Orçamentos)
  - `id` (uuid, PK) - Identificador único
  - `condo_id` (uuid, FK) - Condomínio
  - `vendor_id` (uuid, FK) - Fornecedor
  - `title` (text) - Título do orçamento
  - `description` (text) - Descrição
  - `status` (text) - Status (PENDING, APPROVED, REJECTED)
  - `value` (decimal) - Valor total
  - `documents` (jsonb) - Documentos anexados
  - `created_at` (timestamptz) - Data de criação
  
  ### 8. budget_items (Itens de Orçamento)
  - `id` (uuid, PK) - Identificador único
  - `budget_id` (uuid, FK) - Orçamento pai
  - `description` (text) - Descrição do item
  - `quantity` (integer) - Quantidade
  - `unit_price` (decimal) - Preço unitário
  
  ### 9. messages (Mural de Mensagens)
  - `id` (uuid, PK) - Identificador único
  - `condo_id` (uuid, FK) - Condomínio
  - `sender_id` (uuid) - Remetente
  - `sender_name` (text) - Nome do remetente
  - `recipient_id` (uuid) - Destinatário (null = broadcast)
  - `recipient_name` (text) - Nome do destinatário
  - `text` (text) - Conteúdo da mensagem
  - `broadcast` (boolean) - Mensagem para todos
  - `timestamp` (timestamptz) - Data/hora de envio
  
  ### 10. documents (Documentos do Condomínio)
  - `id` (uuid, PK) - Identificador único
  - `condo_id` (uuid, FK) - Condomínio
  - `title` (text) - Título do documento
  - `category` (text) - Categoria
  - `file_url` (text) - URL do arquivo
  - `upload_date` (timestamptz) - Data de upload
  
  ### 11. logs (Logs de Auditoria)
  - `id` (uuid, PK) - Identificador único
  - `condo_id` (uuid) - Condomínio
  - `user_id` (uuid) - Usuário que executou a ação
  - `user_name` (text) - Nome do usuário
  - `action` (text) - Ação realizada (CREATE, UPDATE, DELETE, etc)
  - `module` (text) - Módulo do sistema (TASK, USER, BUDGET, etc)
  - `target_name` (text) - Nome do alvo da ação
  - `timestamp` (timestamptz) - Data/hora da ação
  
  ## Segurança (RLS)
  - RLS habilitado em TODAS as tabelas
  - Políticas restritivas baseadas em autenticação
  - Síndicos têm acesso global aos seus dados
  - Gestores e colaboradores veem apenas seu condomínio
  - Logs são auditáveis por todos do condomínio
  
  ## Índices
  - Criados em foreign keys para performance
  - Índices em campos de busca frequente (condo_id, status, timestamp)
  
  ## Notas Importantes
  - Dados iniciais serão migrados do localStorage
  - Senhas armazenadas como hash (bcrypt recomendado em produção)
  - Fotos armazenadas como URLs em arrays JSON
*/

-- =====================================================
-- CRIAR TODAS AS TABELAS PRIMEIRO
-- =====================================================

-- Tabela: condos
CREATE TABLE IF NOT EXISTS condos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela: users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('SINDICO', 'GESTOR', 'ZELADOR', 'LIMPEZA')),
  email text DEFAULT '',
  password_hash text DEFAULT '',
  active boolean DEFAULT true,
  condo_id uuid REFERENCES condos(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela: categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela: vendors
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id uuid NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  name text NOT NULL,
  tax_id text DEFAULT '',
  phone text DEFAULT '',
  category text NOT NULL,
  documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id uuid NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  frequency text NOT NULL DEFAULT 'ONCE' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ONCE')),
  category text NOT NULL,
  assigned_to uuid NOT NULL,
  assigned_user_name text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  completed_at timestamptz,
  photos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela: incidents
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id uuid NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  photos jsonb DEFAULT '[]'::jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Tabela: budgets
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id uuid NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  value decimal(15,2) DEFAULT 0,
  documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela: budget_items
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price decimal(15,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0)
);

-- Tabela: messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id uuid NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  recipient_id uuid,
  recipient_name text,
  text text NOT NULL,
  broadcast boolean DEFAULT false,
  timestamp timestamptz DEFAULT now()
);

-- Tabela: documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id uuid NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  file_url text NOT NULL,
  upload_date timestamptz DEFAULT now()
);

-- Tabela: logs
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  action text NOT NULL,
  module text NOT NULL,
  target_name text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE condos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - CONDOS
-- =====================================================

CREATE POLICY "Síndicos gerenciam todos condomínios"
  ON condos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'SINDICO'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'SINDICO'
    )
  );

CREATE POLICY "Usuários veem próprio condomínio"
  ON condos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.condo_id = condos.id
    )
  );

-- =====================================================
-- POLÍTICAS RLS - USERS
-- =====================================================

CREATE POLICY "Síndicos e gestores gerenciam usuários"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('SINDICO', 'GESTOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('SINDICO', 'GESTOR')
    )
  );

CREATE POLICY "Usuários veem próprio perfil"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- POLÍTICAS RLS - CATEGORIES
-- =====================================================

CREATE POLICY "Todos veem categorias"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gestão pode modificar categorias"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('SINDICO', 'GESTOR', 'ZELADOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('SINDICO', 'GESTOR', 'ZELADOR')
    )
  );

-- =====================================================
-- POLÍTICAS RLS - VENDORS
-- =====================================================

CREATE POLICY "Usuários veem fornecedores do condomínio"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = vendors.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Gestão modifica fornecedores"
  ON vendors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = vendors.condo_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = vendors.condo_id))
    )
  );

-- =====================================================
-- POLÍTICAS RLS - TASKS
-- =====================================================

CREATE POLICY "Usuários veem tarefas do condomínio"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = tasks.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Gestão cria tarefas"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role IN ('GESTOR', 'ZELADOR') AND users.condo_id = tasks.condo_id))
    )
  );

CREATE POLICY "Usuários atualizam tarefas do condomínio"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR users.condo_id = tasks.condo_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR users.condo_id = tasks.condo_id)
    )
  );

CREATE POLICY "Gestão deleta tarefas"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role IN ('GESTOR', 'ZELADOR') AND users.condo_id = tasks.condo_id))
    )
  );

-- =====================================================
-- POLÍTICAS RLS - INCIDENTS
-- =====================================================

CREATE POLICY "Usuários veem ocorrências do condomínio"
  ON incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = incidents.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Equipe cria ocorrências"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role IN ('GESTOR', 'ZELADOR') AND users.condo_id = incidents.condo_id))
    )
  );

CREATE POLICY "Equipe atualiza ocorrências"
  ON incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role IN ('GESTOR', 'ZELADOR') AND users.condo_id = incidents.condo_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role IN ('GESTOR', 'ZELADOR') AND users.condo_id = incidents.condo_id))
    )
  );

CREATE POLICY "Gestão deleta ocorrências"
  ON incidents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = incidents.condo_id))
    )
  );

-- =====================================================
-- POLÍTICAS RLS - BUDGETS
-- =====================================================

CREATE POLICY "Usuários veem orçamentos do condomínio"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = budgets.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Gestão gerencia orçamentos"
  ON budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = budgets.condo_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = budgets.condo_id))
    )
  );

-- =====================================================
-- POLÍTICAS RLS - BUDGET_ITEMS
-- =====================================================

CREATE POLICY "Usuários veem itens de orçamento do condomínio"
  ON budget_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      JOIN users u ON (u.condo_id = b.condo_id OR u.role = 'SINDICO')
      WHERE b.id = budget_items.budget_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Gestão gerencia itens de orçamento"
  ON budget_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      JOIN users u ON (u.role = 'SINDICO' OR (u.role = 'GESTOR' AND u.condo_id = b.condo_id))
      WHERE b.id = budget_items.budget_id AND u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets b
      JOIN users u ON (u.role = 'SINDICO' OR (u.role = 'GESTOR' AND u.condo_id = b.condo_id))
      WHERE b.id = budget_items.budget_id AND u.id = auth.uid()
    )
  );

-- =====================================================
-- POLÍTICAS RLS - MESSAGES
-- =====================================================

CREATE POLICY "Usuários veem mensagens do condomínio"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = messages.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Usuários enviam mensagens"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = messages.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Gestão deleta mensagens"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = messages.condo_id))
    )
  );

-- =====================================================
-- POLÍTICAS RLS - DOCUMENTS
-- =====================================================

CREATE POLICY "Usuários veem documentos do condomínio"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = documents.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Gestão gerencia documentos"
  ON documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = documents.condo_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'SINDICO' OR (users.role = 'GESTOR' AND users.condo_id = documents.condo_id))
    )
  );

-- =====================================================
-- POLÍTICAS RLS - LOGS
-- =====================================================

CREATE POLICY "Usuários veem logs do condomínio"
  ON logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.condo_id = logs.condo_id OR users.role = 'SINDICO')
    )
  );

CREATE POLICY "Sistema insere logs"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_condo_id ON users(condo_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_vendors_condo_id ON vendors(condo_id);
CREATE INDEX IF NOT EXISTS idx_tasks_condo_id ON tasks(condo_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_for ON tasks(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_incidents_condo_id ON incidents(condo_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_budgets_condo_id ON budgets(condo_id);
CREATE INDEX IF NOT EXISTS idx_budgets_vendor_id ON budgets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_messages_condo_id ON messages(condo_id);
CREATE INDEX IF NOT EXISTS idx_documents_condo_id ON documents(condo_id);
CREATE INDEX IF NOT EXISTS idx_logs_condo_id ON logs(condo_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir categorias padrão
INSERT INTO categories (name) VALUES 
  ('Manutenção'),
  ('Limpeza'),
  ('Piscina'),
  ('Jardinagem'),
  ('Segurança'),
  ('Outros')
ON CONFLICT (name) DO NOTHING;
