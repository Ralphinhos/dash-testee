import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coordinator } from '../types'; 
import { User, Lock } from 'lucide-react'; // Importar ícones

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);

  useEffect(() => {
    // console.log("[Login.tsx] Tentando carregar coordinatorsData do localStorage."); // Log pode ser removido se não mais necessário para depuração
    const storedCoordinators = localStorage.getItem('coordinatorsData');
    if (storedCoordinators) {
      try {
        const parsedCoordinators = JSON.parse(storedCoordinators);
        if (Array.isArray(parsedCoordinators)) {
          setCoordinators(parsedCoordinators);
          // console.log("[Login.tsx] coordinatorsData carregado e parseado com sucesso:", parsedCoordinators); // Log pode ser removido
        } else {
          console.error("[Login.tsx] Erro: coordinatorsData do localStorage não é um array:", parsedCoordinators);
          setError("Erro crítico: Formato inválido dos dados de configuração (não é array).");
        }
      } catch (e) {
        console.error("[Login.tsx] Erro ao fazer parse de coordinatorsData do localStorage:", e);
        setError("Erro crítico ao carregar dados de configuração (JSON inválido).");
      }
    } else {
      console.warn("[Login.tsx] 'coordinatorsData' não encontrado no localStorage. Aguardando App.tsx popular.");
      setError("Configuração de coordenadores ainda não carregada. Se persistir, recarregue.");
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
        // console.log("[Login.tsx] localStorage mudou, tentando recarregar coordinatorsData."); // Log pode ser removido
        const storedCoordinators = localStorage.getItem('coordinatorsData');
        if (storedCoordinators) {
            try {
                const parsedCoordinators = JSON.parse(storedCoordinators);
                if (Array.isArray(parsedCoordinators)) {
                    setCoordinators(parsedCoordinators);
                    setError(''); 
                    // console.log("[Login.tsx] coordinatorsData recarregado via storage event."); // Log pode ser removido
                }
            } catch (e) {
                console.error("[Login.tsx] Erro no parse durante storage event:", e);
            }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogin = () => {
    setError('');
    const trimmedUsername = username.trim(); // Não converter para minúsculas ainda, admin pode ser case-sensitive
    const adminUsernameEnv = import.meta.env.VITE_ADMIN_USERNAME;
    const adminPasswordEnv = import.meta.env.VITE_ADMIN_PASSWORD;

    // Logs para depuração
    console.log("Tentativa de login com:", trimmedUsername, password);
    console.log("Credenciais de Admin do .env:", adminUsernameEnv, adminPasswordEnv);
    console.log("Comparação Username Admin:", trimmedUsername === adminUsernameEnv);
    console.log("Comparação Senha Admin:", password === adminPasswordEnv);

    // 1. Verificar credenciais de Admin
    if (trimmedUsername === adminUsernameEnv && password === adminPasswordEnv) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('loggedInCoordinator', 'Administrador'); // Nome a ser exibido na Sidebar
      // Limpar dados específicos de coordenador, caso existam de um login anterior
      localStorage.removeItem('loggedInCoordinatorUsername');
      localStorage.removeItem('coordinatorCourses');
      navigate('/');
      return;
    }

    // 2. Se não for Admin, verificar Coordenadores (convertendo username para minúsculas para a busca)
    const lowercasedTrimmedUsername = trimmedUsername.toLowerCase();
    const coordinator = coordinators.find(c => c.username.toLowerCase() === lowercasedTrimmedUsername);

    if (coordinator) {
      if (coordinator.password && password === coordinator.password) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'coordinator');
        localStorage.setItem('loggedInCoordinator', coordinator.fullName);
        localStorage.setItem('loggedInCoordinatorUsername', coordinator.username);
        localStorage.setItem('coordinatorCourses', JSON.stringify(coordinator.courses));
        // Limpar userRole se for de admin
        // localStorage.removeItem('userRole'); // Não é necessário, pois já setamos para 'coordinator'
        navigate('/');
      } else if (!coordinator.password) {
        setError('Configuração de senha para este coordenador não encontrada.');
      } else {
        setError('Senha inválida.');
      }
    } else {
      // Se não encontrou nem admin nem coordenador
      if (coordinators.length === 0 && !error.startsWith("Erro crítico")) {
        setError('Dados de configuração de coordenadores não disponíveis. Tente novamente em instantes.');
      } else { // Pode ser que coordinators.length > 0 mas o usuário não foi encontrado, ou era o admin com senha errada
        setError('Usuário ou senha inválidos.');
      }
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
    const isButtonDisabled = coordinators.length === 0 && !error.startsWith("Erro crítico");
    if (!isButtonDisabled) {
        handleLogin();
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#0f172a] text-gray-200">
      <div className="p-8 bg-[#020617] rounded-lg shadow-xl w-96">
        <div className="flex justify-center mb-8"> {/* Contêiner para a logo */}
          <img src="/logo_branca.png" alt="Logo Unifenas" className="h-20 w-auto" /> {/* Logo adicionada */}
        </div>
        
        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative"> {/* Contêiner para input e ícone */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="username-input"
              type="text"
              placeholder="Login"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 pl-10 bg-[#1e293b] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" // Adicionado pl-10 para padding à esquerda do ícone
              autoFocus
            />
          </div>
          <div className="relative"> {/* Contêiner para input e ícone */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password-input"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pl-10 bg-[#1e293b] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" // Adicionado pl-10
            />
          </div>
          <button
            type="submit"
            disabled={coordinators.length === 0 && !error.startsWith("Erro crítico")} 
            className="w-full p-3 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white font-semibold transition-colors disabled:bg-gray-500 disabled:opacity-70"
          >
            Entrar
          </button>
        </form>
        {error.startsWith("Erro crítico") && 
            <p className="mt-4 text-xs text-amber-500 text-center">
              Por favor, tente limpar o cache e recarregar a página, ou contate o suporte se o problema persistir.
            </p> 
        }
      </div>
    </div>
  );
};