import { useState, useEffect, useCallback, useRef } from 'react';

const useIdleTimer = (timeout: number, onIdle: () => void) => {
  const [isIdle, setIsIdle] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setIsIdle(false);
    timer.current = setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, timeout);
  }, [timeout, onIdle]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Lista de eventos que indicam atividade do usuário
    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'
    ];

    // Configura o timer inicial
    resetTimer();

    // Adiciona event listeners para cada evento de atividade
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Função de limpeza para remover event listeners e limpar o timer
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, handleActivity]); // resetTimer e handleActivity são dependências

  return isIdle;
};

export default useIdleTimer;
