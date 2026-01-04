
# ZeladorCheck Backend - Node.js + Express + Supabase

Este é o backend do sistema SaaS ZeladorCheck, responsável por gerenciar a autenticação, checklists de zeladoria e logs de auditoria utilizando Supabase.

## 🚀 Como Configurar o Supabase

1.  **Crie uma conta**: Acesse [supabase.com](https://supabase.com) e crie um projeto.
2.  **Configuração de Banco de Dados**:
    *   Vá em **SQL Editor**.
    *   Copie e cole o conteúdo do arquivo `supabase_schema.sql` (na raiz do projeto).
    *   Execute o script para criar as tabelas necessárias.
3.  **Pegar Credenciais**:
    *   Vá em **Project Settings > API**.
    *   Copie a `Project URL` e a `service_role key` (ou `anon key`, mas `service_role` é recomendada para o backend).

## 🛠️ Como Rodar o Backend

1.  **Pré-requisitos**: Ter Node.js instalado.
2.  **Instalação**: No terminal da pasta `server`, execute:
    ```bash
    npm install express cors dotenv jsonwebtoken @supabase/supabase-js
    ```
3.  **Variáveis de Ambiente**: Crie um arquivo `.env` na pasta `server` com:
    ```env
    PORT=3000
    SUPABASE_URL=https://sua-url.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=sua-chave-secreta
    JWT_SECRET=zelador_check_secret_2024
    ```
4.  **Executar**:
    ```bash
    node index.js
    ```

## 📡 Exemplos de Requisições (JSON)

### Login
**POST** `/api/auth/login`
```json
{
  "email": "zelador@zc.com",
  "password": "123"
}
```

### Criar Tarefa (Requer Token no Header Authorization)
**POST** `/api/checklists`
```json
{
  "title": "Limpeza da Piscina",
  "description": "Limpar filtros e aspirar fundo",
  "category": "Limpeza",
  "scheduled_for": "2024-10-25T10:00:00Z",
  "assigned_to": "uuid-do-zelador"
}
```

## 📂 Estrutura de Pastas
- `index.js`: Inicialização do servidor Express.
- `supabase.js`: Cliente de conexão com o banco na nuvem.
- `middleware/auth.js`: Validador de sessões.
- `routes/`: Definição dos endpoints da API.
