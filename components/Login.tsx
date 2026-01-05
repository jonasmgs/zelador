
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
      case 'PORTEIRO': qName = 'Carlos Porteiro'; break;
    }

    setUsername(qName);
    setPassword(qPass);
    handleLogin(undefined, qName, qPass);
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
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center mb-6">
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <input type="text" placeholder="Nome de Usuário" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-medium" value={username} onChange={(e) => setUsername(e.target.value)} />
              <input type="password" placeholder="Senha" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-medium" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl">Entrar</button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="px-4 bg-white text-slate-400">Acesso Rápido</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['SINDICO', 'GESTOR', 'ZELADOR', 'LIMPEZA', 'PORTEIRO'].map(role => (
                <button key={role} onClick={() => quickLogin(role)} className="p-3 bg-slate-50 hover:bg-blue-50 text-[9px] font-black uppercase rounded-xl border border-slate-100 transition-all">
                  {role === 'PORTEIRO' ? '💂' : role === 'SINDICO' ? '👑' : role === 'GESTOR' ? '💼' : role === 'ZELADOR' ? '🛠️' : '🧹'} {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
