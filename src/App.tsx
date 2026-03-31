import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Layout as LayoutIcon, 
  Menu, 
  X,
  ChevronRight,
  Heart,
  Copy,
  Check,
  QrCode,
  Info,
  Upload,
  Database
} from 'lucide-react';
import { cn } from './lib/utils';

// Tool Components
import Dashboard from './components/Dashboard';
import EarningsCalculator from './components/EarningsCalculator';
import PartsCalculator from './components/PartsCalculator';
import RoomSimulator from './components/RoomSimulator';
import MinerSearch from './components/MinerSearch';
import DatabaseManager from './components/DatabaseManager';
import { Miner } from './types';
import { fetchMiners, deleteMiner } from './services/apiService';
import { ASSET_URLS } from './constants';

type Tool = 'home' | 'calculator' | 'parts' | 'simulator' | 'search' | 'database';

const CustomIcon = ({ src, className }: { src: string; className?: string }) => (
  <div 
    className={cn("bg-current", className)} 
    style={{ 
      maskImage: `url(${src})`, 
      maskSize: 'contain', 
      maskRepeat: 'no-repeat', 
      maskPosition: 'center',
      WebkitMaskImage: `url(${src})`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center'
    }} 
  />
);

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedQr, setSelectedQr] = useState<any | null>(null);
  const [editMiner, setEditMiner] = useState<Miner | null>(null);

  const handleEditMiner = (miner: Miner) => {
    setEditMiner(miner);
    setActiveTool('database');
  };

  const handleDeleteMiner = async (id: string) => {
    try {
      await deleteMiner(id);
      // We might need to trigger a refresh in MinerSearch, 
      // but since it fetches on mount, and we are just deleting,
      // it might be better to have a state in App or a refresh trigger.
      // For now, let's just reload the page or rely on the user navigating back.
      // Actually, MinerSearch should probably handle its own state refresh if possible,
      // but App is passing the callback.
      window.location.reload(); // Simple way to refresh for now
    } catch (error) {
      console.error('Failed to delete miner:', error);
      alert('Failed to delete miner. Please try again.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr;
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  const donationOptions = [
    { id: 'maya', symbol: 'Maya', name: 'Maya', qr: '/qrs/maya.jpg', icon: '/currencies/maya.webp' },
    { id: 'gcash', symbol: 'GCash', name: 'GCash', qr: '/qrs/gcash.jpg', icon: '/currencies/gcash.webp' },
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin', value: 'bc1qygj65t5zjn7xttvgs0nkemjyj5hluqug2x8c3x', qr: '/qrs/btc.jpg', icon: ASSET_URLS.currency('btc') },
    { id: 'eth', symbol: 'ETH', name: 'Ethereum', value: '0x0535Eb9b17cc84cCF1fd6fBAD38ccafd5E789597', qr: '/qrs/eth.jpg', icon: ASSET_URLS.currency('eth') },
    { id: 'bnb', symbol: 'BNB', name: 'BSC', value: '0x0535Eb9b17cc84cCF1fd6fBAD38ccafd5E789597', qr: '/qrs/bnb.jpg', icon: ASSET_URLS.currency('bnb') },
    { id: 'sol', symbol: 'SOL', name: 'Solana', value: 'At8TFKEMjzzv5hmDbp2Z7UGEzBpL9F4hyTX8dxuKUZPo', qr: '/qrs/sol.jpg', icon: ASSET_URLS.currency('sol') },
    { id: 'trx', symbol: 'TRX', name: 'Tron', value: 'TCaxuDwtSHDGmkHL6k4has1LVsFbRAosb3', qr: '/qrs/trx.jpg', icon: ASSET_URLS.currency('trx') },
  ];

  const navItems = [
    { id: 'calculator', label: 'Earnings Calc', icon: Calculator },
    { id: 'parts', label: 'Parts & Crafting', icon: (props: any) => <CustomIcon src="/icons/parts.svg" {...props} /> },
    { id: 'simulator', label: 'Room Simulator', icon: LayoutIcon, disabled: true },
    { id: 'search', label: 'Miner Search', icon: (props: any) => <CustomIcon src="/icons/miners.svg" {...props} /> },
    { id: 'database', label: 'Database', icon: Database },
  ];

  const renderTool = () => {
    switch (activeTool) {
      case 'home': return <Dashboard onNavigate={setActiveTool} />;
      case 'calculator': return <EarningsCalculator />;
      case 'parts': return <PartsCalculator />;
      case 'simulator': return <RoomSimulator />;
      case 'search': return <MinerSearch onEdit={handleEditMiner} />;
      case 'database': return <DatabaseManager editMiner={editMiner} onCancelEdit={() => setEditMiner(null)} />;
      default: return <Dashboard onNavigate={setActiveTool} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-[#1e293b] border-b border-slate-800 sticky top-0 z-50">
          <button 
            onClick={() => setActiveTool('home')}
            className="flex items-center gap-0 hover:opacity-80 transition-opacity"
          >
            <img src="/icons/hamster.png" alt="Logo" className="w-10 h-10 aspect-square object-cover" referrerPolicy="no-referrer" />
            <span className="font-bold text-lg tracking-tight">RollerToolkit</span>
          </button>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Desktop Top Bar */}
      <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setActiveTool('home')}
            className="flex items-center gap-0 hover:opacity-80 transition-opacity"
          >
            <img src="/icons/hamster.png" alt="Logo" className="w-11 h-11 aspect-square object-cover" referrerPolicy="no-referrer" />
            <span className="font-bold text-xl tracking-tight text-white">RollerToolkit</span>
          </button>

          <nav className="flex items-center gap-1">
            {navItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = activeTool === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && setActiveTool(item.id as Tool)}
                  disabled={item.disabled}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 group/nav",
                    isActive 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                      : item.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5", 
                    isActive ? "text-white" : !item.disabled && "group-hover/nav:scale-110 transition-transform"
                  )} />
                  <span className="font-medium text-sm">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Removed Built for players badge */}
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile Sidebar (Drawer) */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-[60] bg-[#1e293b] border-r border-slate-800 transition-all duration-300 ease-in-out lg:hidden",
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full"
        )}>
          <div className="h-full flex flex-col p-4 overflow-hidden">
            <button 
              onClick={() => {
                setActiveTool('home');
                setIsSidebarOpen(false);
              }}
              className="flex items-center gap-0 mb-4 px-1 hover:opacity-80 transition-opacity w-full text-left"
            >
              <img src="/icons/hamster.png" alt="Logo" className="w-11 h-11 aspect-square object-cover" referrerPolicy="no-referrer" />
              <span className="font-bold text-xl tracking-tight text-white">
                RollerToolkit
              </span>
            </button>

            <nav className="space-y-2 flex-1">
              {navItems.map((item: any) => {
                const Icon = item.icon;
                const isActive = activeTool === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!item.disabled) {
                        setActiveTool(item.id as Tool);
                        setIsSidebarOpen(false);
                      }
                    }}
                    disabled={item.disabled}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group/nav",
                      isActive 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                        : item.disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Icon className={cn(
                      "w-6 h-6 shrink-0", 
                      isActive ? "text-white" : !item.disabled && "group-hover/nav:scale-110 transition-transform"
                    )} />
                    <span className="font-medium">
                      {item.label}
                    </span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTool()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="py-4 px-8 border-t border-slate-800 bg-[#0f172a] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-1">
              <img src="/icons/hamster.png" alt="Logo" className="w-6 h-6 aspect-square object-cover" referrerPolicy="no-referrer" />
              <span className="text-sm text-white">RollerToolkit</span>
              <span className="text-slate-700 sm:inline ml-1">|</span>
              <span className="text-xs text-slate-400 ml-1">
                Built for Rollers by <a href="https://rollercoin.com/p/meowrf" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">@notrllyanangel</a>
              </span>
              <span className="text-slate-700 mx-1">|</span>
              <button 
                onClick={() => setShowSupport(true)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-500/60 hover:text-emerald-400 transition-all group"
              >
                <Heart className="w-3 h-3 fill-emerald-500/10 group-hover:fill-emerald-500 transition-all" />
                Support
              </button>
            </div>
          </div>
          
          <div className="text-center md:text-right max-w-xs">
            <p className="text-xs text-slate-500 leading-relaxed">
              For suggestions or issues, find me in the general or Pilipino channel on {' '}
              <a 
                href="https://discord.gg/rollercoin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Discord
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupport(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#1e293b] border border-slate-700 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-emerald-500 fill-emerald-500/20" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Support Project</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowSupport(false);
                      setSelectedQr(null);
                    }}
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1 max-h-[380px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                  {donationOptions.map((opt) => (
                    <div 
                      key={opt.id}
                      className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all"
                    >
                      {/* Asset Icon */}
                      <div className="relative shrink-0">
                        {opt.icon ? (
                          <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/5">
                            <img 
                              src={opt.icon} 
                              alt={opt.symbol} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white font-bold text-xs bg-emerald-500">${opt.symbol[0]}</div>`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xs border border-white/10 shadow-inner bg-emerald-500">
                            {opt.symbol[0]}
                          </div>
                        )}
                      </div>

                      {/* Asset Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white tracking-tight">{opt.symbol}</span>
                          {opt.value && (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-medium text-slate-400 whitespace-nowrap">
                              {opt.name}
                            </span>
                          )}
                        </div>
                        {opt.value && (
                          <div className="font-mono text-[11px] text-slate-500 truncate">
                            {formatAddress(opt.value)}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setSelectedQr(opt)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Show QR Code"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                        
                        {opt.value && (
                          <button 
                            onClick={() => copyToClipboard(opt.value!, opt.id)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all relative"
                            title="Copy Address"
                          >
                            {copiedId === opt.id ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Copy className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-center text-[10px] text-slate-500 leading-relaxed">
                  Enjoying the site? Donations are completely optional but highly appreciated. ❣️
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Preview Pop-up */}
      <AnimatePresence>
        {selectedQr && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedQr(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 shadow-2xl max-w-sm w-full flex flex-col items-center"
            >
              <button 
                onClick={() => setSelectedQr(null)}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-full mb-6">
                {selectedQr.value ? (
                  <div className="bg-[#fdf6e3] border border-[#f9e8c8] rounded-2xl p-4 flex gap-3 items-center">
                    <div className="shrink-0">
                      <Info className="w-5 h-5 text-[#d4a017]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[#5c4b37] text-[13px] leading-snug">
                        Only send <span className="font-bold">{selectedQr.name} ({selectedQr.symbol})</span> assets to this address. Other assets will be lost forever.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <h4 className="text-slate-900 font-bold text-lg">{selectedQr.name}</h4>
                  </div>
                )}
              </div>

              <div className="w-full aspect-square bg-white rounded-2xl p-2 border-4 border-slate-50 mb-2">
                <img 
                  src={selectedQr.qr} 
                  alt={`${selectedQr.name} QR`} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-6">
                Thank you for your support!
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
