import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coordinator } from '../types'; // Import Coordinator type

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);

  useEffect(() => {
    const storedCoordinators = localStorage.getItem('coordinatorsData');
    if (storedCoordinators) {
      try {
        const parsedCoordinators = JSON.parse(storedCoordinators);
        // Validação adicional para garantir que é um array
        if (Array.isArray(parsedCoordinators)) {
          setCoordinators(parsedCoordinators);
        } else {
          console.error("Dados de coordenadores no localStorage não são um array:", parsedCoordinators);
          setError("Erro crítico: Formato inválido dos dados de configuração (não é um array).");
          localStorage.removeItem('coordinatorsData'); // Limpa dados inválidos
        }
      } catch (e) {
        console.error("Erro ao fazer parse dos dados dos coordenadores do localStorage:", e);
        setError("Erro crítico ao carregar dados de configuração (JSON inválido). Verifique o console e limpe o localStorage se necessário.");
        // Opcionalmente, limpar o item problemático para tentar uma recarga limpa na próxima vez:
        localStorage.removeItem('coordinatorsData');
      }
    } else {
      console.warn("Dados dos coordenadores não encontrados no localStorage. A aplicação pode não funcionar corretamente até que os dados sejam carregados em Index.tsx.");
      // Não definir erro aqui necessariamente, pois Index.tsx pode estar prestes a populá-lo.
      // A página de login ainda deve ser exibida.
    }
  }, []);

  const handleLogin = () => {
    setError('');
    // Busca pelo 'username' (formato: ana.tomaz) que deve ser case-insensitive na comparação do input,
    // mas o dado original em `coordinator.username` já deve estar no formato correto.
    const trimmedUsername = username.trim().toLowerCase();
    const coordinator = coordinators.find(c => c.username.toLowerCase() === trimmedUsername);

    if (coordinator) {
      // Comparação de senha é case-sensitive
      if (coordinator.password && password === coordinator.password) {
        localStorage.setItem('isLoggedIn', 'true');
        // Armazena o fullName para exibição, mas o username (login) foi usado para a busca
        localStorage.setItem('loggedInCoordinator', coordinator.fullName);
        localStorage.setItem('coordinatorCourses', JSON.stringify(coordinator.courses));
        navigate('/');
      } else if (!coordinator.password) {
        setError('Configuração de senha para este coordenador não encontrada. Contate o administrador.');
      }
      else {
        setError('Senha inválida.');
      }
    } else {
      setError('Usuário (Login) não encontrado.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#0f172a] text-gray-200">
      <div className="p-8 bg-[#020617] rounded-lg shadow-xl w-96">
        <h2 className="text-2xl font-bold text-center text-white mb-6">Login Coordenador</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Login (ex: nome.sobrenome)" // Placeholder atualizado
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-[#1e293b] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="password"
            placeholder="Senha" // Placeholder da senha simplificado
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-[#1e293b] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={handleLogin}
            disabled={coordinators.length === 0} // Desabilita o botão se os coordenadores não carregaram
            className="w-full p-3 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white font-semibold transition-colors disabled:bg-gray-500"
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
};
