import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ZoneView } from './components/ZoneView';
import { SettingsModal } from './components/SettingsModal';
import { UserGuideModal } from './components/UserGuideModal';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { ProcessingState, ProductPreset, ModelConfig, LogEntry, Machine, FIELD_LABELS, ScanConfig, User, UIConfig, DEFAULT_UI_CONFIG, ImageProcessingProfile, DEFAULT_PROCESSING_PROFILES, getDefaultTolerance } from './types';
import { Cpu, Settings, Send, BarChart3, Box, Layers, RefreshCw, Search, KeyRound, LogOut, ClipboardList, Tag, FileType, X, BookOpen, CheckCircle2, Camera, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * === TỐI ƯU TỔNG THỂ APP CHO QC LỚN TUỔI ===
 * 
 * 1. HEADER: Font lớn hơn, nút bấm to hơn (min 44px touch target)
 * 2. NÚT GỬI: Cực to, nổi bật, fixed ở bottom trên mobile
 * 3. LUỒNG: Giảm số bước thao tác - ẩn bớt chi tiết kỹ thuật
 * 4. DROPDOWN: Item to hơn, dễ chạm
 * 5. ZONE TABS: To hơn, có badge hiển thị đã chụp/chưa
 * 6. PERFORMANCE: Lazy load components, debounce search
 * 7. FEEDBACK: Thêm vibrate, confirm dialogs rõ ràng
 */

const DEFAULT_MODELS: ModelConfig[] = [
  { id: 'gemini-flash-lite-latest', name: 'Lite' },
  { id: 'gemini-flash-latest', name: 'Flash' },
  { id: 'gemini-3-pro-preview', name: 'Pro' }
];

const formatAppTimestamp = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().slice(-2);
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${d}/${m}/${y} | ${h}:${min}:${s}`;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeView, setActiveView] = useState<'capture' | 'dashboard'>('capture');
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  
  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-lite-latest');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [uiConfig, setUiConfig] = useState<UIConfig>(DEFAULT_UI_CONFIG);
  const [processingProfiles, setProcessingProfiles] = useState<ImageProcessingProfile[]>(DEFAULT_PROCESSING_PROFILES);

  const [userGuideImages, setUserGuideImages] = useState<string[]>([]);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  const [customModels, setCustomModels] = useState<ModelConfig[]>([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>(FIELD_LABELS);

  const [googleSheetUrl, setGoogleSheetUrl] = useState('https://script.google.com/macros/s/AKfycbyzGdq5FqipZMrHxyTHdPYmoymx97Cha3hpMpUvMhAhEQoBBcklS8FWmsVnSITe1jA4JQ/exec');
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [historicalLogs, setHistoricalLogs] = useState<LogEntry[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [scanConfigs, setScanConfigs] = useState<ScanConfig[]>([]);
  const [currentMachineId, setCurrentMachineId] = useState<string | null>(null);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [availableStructures, setAvailableStructures] = useState<string[]>([]);
  const [productMappings, setProductMappings] = useState<{lsx: string, product: string, structure: string}[]>([]);
  
  const [inputProductionOrder, setInputProductionOrder] = useState('LSX');
  const [inputProductName, setInputProductName] = useState('');
  const [inputStructure, setInputStructure] = useState('');

  const [customApiKeys, setCustomApiKeys] = useState<{id: string, name: string, key: string}[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [savedScriptUrls, setSavedScriptUrls] = useState<{id: string, name: string, url: string}[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<Record<string, any>>({});
  const [uiState, setUiState] = useState<Record<string, ProcessingState>>({});
  const [isUploading, setIsUploading] = useState(false);
  
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showQuickSearchTags, setShowQuickSearchTags] = useState(false);
  const [showProductNameDropdown, setShowProductNameDropdown] = useState(false);
  const [showStructureDropdown, setShowStructureDropdown] = useState(false);

  const [toastMessage, setToastMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({text, type});
    setTimeout(() => setToastMessage(null), 3000);
  };

  // === TỐI ƯU: Debounce search ref ===
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const headerSearchRef = useRef<HTMLDivElement>(null);
  const productNameRef = useRef<HTMLDivElement>(null);
  const structureRef = useRef<HTMLDivElement>(null);

  const availableModels = useMemo(() => [...DEFAULT_MODELS, ...customModels], [customModels]);

  const currentMachine = useMemo(() => 
    machines.find(m => m.id === currentMachineId) || null, 
  [currentMachineId, machines]);

  const currentPreset = useMemo(() => 
    presets.find(p => p.id === currentPresetId) || null,
  [currentPresetId, presets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerSearchRef.current && !headerSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (productNameRef.current && !productNameRef.current.contains(event.target as Node)) {
        setShowProductNameDropdown(false);
      }
      if (structureRef.current && !structureRef.current.contains(event.target as Node)) {
        setShowStructureDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const activeApiKey = useMemo(() => {
    const custom = customApiKeys.find(k => k.id === selectedApiKeyId);
    if (custom) return custom.key;
    if (customApiKeys.length > 0) return customApiKeys[0].key;
    return process.env.API_KEY || '';
  }, [customApiKeys, selectedApiKeyId]);

  const filteredPresets = useMemo(() => {
    if (!currentMachineId) return [];
    return presets
      .filter(p => p.machineId === currentMachineId)
      .filter(p => 
        p.productName.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.structure.toLowerCase().includes(productSearch.toLowerCase())
      );
  }, [presets, currentMachineId, productSearch]);
  
  const dropdownPresets = useMemo(() => filteredPresets.slice(0, 50), [filteredPresets]);

  const visibleProductOptions = useMemo(() => {
      if (!inputProductName) return availableProducts.slice(0, 50);
      return availableProducts
        .filter(p => p.toLowerCase().includes(inputProductName.toLowerCase()))
        .slice(0, 50);
  }, [availableProducts, inputProductName]);

  const visibleStructureOptions = useMemo(() => {
      if (!inputStructure) return availableStructures.slice(0, 50);
      return availableStructures
        .filter(s => s.toLowerCase().includes(inputStructure.toLowerCase()))
        .slice(0, 50);
  }, [availableStructures, inputStructure]);

  // === TỐI ƯU: Đếm zone đã có dữ liệu ===
  const zoneDataCount = useMemo(() => {
    const counts: Record<string, boolean> = {};
    if (currentMachine) {
      currentMachine.zones.forEach(z => {
        counts[z.id] = !!data[z.id] && Object.keys(data[z.id] || {}).length > 0;
      });
    }
    return counts;
  }, [currentMachine, data]);

  const totalZonesWithData = useMemo(() => Object.values(zoneDataCount).filter(Boolean).length, [zoneDataCount]);

  const handleMachineChange = useCallback((id: string | null) => {
    setCurrentMachineId(id || null);
    setActiveZoneId(null);
    setData({});
    setUiState({});
    setCurrentPresetId(null);
    setInputProductName('');
    setInputStructure('');
    if (id) localStorage.setItem('currentMachineId', id);
  }, []);

  const handleSelectPreset = useCallback((id: string | null) => {
    setCurrentPresetId(id || null);
    setProductSearch('');
    setShowProductDropdown(false);
  }, []);

  // === TỐI ƯU: Debounce product search ===
  const handleProductSearchChange = useCallback((value: string) => {
    setProductSearch(value);
    setShowProductDropdown(true);
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!googleSheetUrl) return;
    setIsRefreshing(true);
    try {
      const response = await fetch(`${googleSheetUrl}${googleSheetUrl.includes('?') ? '&' : '?'}action=sync&t=${Date.now()}`);
      if (response.ok) {
        const resData = await response.json();
        if (resData.presets) {
          const uniquePresets = Array.from(new Map((resData.presets as ProductPreset[]).map(p => [p.id, p])).values());
          setPresets(uniquePresets);
        }
        if (resData.logs) setHistoricalLogs(resData.logs);
        if (resData.machines) {
          const sortedMachines = [...resData.machines].sort((a, b) => (a.order || 0) - (b.order || 0));
          setMachines(sortedMachines);
        }
        if (resData.labels) setFieldLabels(prev => ({ ...prev, ...resData.labels }));
        if (resData.scanConfigs) setScanConfigs(resData.scanConfigs);
        if (resData.productStructures) {
            setAvailableProducts(resData.productStructures.products || []);
            setAvailableStructures(resData.productStructures.structures || []);
            setProductMappings(resData.productStructures.mappings || []);
        }
        if (resData.appConfig) {
           if (resData.appConfig.apiKeys) setCustomApiKeys(resData.appConfig.apiKeys);
           if (resData.appConfig.scriptUrls) setSavedScriptUrls(resData.appConfig.scriptUrls);
           if (resData.appConfig.models) setCustomModels(resData.appConfig.models);
           if (resData.appConfig.uiConfig) setUiConfig(resData.appConfig.uiConfig);
           if (resData.appConfig.processingProfiles) setProcessingProfiles(resData.appConfig.processingProfiles);
           if (resData.appConfig.userGuideImages) setUserGuideImages(resData.appConfig.userGuideImages);
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally { setIsRefreshing(false); }
  }, [googleSheetUrl]);

  useEffect(() => {
    const savedUrl = localStorage.getItem('googleSheetUrl');
    const savedMachineId = localStorage.getItem('currentMachineId');
    const savedApiKeyId = localStorage.getItem('selectedApiKeyId');
    const savedModel = localStorage.getItem('selectedModel');
    
    if (savedUrl) setGoogleSheetUrl(savedUrl);
    if (savedMachineId) setCurrentMachineId(savedMachineId);
    if (savedApiKeyId) setSelectedApiKeyId(savedApiKeyId);
    if (savedModel) setSelectedModel(savedModel);
    
    const savedUI = localStorage.getItem('uiConfig');
    if (savedUI) {
        try { setUiConfig(JSON.parse(savedUI)); } catch(e){}
    }
    
    const savedProfiles = localStorage.getItem('processingProfiles');
    if (savedProfiles) {
        try { setProcessingProfiles(JSON.parse(savedProfiles)); } catch(e){}
    }

    const savedMachines = localStorage.getItem('machines');
    if (savedMachines) {
        try { setMachines(JSON.parse(savedMachines)); } catch(e){}
    }
  }, []);

  useEffect(() => {
    if (googleSheetUrl && isAuthenticated) fetchAllData();
  }, [googleSheetUrl, fetchAllData, isAuthenticated]);

  useEffect(() => {
    if (selectedApiKeyId) localStorage.setItem('selectedApiKeyId', selectedApiKeyId);
  }, [selectedApiKeyId]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('uiConfig', JSON.stringify(uiConfig));
  }, [uiConfig]);
  
  useEffect(() => {
    localStorage.setItem('processingProfiles', JSON.stringify(processingProfiles));
  }, [processingProfiles]);

  useEffect(() => {
    if (machines.length > 0) {
        localStorage.setItem('machines', JSON.stringify(machines));
    }
  }, [machines]);

  const handleSaveAppConfigCloud = async (apiKeys: any[], scriptUrls: any[], models: any[], customUserGuideImages?: string[]) => {
    if (!googleSheetUrl) return;
    try {
      await fetch(googleSheetUrl, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({ 
            action: "save_app_config", 
            config: { apiKeys, scriptUrls, models, uiConfig, processingProfiles, userGuideImages: customUserGuideImages || userGuideImages }
        })
      });
      showToast("Đã đồng bộ Cấu hình lên Cloud!", "success");
    } catch (e) {
      showToast("Lỗi đồng bộ cấu hình", "error");
    }
  };

  const handleUploadToSheet = async () => {
    if (!googleSheetUrl || !currentMachine) return;
    
    // === TỐI ƯU: Confirm trước khi gửi ===
    setConfirmDialog({
      message: `Gửi dữ liệu ${totalZonesWithData} khu vực lên hệ thống?`,
      onConfirm: async () => {
        setIsUploading(true);
        try {
          const payload: any = {
            action: "save_log",
            timestamp: formatAppTimestamp(new Date()),
            product: inputProductName || "No Product",
            structure: inputStructure || "No Structure",
            productionOrder: inputProductionOrder || "",
            productStd: currentPreset?.productName || "",
            structureStd: currentPreset?.structure || "",
            machineId: currentMachine.id,
            machineName: currentMachine.name,
            uploadedBy: currentUser?.username || 'unknown',
          };

      let hasError = false;
      let outOfStandardCount = 0;
      let totalCheckedCount = 0;
      const errorDetails: any[] = [];

      Object.entries(data).forEach(([zoneId, zoneData]) => {
        if (!zoneData) return;
        Object.entries(zoneData).forEach(([key, val]) => {
          totalCheckedCount++;
          payload[key] = val;
          const std = currentPreset?.data?.[key];
          if (std !== undefined) {
             payload[`std_${key}`] = std;
             const diff = parseFloat(((val as number) - std).toFixed(2));
             payload[`diff_${key}`] = diff;
             
             const tolerance = currentPreset?.tolerances?.[key] ?? getDefaultTolerance(key);
             const diffAbs = Math.abs((val as number) - std);
             const isCorrect = diffAbs <= tolerance;
             
             if (!isCorrect) {
                hasError = true;
                outOfStandardCount++;
             }
             
             errorDetails.push({
                name: fieldLabels[key] || key,
                value: val,
                std: `${std} ±${tolerance}`,
                diff: diff > 0 ? `+${diff}` : diff,
                isCorrect: isCorrect
             });
          } else {
             errorDetails.push({
                name: fieldLabels[key] || key,
                value: val,
                std: 'N/A',
                diff: 'N/A',
                isCorrect: true
             });
          }
        });
      });

      if (hasError) {
         payload.sendEmail = true;
         payload.emailTo = "tcchinh@tapack.com.vn";
         payload.emailSubject = `[Cảnh báo] Thông số out chuẩn - ${currentMachine.name} - ${inputProductName || "Không rõ"}`;
         
         let emailHtml = `
            <div style="font-family: Segoe UI, Arial, sans-serif; color: #333;">
              <h2 style="margin: 0 0 10px 0;">
                <span style="color: #d9534f;"> 📢 Cảnh báo: Thông số máy vượt chuẩn ‼</span>
              </h2>
              <p style="margin: 0 0 4px 0;"><strong>Người kiểm tra:</strong> <span style="color: #1a56db; font-weight: bold;">${currentUser?.username || 'Không rõ'}</span></p>              
              <p style="margin: 0 0 4px 0;"><strong>Máy:</strong> ${currentMachine.name}</p>
              <p style="margin: 0 0 4px 0;"><strong>Sản phẩm:</strong> ${inputProductName || "Không có"}</p>
              <p style="margin: 0 0 4px 0;"><strong>Cấu trúc:</strong> ${inputStructure || "Không có"}</p>
              <p style="margin: 0 0 4px 0;"><strong>Lệnh sản xuất:</strong> ${inputProductionOrder || "Không có"}</p>
              <p style="margin: 0 0 4px 0;"><strong>Thời gian:</strong> ${payload.timestamp}</p>
              <p style="margin: 0 0 10px 0;">
                <span style="color: #d9534f; font-weight: bold;">${outOfStandardCount} thông số out chuẩn</span>
                <span style="color: #333; font-weight: bold;"> / ${totalCheckedCount} thông số kiểm</span>
              </p>
              <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 420px; font-family: 'Segoe UI', Arial, sans-serif;font-size: 13px;">
                <thead style="background-color: #f5f5f5;">
                  <tr>
                    <th style="text-align: left;">Thông số</th>
                    <th style="text-align: center;">Thực tế</th>
                    <th style="text-align: center;">Chuẩn</th>
                    <th style="text-align: center;">Diff</th>
                    <th style="text-align: center;">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
         `;
         
         errorDetails.forEach(item => {
            const statusIcon = item.isCorrect ? '<span style="color: #5cb85c; font-weight: bold;">✓</span>' : '<span style="color: #d9534f; font-weight: bold;">✗</span>';
            const rowStyle = item.isCorrect ? '' : 'background-color: #fad7d7;';
            emailHtml += `
                  <tr style="${rowStyle}">
                    <td>${item.name}</td>
                    <td style="text-align: center; font-weight: bold;">${item.value}</td>
                    <td style="text-align: center;">${item.std}</td>
                    <td style="text-align: center; font-weight: bold; color: ${item.isCorrect ? '#333' : '#d9534f'};">${item.diff}</td>
                    <td style="text-align: center;">${statusIcon}</td>
                  </tr>
            `;
         });
         
         emailHtml += `
                </tbody>
              </table>
            </div>
         `;
         
         payload.emailHtml = emailHtml;
      }

      await fetch(googleSheetUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      
      // === TỐI ƯU: Haptic + visual feedback ===
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
      showToast("✅ Đã gửi dữ liệu thành công!", "success");
      setData({});
      setUiState({});
      fetchAllData();
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      showToast("❌ Lỗi gửi dữ liệu. Vui lòng thử lại.", "error");
    } finally { setIsUploading(false); }
      }
    });
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setConfirmDialog({
      message: 'Đăng xuất khỏi hệ thống?',
      onConfirm: () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    });
  };

  const handleSetData = useCallback((d: any) => {
    if (activeZoneId) {
       setData(prev => ({ ...prev, [activeZoneId]: d }));
    }
  }, [activeZoneId]);

  const handleSetState = useCallback((s: any) => {
    if (activeZoneId) {
        setUiState(prev => ({ ...prev, [activeZoneId]: s }));
    }
  }, [activeZoneId]);

  // --- Theme Configurations (unchanged) ---
  const lightMode1CSS = `
    :root {
      --bg-main: #fef6e4;
      --bg-card: #ffffff;
      --bg-input: #ffffff;
      --text-main: #001858;
      --text-secondary: #172c66;
      --border-color: #001858;
      --color-primary: #2563eb;
      --color-secondary: #8bd3dd;
    }
  `;

  const lightMode2CSS = `
    :root {
      --bg-main: #feefe8;
      --bg-card: #fffffe;
      --bg-input: #fffffe;
      --text-main: #232323;
      --text-secondary: #222525;
      --border-color: #232323;
      --color-primary: #f45d48;
      --color-secondary: #078080;
    }
  `;

  const sharedLightCSS = `
    body { background-color: var(--bg-main) !important; color: var(--text-main) !important; }
    .bg-\\[\\#0b1120\\], .bg-slate-900, .bg-slate-950, .bg-slate-800, .bg-slate-900\\/50, .bg-slate-900\\/30, .bg-slate-900\\/80, .bg-slate-900\\/40, .bg-slate-900\\/60, .bg-slate-950\\/40, .bg-slate-950\\/50, .bg-slate-950\\/20, .bg-slate-800\\/50, .bg-slate-800\\/90, .bg-slate-800\\/80 {
        background-color: var(--bg-card) !important;
        color: var(--text-main) !important;
        border-color: var(--border-color) !important;
        box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 0.1) !important;
    }
    input, select, textarea {
        background-color: var(--bg-input) !important;
        color: var(--text-main) !important;
        border-color: var(--border-color) !important;
    }
    .text-slate-100, .text-white, .text-slate-200, .text-slate-300 { color: var(--text-main) !important; }
    .text-slate-500, .text-slate-400, .text-slate-600 { color: var(--text-secondary) !important; }
    .bg-blue-600 { 
        background-color: var(--color-primary) !important; 
        color: #ffffff !important;
        border-color: var(--border-color) !important;
    }
    .text-blue-400, .text-blue-500 { color: var(--color-primary) !important; }
    .text-cyan-400 { color: var(--color-secondary) !important; }
    .border-slate-800, .border-slate-700, .border-slate-600 {
        border-color: var(--border-color) !important;
    }
    .border-green-500 { border-color: #22c55e !important; }
    .border-yellow-500 { border-color: #eab308 !important; }
    .border-red-500 { border-color: #ef4444 !important; }
    .border-red-900\\/50 { border-color: rgba(127, 29, 29, 0.5) !important; }
    .border-blue-500\\/50 { border-color: rgba(59, 130, 246, 0.5) !important; }
    .hover\\:border-blue-500\\/50:hover { border-color: rgba(59, 130, 246, 0.5) !important; }
  `;

  const dynamicStyles = useMemo(() => {
    if (uiConfig.themeMode === 'light') {
        return `${lightMode1CSS} ${sharedLightCSS}`;
    }
    if (uiConfig.themeMode === 'light_2') {
        return `${lightMode2CSS} ${sharedLightCSS}`;
    }
    return '';
  }, [uiConfig, lightMode1CSS, lightMode2CSS, sharedLightCSS]);

  const quickSearchTags = useMemo(() => {
    if (!currentMachineId) return [];
    const machine = machines.find(m => m.id === currentMachineId);
    if (!machine || !machine.name) return [];
    
    // Extract the last word of the machine name, e.g., "T06" from "Máy ghép T06"
    const words = machine.name.trim().split(/\s+/);
    const shortName = words[words.length - 1];
    if (!shortName) return [];
    
    const machinePresets = presets.filter(p => p.machineId === currentMachineId);
    const tags = new Map<string, string>(); // raw match -> formatted tag
    
    // Match any [tag]
    const regex = /\[([^\]]+)\]/g;
    
    machinePresets.forEach(p => {
      const matches = [...p.productName.matchAll(regex)];
      matches.forEach(match => {
        if (match[1] && match[1].toUpperCase().startsWith(shortName.toUpperCase())) {
          const rawMatch = match[1].toUpperCase();
          tags.set(rawMatch, `[${rawMatch}]`);
        }
      });
    });
    
    // Fallback: if no tags with brackets were found, try to find words starting with the short name
    if (tags.size === 0) {
      const escapedShortName = shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fallbackRegex = new RegExp(`\\b(${escapedShortName}[-\\w]*)\\b`, 'gi');
      machinePresets.forEach(p => {
        const matches = [...p.productName.matchAll(fallbackRegex)];
        matches.forEach(match => {
          if (match[1]) {
            const rawMatch = match[1].toUpperCase();
            tags.set(rawMatch, `[${rawMatch}]`);
          }
        });
      });
    }
    
    return Array.from(tags.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [currentMachineId, machines, presets]);

  const isSearching = showProductDropdown;

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} googleSheetUrl={googleSheetUrl} />;
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 font-sans pb-28 sm:pb-0">
      {/* === TOAST MESSAGE === */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-slide-down">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white ${
            toastMessage.type === 'success' ? 'bg-emerald-600' : 
            toastMessage.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* === CONFIRM DIALOG === */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700 animate-scale-up">
            <h3 className="text-xl font-black text-white mb-3">Xác nhận</h3>
            <p className="text-slate-300 mb-6 text-sm leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-600/30"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{dynamicStyles}</style>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-[200]">
        <div className="max-w-4xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between h-14">
            {activeView === 'capture' ? (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-lg flex items-center justify-center shrink-0">
                  <Box className="text-white" size={22} />
                </div>
                <div className="min-w-0 flex flex-col items-start">
                  <h1 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 ml-1">Capture AI</h1>
                  <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg px-1 py-0.5 flex items-center transition-colors hover:bg-orange-500/30">
                    <select 
                      value={currentMachineId || ''} 
                      onChange={(e) => handleMachineChange(e.target.value)}
                      className="!bg-transparent text-xs font-bold text-orange-500 outline-none cursor-pointer max-w-[140px] sm:max-w-full truncate"
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <option value="" className="bg-slate-800 text-slate-300">-- Chọn Máy --</option>
                      {machines.filter(m => m.isVisible !== false).map(m => <option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                  <BarChart3 className="text-blue-400" size={22} />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white uppercase tracking-tight">Overview</h1>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Dashboard</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1">
               {/* === TỐI ƯU: Tab lớn hơn, dễ bấm === */}
               <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50">
                 <button onClick={() => setActiveView('capture')} className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-md flex items-center gap-1.5 transition-all ${activeView === 'capture' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                   <Camera size={18} />
                   <span className="text-xs font-black uppercase hidden sm:inline">Chụp ảnh</span>
                 </button>
                 <button onClick={() => setActiveView('dashboard')} className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-md flex items-center gap-1.5 transition-all ${activeView === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                   <ClipboardList size={18} />
                   <span className="text-xs font-black uppercase hidden sm:inline">Nhật ký</span>
                 </button>
               </div>
               
               {activeView === 'capture' && (
                 <>
                  <div className="hidden sm:flex items-center bg-slate-800 rounded-lg px-2 border border-slate-700 h-9">
                      <Cpu size={14} className="text-blue-500 mr-1.5" />
                      <select 
                        value={selectedModel} 
                        onChange={(e) => setSelectedModel(e.target.value)} 
                        className="bg-transparent text-[10px] font-black uppercase text-slate-200 outline-none cursor-pointer"
                      >
                        {availableModels.map(m => <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>)}
                      </select>
                  </div>

                  <div className="hidden sm:flex items-center bg-slate-800 rounded-lg px-2 border border-slate-700 h-9 ml-1">
                      <KeyRound size={14} className="text-yellow-500 mr-1.5" />
                      <select 
                        value={selectedApiKeyId || ''} 
                        onChange={(e) => setSelectedApiKeyId(e.target.value || null)} 
                        className="bg-transparent text-[10px] font-black uppercase text-slate-200 outline-none cursor-pointer max-w-[80px] truncate"
                      >
                        <option value="" className="bg-slate-900">System Key</option>
                        {customApiKeys.map(k => <option key={k.id} value={k.id} className="bg-slate-900">{k.name}</option>)}
                      </select>
                  </div>
                 </>
               )}
               
               {activeView === 'capture' && (
                 <button onClick={() => setIsUserGuideOpen(true)} className="p-1.5 sm:p-2.5 rounded-lg border bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700 transition-colors" title="Hướng dẫn"><BookOpen size={18} className="sm:w-5 sm:h-5" /></button>
               )}
               <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 sm:p-2.5 rounded-lg border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"><Settings size={18} className="sm:w-5 sm:h-5" /></button>
               <button onClick={handleLogout} className="p-1.5 sm:p-2.5 rounded-lg border bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-700 transition-colors" title="Đăng xuất"><LogOut size={18} className="sm:w-5 sm:h-5" /></button>
            </div>
          </div>
          
          {activeView === 'capture' && (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-800/40 pt-2 pb-1">
              {/* Product Selector */}
              <div className="relative flex-1 flex flex-col" ref={headerSearchRef}>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    {currentPreset && !showProductDropdown ? (
                      <div 
                        className="w-full bg-slate-800/80 border border-green-500/50 rounded-lg py-1.5 pl-10 pr-8 cursor-pointer flex flex-col justify-center min-h-[42px] transition-all hover:bg-slate-800"
                        onClick={() => {
                          setProductSearch(currentPreset.productName);
                          setShowProductDropdown(true);
                        }}
                      >
                        <div className={`${(uiConfig.themeMode === 'light' || uiConfig.themeMode === 'light_2') ? 'text-[10px] text-orange-600' : 'text-xs text-green-400'} font-bold truncate leading-tight`}>{currentPreset.productName}</div>
                        <div className="text-[10px] text-slate-400 font-bold truncate leading-tight mt-0.5">{currentPreset.structure}</div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSelectPreset(null); setProductSearch(''); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="Tìm TSKT chuẩn..." 
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-2.5 pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-500/50 transition-all text-slate-100 min-h-[42px]"
                        value={productSearch}
                        onChange={(e) => handleProductSearchChange(e.target.value)}
                        onFocus={() => setShowProductDropdown(true)}
                      />
                    )}
                  </div>
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[300] max-h-60 overflow-y-auto custom-scrollbar">
                        {dropdownPresets.map(p => (
                          <div key={p.id} onMouseDown={() => handleSelectPreset(p.id)} className="p-3 hover:bg-blue-600 cursor-pointer border-b border-slate-800 last:border-0 transition-colors active:bg-blue-700">
                            <div className="font-black text-white text-xs uppercase">{p.productName}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase truncate mt-0.5">{p.structure}</div>
                          </div>
                        ))}
                        {dropdownPresets.length === 0 && (
                          <div className="p-4 text-center text-slate-500 text-sm">Không tìm thấy</div>
                        )}
                    </div>
                  )}
                  {quickSearchTags.length > 0 && !currentPreset && (
                    <div className="mt-2">
                      <button 
                        onClick={() => setShowQuickSearchTags(!showQuickSearchTags)}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white font-bold transition-colors mb-1.5"
                      >
                        {showQuickSearchTags ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Gợi ý tìm kiếm nhanh ({quickSearchTags.length})
                      </button>
                      {showQuickSearchTags && (
                        <div className="flex flex-wrap gap-1.5">
                          {quickSearchTags.map(([rawMatch, formattedTag]) => (
                            <button
                              key={rawMatch}
                              onClick={() => handleProductSearchChange(rawMatch)}
                              className="px-2 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-[10px] font-bold rounded border border-slate-700 hover:border-blue-500 transition-colors"
                            >
                              {formattedTag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>
              
              <div className="flex items-center justify-between gap-2">
                 {/* Mobile Selectors */}
                 <div className="flex sm:hidden items-center gap-1">
                    <div className="flex items-center bg-slate-800 rounded-lg px-2 border border-slate-700 h-9 shrink-0">
                        <Cpu size={14} className="text-blue-500" />
                        <select 
                          value={selectedModel} 
                          onChange={(e) => setSelectedModel(e.target.value)} 
                          className="bg-transparent text-[9px] font-black uppercase text-slate-200 outline-none cursor-pointer w-[55px] ml-1"
                        >
                          {availableModels.map(m => <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center bg-slate-800 rounded-lg px-2 border border-slate-700 h-9 shrink-0">
                        <KeyRound size={14} className="text-yellow-500" />
                        <select 
                          value={selectedApiKeyId || ''} 
                          onChange={(e) => setSelectedApiKeyId(e.target.value || null)} 
                          className="bg-transparent text-[9px] font-black uppercase text-slate-200 outline-none cursor-pointer w-[55px] ml-1"
                        >
                          <option value="" className="bg-slate-900">Sys</option>
                          {customApiKeys.map(k => <option key={k.id} value={k.id} className="bg-slate-900">{k.name}</option>)}
                        </select>
                    </div>
                 </div>

                 {/* === Desktop send button (hidden on mobile - see fixed bottom bar) === */}
                 <button 
                  onClick={handleUploadToSheet} 
                  disabled={Object.keys(data).length === 0 || isUploading} 
                  className="hidden sm:flex flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-black uppercase items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 h-10"
                >
                    {isUploading ? <RefreshCw className="animate-spin" size={16}/> : <Send size={16}/>} Gửi dữ liệu
                </button>
              </div>

            </div>
          )}
        </div>
      </header>

      <main className={`max-w-4xl mx-auto p-3 sm:p-4 transition-all duration-300 ${isSearching ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
        {activeView === 'capture' ? (
          <>
            {!currentMachine ? (
              <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800/50">
                 <Box size={48} className="mx-auto mb-4 text-slate-700" />
                 <h2 className="text-base font-bold text-white mb-3 uppercase tracking-widest">Vui lòng chọn máy</h2>
                 <button onClick={() => setIsSettingsOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Mở Cài Đặt</button>
              </div>
            ) : (
              <>
                 {/* Production Info Inputs */}
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 bg-slate-900/40 p-2 rounded-xl border border-slate-800">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><ClipboardList size={10}/> Lệnh sản xuất</label>
                      <input 
                        type="text" 
                        value={inputProductionOrder} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setInputProductionOrder(val);
                          if (val) {
                            const match = productMappings.find(m => m.lsx.toLowerCase() === val.toLowerCase());
                            if (match) {
                              if (match.product) setInputProductName(match.product);
                              if (match.structure) setInputStructure(match.structure);
                            }
                          }
                        }}
                        placeholder="Nhập lệnh SX..." 
                        className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 relative" ref={productNameRef}>
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Tag size={10}/> Sản phẩm</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={inputProductName}
                          onChange={(e) => { setInputProductName(e.target.value); setShowProductNameDropdown(true); }}
                          onFocus={() => setShowProductNameDropdown(true)}
                          placeholder="Tên sản phẩm..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 pr-6 text-xs font-bold text-white outline-none focus:border-blue-500"
                        />
                        {inputProductName && (
                          <button onClick={() => setInputProductName('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      {showProductNameDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[50] max-h-48 overflow-y-auto custom-scrollbar">
                           {visibleProductOptions.map((p, i) => (
                             <div key={i} onClick={() => { setInputProductName(p); setShowProductNameDropdown(false); }} className="p-2 hover:bg-blue-600 cursor-pointer border-b border-slate-800 last:border-0 transition-colors">
                               <div className="font-bold text-white text-xs">{p}</div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 relative" ref={structureRef}>
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><FileType size={10}/> Cấu trúc</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={inputStructure}
                          onChange={(e) => { setInputStructure(e.target.value); setShowStructureDropdown(true); }}
                          onFocus={() => setShowStructureDropdown(true)}
                          placeholder="Cấu trúc..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 pr-6 text-xs font-bold text-white outline-none focus:border-blue-500"
                        />
                        {inputStructure && (
                          <button onClick={() => setInputStructure('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      {showStructureDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[50] max-h-48 overflow-y-auto custom-scrollbar">
                           {visibleStructureOptions.map((s, i) => (
                             <div key={i} onClick={() => { setInputStructure(s); setShowStructureDropdown(false); }} className="p-2 hover:bg-blue-600 cursor-pointer border-b border-slate-800 last:border-0 transition-colors">
                               <div className="font-bold text-white text-xs">{s}</div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                 </div>

                {/* === TỐI ƯU: Zone tabs lớn hơn, có badge trạng thái === */}
                <div className="bg-slate-900/30 border border-slate-800/50 mb-3 rounded-xl overflow-x-auto no-scrollbar flex p-1 shadow-inner gap-1">
                  {currentMachine.zones.map((zone) => (
                    <button key={zone.id} onClick={() => setActiveZoneId(zone.id)} className={`flex-1 min-w-[80px] py-2 px-2 flex flex-col items-center gap-1 rounded-lg transition-all relative ${activeZoneId === zone.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/50'}`}>
                      <Layers size={16} />
                      <span className="text-[9px] font-black uppercase truncate max-w-full">{zone.name}</span>
                      {/* Badge: đã có dữ liệu */}
                      {zoneDataCount[zone.id] && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle2 size={10} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {activeZoneId && currentMachine.zones.find(z => z.id === activeZoneId) && (
                    <ZoneView 
                      zone={currentMachine.zones.find(z => z.id === activeZoneId)!}
                      data={data[activeZoneId]} 
                      standardData={currentPreset?.data || {}} 
                      currentPreset={currentPreset} 
                      setData={handleSetData} 
                      state={uiState[activeZoneId] || { isAnalyzing: false, error: null, imageUrl: null, imageUrls: {}, processedImageUrls: {} }} 
                      setState={handleSetState} 
                      modelName={selectedModel}
                      fieldLabels={fieldLabels}
                      apiKey={activeApiKey}
                      showProcessedImage={uiConfig.showProcessedImage}
                      processingProfiles={processingProfiles}
                      themeMode={uiConfig.themeMode}
                    />
                )}
              </>
            )}
          </>
        ) : (
          <Dashboard logs={historicalLogs} presets={presets} machines={machines} onRefresh={fetchAllData} isRefreshing={isRefreshing} fieldLabels={fieldLabels} themeMode={uiConfig.themeMode} />
        )}
      </main>

      {/* === TỐI ƯU LỚN: NÚT GỬI CỐ ĐỊNH Ở BOTTOM TRÊN MOBILE === */}
      {activeView === 'capture' && currentMachine && (
        <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 z-[150] sm:hidden safe-area-bottom transition-all duration-300 ${isSearching ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
          <button 
            onClick={handleUploadToSheet} 
            disabled={Object.keys(data).length === 0 || isUploading} 
            className="w-full bg-blue-600 text-white py-4 rounded-2xl text-base font-black uppercase flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            {isUploading ? (
              <RefreshCw className="animate-spin" size={22}/>
            ) : (
              <>
                <Send size={22}/> 
                Gửi dữ liệu
                {totalZonesWithData > 0 && (
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-sm font-bold">
                    {totalZonesWithData} khu vực
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )}

      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        images={userGuideImages}
        onSave={(newImages) => {
          setUserGuideImages(newImages);
          handleSaveAppConfigCloud(customApiKeys, savedScriptUrls, customModels, newImages);
        }}
        currentUser={currentUser}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} 
        googleSheetUrl={googleSheetUrl} setGoogleSheetUrl={setGoogleSheetUrl} 
        presets={presets} currentPresetId={currentPresetId} setCurrentPresetId={handleSelectPreset} 
        onRefreshPresets={fetchAllData} isRefreshing={isRefreshing} 
        customModels={customModels} setCustomModels={setCustomModels}
        machines={machines} setMachines={setMachines}
        scanConfigs={scanConfigs} setScanConfigs={setScanConfigs}
        currentMachineId={currentMachineId} setCurrentMachineId={handleMachineChange}
        fieldLabels={fieldLabels} setFieldLabels={setFieldLabels}
        apiKeys={customApiKeys} setApiKeys={setCustomApiKeys}
        selectedApiKeyId={selectedApiKeyId} setSelectedApiKeyId={setSelectedApiKeyId}
        scriptUrls={savedScriptUrls} setScriptUrls={setSavedScriptUrls}
        onSaveAppConfig={handleSaveAppConfigCloud}
        selectedModel={selectedModel}
        activeApiKey={activeApiKey}
        uiConfig={uiConfig}
        setUiConfig={setUiConfig}
        processingProfiles={processingProfiles}
        setProcessingProfiles={setProcessingProfiles}
        showToast={showToast}
        setConfirmDialog={setConfirmDialog}
      />
    </div>
  );
};

export default App;
