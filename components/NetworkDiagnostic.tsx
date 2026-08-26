import React, { useState, useEffect } from 'react';
import { Activity, Radio } from 'lucide-react';

interface NetworkDiagnosticProps {
  googleSheetUrl: string;
}

export const NetworkDiagnostic: React.FC<NetworkDiagnosticProps> = ({ googleSheetUrl }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [latency, setLatency] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [connectionType, setConnectionType] = useState('Unknown');
  const [isOpen, setIsOpen] = useState(false);

  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [gasStatus, setGasStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastScanTime, setLastScanTime] = useState('');
  const [lastErrorMessage, setLastErrorMessage] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateConnection = () => {
      const nav = navigator as any;
      if (nav.connection && nav.connection.effectiveType) {
        let type = nav.connection.effectiveType.toUpperCase();
        // Trình duyệt desktop (chrome) thường báo 4G cho mạng LAN/Cáp quang
        // Nên nếu thấy 4G mà ko phải mobile, ta đổi thành Broadband
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (type === '4G' && !isMobile) {
            type = 'Broadband (LAN)';
        }
        if (nav.connection.type === 'wifi') type = 'WIFI';
        setConnectionType(type);
      } else {
        setConnectionType('Broadband (LAN)');
      }
    };
    updateConnection();
    const nav = navigator as any;
    if (nav.connection) {
      nav.connection.addEventListener('change', updateConnection);
    }

    // Custom events from Gemini/GAS
    const handleGeminiSuccess = () => {
       setGeminiStatus('success');
       setLastScanTime(new Date().toLocaleTimeString());
    };
    const handleGeminiError = (e: any) => {
       setGeminiStatus('error');
       setLastErrorMessage(e.detail || 'Gemini API Error');
       setLastScanTime(new Date().toLocaleTimeString());
    };
    const handleGasSuccess = () => setGasStatus('success');
    const handleGasError = (e: any) => {
       setGasStatus('error');
       setLastErrorMessage(e.detail || 'Google Apps Script Error');
    };

    window.addEventListener('gemini-api-success', handleGeminiSuccess);
    window.addEventListener('gemini-api-error', handleGeminiError as EventListener);
    window.addEventListener('gas-api-success', handleGasSuccess);
    window.addEventListener('gas-api-error', handleGasError as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (nav.connection) {
        nav.connection.removeEventListener('change', updateConnection);
      }
      window.removeEventListener('gemini-api-success', handleGeminiSuccess);
      window.removeEventListener('gemini-api-error', handleGeminiError as EventListener);
      window.removeEventListener('gas-api-success', handleGasSuccess);
      window.removeEventListener('gas-api-error', handleGasError as EventListener);
    };
  }, []);

  // Ping GAS to measure latency and request loss
  useEffect(() => {
    // No need to check googleSheetUrl anymore as we don't ping it
    let isMounted = true;
    
    const ping = async () => {
      if (!isOnline) return;
      const start = performance.now();
      setRequestCount(prev => prev + 1);
      try {
        // Ping Google's Generate 204 endpoint for generic network latency (Does NOT consume GAS quota)
        const res = await fetch('https://clients3.google.com/generate_204', { method: 'GET', mode: 'no-cors' });
        const end = performance.now();
        if (isMounted) {
          setLatency(Math.round(end - start));
        }
      } catch (e: any) {
        if (isMounted) {
          setFailCount(prev => prev + 1);
          // Only track network error, don't set GAS error just because internet is bad
          if (isOnline) setLastErrorMessage('Network Ping Failed');
        }
      }
    };

    ping();
    const interval = setInterval(ping, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [googleSheetUrl, isOnline]);

  const requestLoss = requestCount === 0 ? 0 : Math.round((failCount / requestCount) * 100);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[9999] bg-slate-900 border border-slate-700 p-2.5 rounded-full shadow-2xl text-teal-500 hover:bg-slate-800 transition-colors animate-pulse"
        title="Network Diagnostic"
      >
        <Radio size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-[9999] bg-slate-950 border border-slate-700 rounded-xl shadow-2xl w-64 backdrop-blur-md overflow-hidden font-mono text-[11px] animate-fade-in shadow-black/50">
      <div className="bg-slate-900 px-3 py-2 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2 text-teal-500 font-bold tracking-wider">
          <Radio size={14} className="animate-pulse" />
          NETWORK DIAGNOSTIC
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-100 hover:text-white p-1">
          <Activity size={14} />
        </button>
      </div>
      
      <div className="p-3 space-y-3 text-slate-300">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-300 mb-1">Internet</div>
            <div className="flex items-center gap-1.5 font-bold">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <span className={isOnline ? 'text-emerald-400' : 'text-red-400'}>{isOnline ? 'Connected' : 'Offline'}</span>
            </div>
          </div>
          <div>
            <div className="text-slate-300 mb-1">Connection</div>
            <div className="font-bold text-blue-400">{connectionType}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-300 mb-1">Latency</div>
            <div className="font-bold text-teal-500">{latency > 0 ? `${latency} ms` : '--'}</div>
          </div>
          <div>
            <div className="text-slate-300 mb-1">Request Loss</div>
            <div className={`font-bold ${requestLoss > 10 ? 'text-red-400' : 'text-emerald-400'}`}>
              {requestLoss}%
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-100">Gemini API</span>
            <div className="flex items-center gap-1.5 font-bold">
              <div className={`w-2 h-2 rounded-full ${geminiStatus === 'success' ? 'bg-emerald-500' : geminiStatus === 'error' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
              <span className={geminiStatus === 'success' ? 'text-emerald-400' : geminiStatus === 'error' ? 'text-red-400' : 'text-slate-100'}>
                {geminiStatus === 'success' ? 'Reachable' : geminiStatus === 'error' ? 'Error' : 'Idle'}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-100">Google Apps Script</span>
            <div className="flex items-center gap-1.5 font-bold">
              <div className={`w-2 h-2 rounded-full ${gasStatus === 'success' ? 'bg-emerald-500' : gasStatus === 'error' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
              <span className={gasStatus === 'success' ? 'text-emerald-400' : gasStatus === 'error' ? 'text-red-400' : 'text-slate-100'}>
                {gasStatus === 'success' ? 'Reachable' : gasStatus === 'error' ? 'Error' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Last Scan</span>
            <span className="text-slate-300 font-bold">{lastScanTime || '--:--:--'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-300 mb-1">Last Error</span>
            <span className={`text-[10px] font-bold ${lastErrorMessage ? 'text-red-400' : 'text-slate-300'} break-words line-clamp-2 leading-tight`}>
              {lastErrorMessage || 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
