
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/db';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e?: React.FormEvent, customName?: string, customPass?: string) => {
    if (e) e.preventDefault();
    
    const targetName = customName || username;
    const targetPass = customPass || password;

    setIsLoading(true);
    setError('');

    if (targetName.trim().length < 3) {
      setError('Insira um nome de usuário válido.');
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      const users = db.getUsers();
      // Procura pelo nome ignorando case para facilitar
      const user = users.find(u => u.name.toLowerCase() === targetName.toLowerCase());

      const isPasswordValid = user && (user.password === targetPass);

      if (user && isPasswordValid) {
        onLogin(user);
      } else {
        setError('Usuário ou senha incorretos.');
      }
      setIsLoading(false);
    }, 600);
  };

  const quickLogin = (role: string) => {
    let qName = '';
    const qPass = '123';

    switch(role) {
      case 'SINDICO': qName = 'Ricardo Alencar'; break;
      case 'GESTOR': qName = 'Mariana Costa'; break;
      case 'ZELADOR': qName = 'João Silva'; break;
      case 'LIMPEZA': qName = 'Marcos Souza'; break;
    }

    setUsername(qName);
    setPassword(qPass);
    handleLogin(undefined, qName, qPass);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (username.trim().length < 3) {
      setError('O nome deve conter pelo menos 3 caracteres.');
      setIsLoading(false);
      return;
    }
    
    setTimeout(() => {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: username,
        role: UserRole.SINDICO,
        email: '',
        password: password,
        active: true
      };
      
      db.saveUser(newUser);
      onLogin(newUser);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-4">
            <span className="text-2xl font-bold text-white tracking-tighter">ZC</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ZeladorCheck</h1>
          <p className="text-slate-500 mt-2">Gestão inteligente para o seu condomínio</p>
        </div>

        <div className="bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center mb-6 animate-in slide-in-from-top-2 duration-300">
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            {!isRegistering ? (
              <div className="space-y-8">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome de Usuário</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João Silva"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50 font-medium"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError('');
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-700">Senha</label>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50 font-medium"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? 'Acessando...' : 'Entrar no Sistema'}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                    <span className="px-4 bg-white text-slate-400">Acesso Rápido</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => quickLogin('SINDICO')}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-purple-100 transition-all active:scale-95"
                  >
                    <span>👑</span>
                    <span>Síndico</span>
                  </button>
                  <button 
                    onClick={() => quickLogin('GESTOR')}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-100 transition-all active:scale-95"
                  >
                    <span>💼</span>
                    <span>Gestor</span>
                  </button>
                  <button 
                    onClick={() => quickLogin('ZELADOR')}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-100 transition-all active:scale-95"
                  >
                    <span>🛠️</span>
                    <span>Zelador</span>
                  </button>
                  <button 
                    onClick={() => quickLogin('LIMPEZA')}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 transition-all active:scale-95"
                  >
                    <span>🧹</span>
                    <span>Limpeza</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Novo Síndico</h2>
                  <p className="text-xs text-slate-500">Defina seu nome de acesso e senha</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Seu Nome de Usuário</label>
                  <input
                    type="text" required placeholder="Ex: Roberto Gomes"
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium"
                    value={username} onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError('');
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Sua Senha</label>
                  <input
                    type="password" required placeholder="Definir Senha"
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium"
                    value={password} onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] mt-4"
                >
                  Criar Conta de Síndico
                </button>
              </form>
            )}
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
             {!isRegistering ? (
               <button 
                 onClick={() => {
                   setIsRegistering(true);
                   setError('');
                 }}
                 className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
               >
                 Novo Síndico? Cadastre-se aqui
               </button>
             ) : (
               <button 
                 onClick={() => {
                   setIsRegistering(false);
                   setError('');
                 }}
                 className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest"
               >
                 Já tenho conta, voltar ao login
               </button>
             )}
          </div>
        </div>
        
        <p className="text-center text-slate-400 text-[10px] mt-8 font-bold uppercase tracking-widest">
          &copy; 2024 ZeladorCheck SaaS • Auditoria & Checklist
        </p>
      </div>
    </div>
  );
};

export default Login;
