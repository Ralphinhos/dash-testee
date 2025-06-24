import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Login } from "./components/Login";
import { LoadingScreen } from './components/LoadingScreen'; // Importar LoadingScreen
import { Coordinator } from './types'; // Importar Coordinator

const queryClient = new QueryClient();
const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? element : <Navigate to="/login" />;
};

const App = () => {
  const [coordinatorsInitialized, setCoordinatorsInitialized] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[App.tsx] Iniciando carregamento de dados de configuração...");
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js";
    script.async = true;
    script.onload = () => {
      console.log("[App.tsx] PapaParse carregado. Buscando dados da planilha para coordenadores...");
      window.Papa.parse(GOOGLE_SHEET_URL, {
        download: true, header: true, skipEmptyLines: true,
        complete: (results: any) => {
          console.log("[App.tsx] Dados da planilha recebidos para processamento de coordenadores.");
          const rawData = results.data;
          const processedCoordinatorsMap: Record<string, { fullName: string, courses: string[], password?: string }> = {};

          rawData.forEach((row: any) => {
            const loginUsername = row['Login']?.trim();
            const coordinatorFullName = row['Coordenador']?.trim();
            const course = row['Curso']?.trim();
            const password = row['Senha']?.trim();

            if (loginUsername && coordinatorFullName) {
              if (!processedCoordinatorsMap[loginUsername]) {
                processedCoordinatorsMap[loginUsername] = { fullName: coordinatorFullName, courses: [], password: password };
              } else {
                if (password && !processedCoordinatorsMap[loginUsername].password) {
                  processedCoordinatorsMap[loginUsername].password = password;
                }
                if (coordinatorFullName && !processedCoordinatorsMap[loginUsername].fullName) {
                  processedCoordinatorsMap[loginUsername].fullName = coordinatorFullName;
                }
              }
              if (course && !processedCoordinatorsMap[loginUsername].courses.includes(course)) {
                processedCoordinatorsMap[loginUsername].courses.push(course);
              }
            }
          });

          const coordinatorsArray: Coordinator[] = Object.entries(processedCoordinatorsMap)
            .map(([username, data]) => ({
              username,
              fullName: data.fullName,
              courses: data.courses,
              password: data.password
            }));

          if (coordinatorsArray.length > 0) {
            localStorage.setItem('coordinatorsData', JSON.stringify(coordinatorsArray));
            console.log("[App.tsx] 'coordinatorsData' salvo no localStorage.");
            setCoordinatorsInitialized(true);
          } else {
            console.warn("[App.tsx] Nenhum coordenador processado da planilha.");
            setAppError("Nenhum dado de coordenador encontrado na configuração inicial.");
          }
          setAppLoading(false);
        },
        error: (err: any) => {
          console.error("[App.tsx] Erro ao carregar/processar dados da planilha para coordenadores:", err);
          setAppError("Falha ao carregar configuração inicial de coordenadores. Verifique o console.");
          setAppLoading(false);
        }
      });
    };
    script.onerror = () => {
      console.error("[App.tsx] Falha CRÍTICA ao carregar PapaParse.");
      setAppError("Erro crítico ao carregar dependências da aplicação (PapaParse).");
      setAppLoading(false);
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  if (appLoading) {
    return <LoadingScreen message="Carregando configuração da aplicação..." />;
  }

  if (appError) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-100 text-red-700">
        <div>
          <h1 className="text-2xl font-bold mb-4">Erro na Aplicação</h1>
          <p>{appError}</p>
          <p>Por favor, verifique o console para mais detalhes e tente recarregar a página. Se o problema persistir, contate o suporte.</p>
        </div>
      </div>
    );
  }

  if (!coordinatorsInitialized && !appError) {
    // Segurança adicional: se não estiver carregando e não houver erro, mas os coordenadores não foram inicializados.
    // Isso não deveria acontecer se a lógica acima estiver correta.
     return <LoadingScreen message="Inicializando configuração de coordenadores..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute element={<Index />} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
