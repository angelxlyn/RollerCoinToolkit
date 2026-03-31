import React from 'react';
import { motion } from 'motion/react';
import { Calculator, Hammer, Layout as LayoutIcon, Scan, ArrowRight, Zap, Shield, TrendingUp, Youtube, BookOpen, ExternalLink, PlayCircle, X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence } from 'motion/react';

interface DashboardProps {
  onNavigate: (tool: any) => void;
}

interface Guide {
  title: string;
  type: string;
  icon: any;
  color: string;
  image: string;
  duration?: string;
  youtubeId?: string;
  readTime?: string;
}

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

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [playingIndex, setPlayingIndex] = React.useState<number | null>(null);
  const [expandedVideo, setExpandedVideo] = React.useState<{ id: string; title: string } | null>(null);
  const [activeDot, setActiveDot] = React.useState(0);
  const [isHoveringGuides, setIsHoveringGuides] = React.useState(false);
  const [scrollState, setScrollState] = React.useState({
    toolkit: { left: false, right: false },
    guides: { left: false, right: false }
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const toolkitScrollRef = React.useRef<HTMLDivElement>(null);

  const guides: Guide[] = [
    {
      title: "How to Earn Money Playing – Ultimate Beginner’s Blueprint",
      type: "Video Guide",
      icon: Youtube,
      color: "text-red-500",
      image: "https://img.youtube.com/vi/UfN9w3nSY8E/maxresdefault.jpg",
      duration: "10:33",
      youtubeId: "UfN9w3nSY8E"
    },
    {
      title: "Explore the Game with Ease",
      type: "Video Guide",
      icon: Youtube,
      color: "text-red-500",
      image: "https://img.youtube.com/vi/QR6TnsfkjcQ/maxresdefault.jpg",
      duration: "20:17",
      youtubeId: "QR6TnsfkjcQ"
    },
    {
      title: "Hamster Expeditions",
      type: "Video Guide",
      icon: Youtube,
      color: "text-red-500",
      image: "https://img.youtube.com/vi/RIizpBnoqUw/maxresdefault.jpg",
      duration: "11:33",
      youtubeId: "RIizpBnoqUw"
    },
    {
      title: "Beginner's Guide to Events",
      type: "Video Guide",
      icon: Youtube,
      color: "text-red-500",
      image: "https://img.youtube.com/vi/3ZWwpNRFLX8/maxresdefault.jpg",
      duration: "11:40",
      youtubeId: "3ZWwpNRFLX8"
    },
    {
      title: "How to Calculate Your Power",
      type: "Video Guide",
      icon: Youtube,
      color: "text-red-500",
      image: "https://img.youtube.com/vi/7WIEpRTuwvk/maxresdefault.jpg",
      duration: "10:00",
      youtubeId: "7WIEpRTuwvk"
    },
    {
      title: "How Much Do You REALLY EARN in Rollercoin?",
      type: "Video Guide",
      icon: Youtube,
      color: "text-red-500",
      image: "https://img.youtube.com/vi/Hes3cA6CB2U/maxresdefault.jpg",
      duration: "15:59",
      youtubeId: "Hes3cA6CB2U"
    } 
  ];

  const checkScroll = React.useCallback(() => {
    const updateState = (ref: React.RefObject<HTMLDivElement | null>, key: 'toolkit' | 'guides') => {
      if (ref.current) {
        const { scrollLeft, scrollWidth, clientWidth } = ref.current;
        setScrollState(prev => ({
          ...prev,
          [key]: {
            left: scrollLeft > 10, // Small buffer
            right: scrollLeft + clientWidth < scrollWidth - 10
          }
        }));
      }
    };

    updateState(toolkitScrollRef, 'toolkit');
    updateState(scrollRef, 'guides');
  }, []);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (playingIndex === null && !expandedVideo && !isHoveringGuides && scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 20;
        
        if (isAtEnd) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll by roughly one item width
          const itemWidth = scrollWidth / guides.length;
          scrollRef.current.scrollBy({ left: itemWidth, behavior: 'smooth' });
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [playingIndex, expandedVideo, isHoveringGuides, guides.length]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const itemWidth = scrollWidth / guides.length;
      const index = Math.round(scrollLeft / itemWidth);
      setActiveDot(index);
    }
    checkScroll();
  };

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;
      
      // Wrap around logic
      if (direction === 'right' && scrollLeft + clientWidth >= scrollWidth - 20) {
        ref.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (direction === 'left' && scrollLeft <= 10) {
        ref.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
      } else {
        ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const features = [
    {
      id: 'calculator',
      title: 'Earnings Calculator',
      description: 'Estimate your daily, weekly, and monthly profits across all currencies.',
      icon: Calculator,
      color: 'from-blue-500 to-cyan-500',
      delay: 0.1
    },
    {
      id: 'parts',
      title: 'Parts & Crafting',
      description: 'Optimize your part conversions and find the cheapest way to upgrade.',
      icon: (props: any) => <CustomIcon src="/icons/parts.svg" {...props} />,
      color: 'from-emerald-500 to-teal-500',
      delay: 0.2
    },
    {
      id: 'simulator',
      title: 'Room Simulator',
      description: 'Plan your room layout, manage rack bonuses, and maximize power.',
      icon: LayoutIcon,
      color: 'from-purple-500 to-pink-500',
      delay: 0.3,
      disabled: true
    },
    {
      id: 'search',
      title: 'Miner Search',
      description: 'Identify miners from images and search by visual characteristics.',
      icon: (props: any) => <CustomIcon src="/icons/miners.svg" {...props} />,
      color: 'from-orange-500 to-red-500',
      delay: 0.4
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 lg:p-8 border border-slate-700 shadow-2xl">
        <div className="relative z-10 max-w-xl">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl lg:text-5xl font-bold text-white mb-3 leading-tight"
          >
            Master the <br />
            <span className="text-emerald-400">RollerCoin</span> Economy
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-400 leading-relaxed"
          >
            RollerToolkit is your all-in-one companion for navigating the RollerCoin universe. 
            Whether you're calculating your next big move, optimizing your crafting strategy, 
            or designing the perfect mining room, we provide the data-driven insights you 
            need to maximize your crypto earnings and dominate the leaderboard.
          </motion.p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[120px]" />
        </div>
      </section>

      {/* Feature Grid */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 px-2">Explore the Toolkit</h2>
        <div className="relative px-2 group/toolkit">
          {/* Navigation Arrows */}
          <AnimatePresence>
            {(scrollState.toolkit.left || scrollState.toolkit.right) && (
              <>
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => scroll(toolkitScrollRef, 'left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-slate-900/90 border border-slate-700/50 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-emerald-500 hover:border-emerald-400 transition-all -ml-2 md:-ml-4"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                
                <motion.button 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={() => scroll(toolkitScrollRef, 'right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-slate-900/90 border border-slate-700/50 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-emerald-500 hover:border-emerald-400 transition-all -mr-2 md:-mr-4"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          <div 
            ref={toolkitScrollRef}
            onScroll={checkScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-2 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {features.map((feature: any) => {
              const Icon = feature.icon;
              return (
                <motion.button
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: feature.delay }}
                  onClick={() => !feature.disabled && onNavigate(feature.id)}
                  disabled={feature.disabled}
                  className={cn(
                    "snap-start shrink-0 w-full md:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] group relative p-6 bg-slate-800/40 rounded-3xl border border-slate-700/50 transition-all text-left overflow-hidden h-full flex flex-col",
                    feature.disabled 
                      ? "opacity-60 cursor-not-allowed grayscale-[0.5]" 
                      : "hover:bg-slate-800/60 hover:border-emerald-500/50 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform flex-shrink-0",
                      !feature.disabled && "group-hover:scale-110",
                      feature.color
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-white leading-tight">{feature.title}</h3>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed flex-1">{feature.description}</p>
                  
                  {/* Hover Effect */}
                  {!feature.disabled && (
                    <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* RollerCoin 101 Section */}
      <section className="pt-0">
        <div className="flex items-center gap-4 mb-6 px-2">
          <h2 className="text-2xl font-bold text-white">RollerCoin 101</h2>
          <a 
            href="https://www.youtube.com/@RC.Profits" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-colors uppercase tracking-[0.15em] pt-1.5"
          >
            by: <span className="decoration-slate-700 hover:decoration-emerald-500">RC Profits</span>
          </a>
        </div>
        
        <div 
          className="relative px-2"
          onMouseEnter={() => setIsHoveringGuides(true)}
          onMouseLeave={() => setIsHoveringGuides(false)}
        >
          {/* Navigation Arrows */}
          <AnimatePresence>
            {(scrollState.guides.left || scrollState.guides.right) && (
              <>
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => scroll(scrollRef, 'left')}
                  className="absolute left-0 top-[35%] -translate-y-1/2 z-20 w-10 h-10 bg-slate-900/90 border border-slate-700/50 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-emerald-500 hover:border-emerald-400 transition-all -ml-2 md:-ml-4"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                
                <motion.button 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={() => scroll(scrollRef, 'right')}
                  className="absolute right-0 top-[35%] -translate-y-1/2 z-20 w-10 h-10 bg-slate-900/90 border border-slate-700/50 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-emerald-500 hover:border-emerald-400 transition-all -mr-2 md:-mr-4"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {guides.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                className="snap-start shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] group cursor-pointer flex flex-col"
              >
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-2 border border-slate-700/50 bg-slate-900">
                  {playingIndex === i && item.youtubeId ? (
                    <div className="absolute inset-0">
                      <iframe
                        src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingIndex(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                      
                      {/* Floating Labels */}
                      <div className="absolute top-4 left-4">
                        <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-full flex items-center gap-2 border border-slate-700/50">
                          <item.icon className={cn("w-3 h-3", item.color)} />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.type}</span>
                        </div>
                      </div>

                      {item.duration && (
                        <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white">
                          {item.duration}
                        </div>
                      )}

                      {/* Action Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.youtubeId && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlayingIndex(i);
                              }}
                              className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                            >
                              <PlayCircle className="w-6 h-6 text-white" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedVideo({ id: item.youtubeId!, title: item.title });
                              }}
                              className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
                              title="Expand Video"
                            >
                              <Maximize2 className="w-5 h-5 text-white" />
                            </button>
                          </>
                        )}
                        {!item.youtubeId && (
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                            <ExternalLink className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 flex-1">
                  {item.title}
                </h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {expandedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div 
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" 
              onClick={() => setExpandedVideo(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <iframe
                src={`https://www.youtube.com/embed/${expandedVideo.id}?autoplay=1`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
                <h2 className="text-xl font-bold text-white">{expandedVideo.title}</h2>
                <button 
                  onClick={() => setExpandedVideo(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors pointer-events-auto"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
