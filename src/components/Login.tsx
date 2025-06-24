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
    // Carrega os dados dos coordenadores do localStorage
    const storedCoordinators = localStorage.getItem('coordinatorsData');
    if (storedCoordinators) {
      setCoordinators(JSON.parse(storedCoordinators));
    } else {
      // Idealmente, deveria haver um fallback ou um recarregamento dos dados aqui
      // Por ora, vamos apenas logar um erro se não encontrar.
      console.error("Dados dos coordenadores não encontrados no localStorage.");
      setError("Erro ao carregar dados de configuração. Tente recarregar a página.");
    }
  }, []);

  const handleLogin = () => {
    setError(''); 
    const trimmedUsername = username.trim().toLowerCase();
    // Deve ser coordinator.username para bater com a interface Coordinator
    const coordinator = coordinators.find(c => c.username.toLowerCase() === trimmedUsername);

    if (coordinator) {
      if (coordinator.password && password === coordinator.password) {
        localStorage.setItem('isLoggedIn', 'true');
        // Armazena o fullName para exibição
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
        <h2 className="text-2xl font-bold text-center text-white mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nome do Coordenador"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-[#1e293b] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="password"
            placeholder="Senha"
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
