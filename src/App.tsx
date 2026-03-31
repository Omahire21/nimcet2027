import React, { useState } from 'react';
import { Play, Menu, Search, Bell, GraduationCap, ChevronRight, ArrowLeft, User, CheckCircle2, LogOut, X } from 'lucide-react';
import clsx from 'clsx';
import { channelsData, Channel, Playlist, Video } from './data';
import { motion, AnimatePresence } from 'framer-motion';
import { loginWithGoogle, auth, logoutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [activeChannel, setActiveChannel] = useState<Channel>(channelsData[0]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return true;
  });

  const [user, setUser] = useState<{name: string, email: string, avatar: string} | null>(() => {
    const saved = localStorage.getItem('nimcet_user_v1');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!user);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Sync with real Firebase state
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userData = {
          name: fbUser.displayName || "User",
          email: fbUser.email || "",
          avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${fbUser.displayName}&background=6366f1&color=fff`
        };
        setUser(userData);
        localStorage.setItem('nimcet_user_v1', JSON.stringify(userData));
        setIsAuthModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // YouTube API initialization
  React.useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log("YT API Ready");
    };
  }, []);

  const playerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (activeVideo && activePlaylist && (window as any).YT && (window as any).YT.Player) {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: activeVideo.id,
        playerVars: { 'autoplay': 1, 'rel': 0 },
        events: {
          'onStateChange': (event: any) => {
             // 0 is ENDED
             if (event.data === 0) {
                markVideoCompleted(activePlaylist.id, activeVideo.id);
             }
          }
        }
      });
    }
  }, [activeVideo, activePlaylist]);

  const [progressData, setProgressData] = useState<Record<string, { watched: string[], lastWatchedId?: string }>>(() => {
    try {
      const saved = localStorage.getItem('nimcet_progress_v3');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);


  const handleVideoClick = (playlist: Playlist, video: Video) => {
     setActiveVideo(video);
     setProgressData(prev => {
        const plData = prev[playlist.id] || { watched: [] };
        const newData = { ...prev, [playlist.id]: { ...plData, lastWatchedId: video.id } };
        localStorage.setItem('nimcet_progress_v3', JSON.stringify(newData));
        return newData;
     });
  };

  const markVideoCompleted = (playlistId: string, videoId: string) => {
    setProgressData(prev => {
      const plData = prev[playlistId] || { watched: [] };
      if (plData.watched.includes(videoId)) return prev;
      const newWatched = [...plData.watched, videoId];
      const newData = { ...prev, [playlistId]: { ...plData, watched: newWatched } };
      localStorage.setItem('nimcet_progress_v3', JSON.stringify(newData));
      return newData;
    });
  };

  const resetToHome = () => {
    setActivePlaylist(null);
    setActiveVideo(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f111a] text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col overflow-hidden h-screen">
      {/* Navbar */}
      <header className="flex-shrink-0 h-16 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#141621] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full md:hidden text-slate-500"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4 cursor-pointer" onClick={resetToHome}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <GraduationCap size={22} className="text-white relative top-[-1px]" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              NIMCET<span className="text-indigo-500">2027</span>
            </h1>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8 hidden sm:block relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search playlists, subjects, topics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 dark:text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isSearchFocused && searchQuery.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1c29] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-[70vh] overflow-y-auto"
              >
                {(() => {
                  const query = searchQuery.toLowerCase();
                  const playlistResults = channelsData.flatMap(c => c.playlists.map(p => ({ ...p, channel: c }))).filter(p => 
                    p.title.toLowerCase().includes(query) || p.channel.name.toLowerCase().includes(query)
                  );
                  
                  const videoResults = channelsData.flatMap(c => 
                    c.playlists.flatMap(p => 
                      p.videos.map(v => ({ ...v, playlist: p, channel: c }))
                    )
                  ).filter(v => v.title.toLowerCase().includes(query)).slice(0, 10);

                  if (playlistResults.length === 0 && videoResults.length === 0) {
                    return <div className="p-8 text-center text-slate-500 text-sm">No results found for "{searchQuery}"</div>;
                  }

                  return (
                    <div className="flex flex-col">
                      {playlistResults.length > 0 && (
                        <div className="p-2 bg-slate-50 dark:bg-white/5 uppercase text-[10px] font-bold tracking-widest text-slate-500">Playlists</div>
                      )}
                      {playlistResults.map(p => (
                        <div 
                          key={`pl-${p.id}`}
                          onClick={() => {
                            setActiveChannel(p.channel);
                            setActivePlaylist(p);
                            setActiveVideo(null);
                            setSearchQuery('');
                          }}
                          className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center gap-4 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0"
                        >
                          <img src={p.thumbnail} alt="" className="w-16 aspect-video rounded-lg object-cover shadow-sm" />
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.title}</h4>
                            <p className="text-[10px] text-slate-500">{p.channel.name.includes("Operating System") ? "TYBSC" : p.channel.name}</p>
                          </div>
                        </div>
                      ))}

                      {videoResults.length > 0 && (
                        <div className="p-2 bg-slate-50 dark:bg-white/5 uppercase text-[10px] font-bold tracking-widest text-slate-500">Lectures</div>
                      )}
                      {videoResults.map(v => (
                        <div 
                          key={`vid-${v.id}-${v.playlist.id}`}
                          onClick={() => {
                            setActiveChannel(v.channel);
                            setActivePlaylist(v.playlist);
                            handleVideoClick(v.playlist, v as any);
                            setSearchQuery('');
                          }}
                          className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center gap-4 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0"
                        >
                          <div className="w-16 aspect-video rounded-lg overflow-hidden relative">
                            <img src={v.thumbnail} alt="" className="w-full h-full object-cover shadow-sm" />
                            <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/40 group-hover:bg-indigo-600/60 transition-colors"><Play className="w-4 h-4 text-white fill-white" /></div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{v.title}</h4>
                            <p className="text-[10px] text-slate-500">{v.playlist.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setIsDark(!isDark)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition-colors relative mr-2 text-slate-500 dark:text-slate-400">
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={clsx("p-2 rounded-full transition-colors relative", isNotificationsOpen ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500" : "hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400")}
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-[#141621]"></span>
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#1a1c29] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <h3 className="font-bold">Notifications</h3>
                      <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full">3 New</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {[
                        { title: "New Lecture Added", desc: "Binary Tree Traversal added to DSA Playlist", time: "2h ago", icon: <Play className="w-4 h-4 text-indigo-500" /> },
                        { title: "Progress Milestone", desc: "You completed 50% of DBMS course!", time: "5h ago", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                        { title: "NIMCET Update", desc: "New mock test available for Sunday", time: "1d ago", icon: <GraduationCap className="w-4 h-4 text-amber-500" /> }
                      ].map((n, i) => (
                        <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-white/5 last:border-0 cursor-pointer transition-colors">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">{n.icon}</div>
                            <div>
                              <p className="text-sm font-semibold mb-0.5">{n.title}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{n.desc}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 ring-2 ring-white dark:ring-white/10 overflow-hidden active:scale-95 transition-transform"
            >
              {user ? <img src={user.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" /> : <User size={18} />}
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-48 bg-white dark:bg-[#1a1c29] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                      <img src={user?.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10 shadow-sm" referrerPolicy="no-referrer" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user?.name || 'Guest'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email || 'Sign in to sync'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await logoutUser();
                          localStorage.removeItem('nimcet_user_v1');
                          setUser(null);
                          setIsProfileOpen(false);
                          setIsAuthModalOpen(true);
                        } catch (err) {
                          console.error("Logout error", err);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-[#141621]/50 backdrop-blur-xl hidden md:flex flex-col py-6">
          <div className="px-6 pb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Coaching Channels</h2>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {channelsData.map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannel(channel);
                  setActivePlaylist(null);
                  setActiveVideo(null);
                }}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                  activeChannel.id === channel.id 
                    ? "bg-indigo-500/10 text-indigo-400 relative overflow-hidden" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 hover:text-slate-900 dark:text-slate-200"
                )}
              >
                {activeChannel.id === channel.id && (
                  <motion.div layoutId="sidebar-active" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
                )}
                <img src={channel.icon} alt={channel.name} className="w-8 h-8 rounded-full shadow-sm" />
                <span className="text-sm font-medium truncate">{channel.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-100 to-slate-50 dark:from-[#141621]/30 dark:to-[#0f111a]">
          <AnimatePresence mode="wait">
            {!activePlaylist && !activeVideo ? (
              <motion.div 
                key="channel-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6 md:p-8"
              >
                {/* Channel Header */}
                <div className="flex items-center gap-6 mb-10">
                  <img src={activeChannel.icon} alt={activeChannel.name} className="w-24 h-24 rounded-full border-2 border-indigo-500/20 shadow-2xl shadow-indigo-500/10" />
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent flex items-center gap-2">
                      {activeChannel.name}
                      <span className="bg-indigo-500/20 text-indigo-400 text-xs py-1 px-2 rounded font-medium ml-2">Verified Tutor</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                       {activeChannel.id === 'sybsc-cs' ? activeChannel.subscribers : `${activeChannel.subscribers} • Official NIMCET Prep Material`}
                    </p>
                  </div>
                </div>

                {/* Playlists Grid */}
                <div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Play className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                    Lecture Playlists
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeChannel.playlists.map(playlist => (
                      <div 
                        key={playlist.id}
                        onClick={() => setActivePlaylist(playlist)}
                        className="group cursor-pointer flex flex-col gap-3"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-white/10 group-hover:ring-indigo-500/50 transition-all duration-300 shadow-xl shadow-black/20 group-hover:shadow-indigo-500/10">
                          <img src={playlist.thumbnail} alt={playlist.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-3 pt-12">
                            <div className="flex justify-between items-end mb-2">
                              <p className="text-xs font-medium text-slate-800 dark:text-white/90 bg-white/80 dark:bg-black/40 backdrop-blur-md w-max px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
                                {playlist.videoCount} lectures
                              </p>
                              {progressData[playlist.id]?.watched && (
                                <p className="text-[10px] font-medium text-indigo-300">
                                  {Math.round((progressData[playlist.id].watched.length / playlist.videoCount) * 100)}%
                                </p>
                              )}
                            </div>
                            <div className="w-full h-1 bg-slate-300 dark:bg-white/20 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressData[playlist.id]?.watched ? Math.round((progressData[playlist.id].watched.length / playlist.videoCount) * 100) : 0}%` }}></div>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-indigo-600/90 backdrop-blur-md flex items-center justify-center transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl shadow-indigo-600/40">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                            {playlist.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {playlist.title.toLowerCase().includes("operating system") ? "TYBSC CS (Computer Science)" : activeChannel.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : activePlaylist && !activeVideo ? (
              <motion.div 
                key="playlist-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 md:p-8"
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Playlist Highlights */}
                  <div className="lg:w-1/3 flex-shrink-0">
                    <button 
                      onClick={() => setActivePlaylist(null)}
                      className="hidden md:flex items-center gap-2 mb-8 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-all font-bold group bg-indigo-50/80 dark:bg-indigo-900/40 px-5 py-2.5 rounded-full w-fit shadow-sm hover:shadow-md active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to channel
                    </button>
                    <div className="bg-white dark:bg-[#141621] p-5 rounded-2xl border border-slate-200 dark:border-white/5 sticky top-6 shadow-xl shadow-black/20">
                      <div className="aspect-video rounded-xl overflow-hidden mb-5">
                         <img src={activePlaylist.thumbnail} alt={activePlaylist.title} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{activePlaylist.title}</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">
                        {activePlaylist.title.toLowerCase().includes("operating system") ? "TYBSC CS (Computer Science)" : activeChannel.name}
                      </p>
                      <p className="text-xs text-slate-500 mb-4 flex gap-3 font-medium">
                        <span className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">{activePlaylist.videoCount} lectures</span>
                      </p>
                      
                      {progressData[activePlaylist.id]?.watched && (
                        <div className="mb-6">
                           <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                              <span>Overall Progress</span>
                              <span className="text-indigo-400">{Math.round((progressData[activePlaylist.id].watched.length / activePlaylist.videoCount) * 100)}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((progressData[activePlaylist.id].watched.length / activePlaylist.videoCount) * 100)}%` }}></div>
                           </div>
                        </div>
                      )}
                      
                      {activePlaylist.videos.length > 0 && (
                        <button 
                          onClick={() => {
                            const plData = progressData[activePlaylist.id];
                            const resumeVideoId = plData?.lastWatchedId;
                            const videoToPlay = activePlaylist.videos.find(v => v.id === resumeVideoId) || activePlaylist.videos[0];
                            handleVideoClick(activePlaylist, videoToPlay);
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                        >
                          <Play className="w-4 h-4 fill-white" /> {progressData[activePlaylist.id]?.watched?.length > 0 ? "Resume Learning" : "Start Learning"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Video List */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-6 flex items-center justify-between">
                      Lectures Overview 
                    </h3>
                    <div className="space-y-3">
                      {activePlaylist.videos.map((video, idx) => (
                        <div 
                          key={video.id}
                          onClick={() => handleVideoClick(activePlaylist, video)}
                          className="flex gap-4 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                        >
                          <div className="w-6 flex items-center justify-center text-slate-600 font-medium group-hover:text-indigo-400 text-sm">
                            {progressData[activePlaylist.id]?.watched?.includes(video.id) ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0 shadow-md">
                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute bottom-1.5 right-1.5 bg-white/95 dark:bg-black/80 backdrop-blur-sm text-[10px] font-medium px-1.5 py-0.5 rounded text-slate-800 dark:text-white/90">
                              {video.duration}
                            </div>
                          </div>
                          <div className="flex-1 py-1">
                            <h4 className="font-medium text-slate-900 dark:text-slate-200 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                              {video.title}
                            </h4>
                            <p className="text-sm text-slate-500 mt-2">{activeChannel.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activePlaylist && activeVideo ? (
              <motion.div 
                key="player-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col lg:flex-row overflow-hidden"
              >
                {/* Main Player Area */}
                <div className="flex-1 flex flex-col bg-black overflow-y-auto">
                   <div className="p-4 bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-10 flex items-center justify-between">
                      <button 
                         onClick={() => setActiveVideo(null)}
                         className="text-slate-700 dark:text-white/80 hover:text-indigo-600 dark:hover:text-white flex items-center gap-2 text-sm bg-white/80 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-black/80 px-4 py-2 rounded-full transition-all backdrop-blur-md"
                       >
                         <ArrowLeft className="w-4 h-4" /> Back to Playlist
                       </button>
                   </div>
                   
                    <div className="flex-1 relative min-h-[50vh] xl:min-h-[70vh]">
                      <div id="youtube-player" className="absolute inset-0 w-full h-full border-0"></div>
                    </div>

                    {/* Video Meta Info */}
                    <div className="p-6 md:p-8 bg-slate-50 dark:bg-[#0f111a] flex-shrink-0 pt-8">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                          <h1 className="text-2xl font-bold">{activeVideo?.title}</h1>
                          <div 
                            className={clsx(
                              "flex-shrink-0 px-6 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 shadow-xl",
                              activePlaylist && progressData[activePlaylist.id]?.watched?.includes(activeVideo.id)
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
                                : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-200 dark:border-white/10"
                            )}
                          >
                            {activePlaylist && progressData[activePlaylist.id]?.watched?.includes(activeVideo.id) ? (
                              <><CheckCircle2 className="w-5 h-5 animate-pulse" /> Completed ✨</>
                            ) : (
                              "Auto-completes at 100%"
                            )}
                          </div>
                       </div>
                       
                      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
                       <div className="flex items-center gap-4">
                         <img src={activeChannel.icon} alt={activeChannel.name} className="w-12 h-12 rounded-full ring-2 ring-slate-300 dark:ring-white/10" />
                         <div>
                           <h3 className="font-semibold text-lg">{activeChannel.name}</h3>
                           <p className="text-slate-500 dark:text-slate-400 text-sm">{activeChannel.subscribers}</p>
                         </div>
                       </div>
                       
                     </div>
                   </div>
                </div>

                {/* Next Videos Sidebar */}
                <div className="w-full lg:w-96 bg-white dark:bg-[#141621] border-l border-slate-200 dark:border-white/5 flex flex-col h-full">
                  <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-[#0f111a]/50">
                    <h3 className="font-semibold">Next from Playlist</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-500/20 text-indigo-400">Autoplay On</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activePlaylist?.videos.map((video, idx) => (
                      <div 
                        key={video.id}
                        onClick={() => handleVideoClick(activePlaylist!, video)}
                         className={clsx(
                           "flex gap-3 group cursor-pointer p-2 rounded-xl transition-all border border-transparent",
                           activeVideo?.id === video.id 
                             ? "bg-indigo-600/10 border-indigo-500/30" 
                             : "hover:bg-slate-100 dark:hover:bg-white/5"
                         )}
                      >
                         <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0">
                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute bottom-1 right-1 bg-white/95 dark:bg-black/80 backdrop-blur-sm text-[9px] font-medium px-1 rounded text-slate-800 dark:text-white/90">
                              {video.duration}
                            </div>
                            {activeVideo?.id === video.id && (
                              <div className="absolute inset-0 bg-indigo-300/40 dark:bg-indigo-900/40 flex items-center justify-center">
                                <div className="flex gap-1">
                                  <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                  <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                  <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 py-0.5 flex flex-col">
                            <h4 className={clsx(
                              "font-medium text-sm line-clamp-2 leading-tight",
                              activeVideo?.id === video.id ? "text-indigo-400" : "text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-white"
                            )}>
                            {idx + 1}. {video.title}
                            </h4>
                            <div className="flex items-center justify-between mt-auto">
                               <p className="text-xs text-slate-500">{activeChannel.name}</p>
                               {activePlaylist && progressData[activePlaylist.id]?.watched?.includes(video.id) && (
                                 <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    Done
                                 </span>
                               )}
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>
      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-[#1a1c29] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <div className="h-2 bg-indigo-600"></div>
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                  <GraduationCap size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to NIMCET2027</h2>
                <p className="text-slate-500 text-sm mb-8">Sign in to sync your progress across all your devices and start learning.</p>
                
                 <button 
                  disabled={isAuthenticating}
                  onClick={async () => {
                    setIsAuthenticating(true);
                    try {
                      await loginWithGoogle();
                    } catch (err) {
                      console.error("Google Auth Error:", err);
                      // In case they didn't set up keys yet
                      alert("Firebase integration ready! Please add your genuine API keys to src/firebase.ts to enable Google Login.");
                    } finally {
                      setIsAuthenticating(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.98] mb-4 disabled:opacity-50"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="" />
                  {isAuthenticating ? "Connecting..." : "Continue with Google"}
                </button>
                
                <p className="text-[10px] text-slate-400">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#141621] z-[200] md:hidden flex flex-col shadow-2xl shadow-black/40"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <GraduationCap size={18} className="text-white" />
                  </div>
                  <span className="font-bold text-lg">Channels</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {channelsData.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveChannel(channel);
                      setActivePlaylist(null);
                      setActiveVideo(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
                      activeChannel.id === channel.id 
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                    )}
                  >
                    <img src={channel.icon} alt="" className="w-10 h-10 rounded-full shadow-md" />
                    <span className="font-semibold text-sm">{channel.name}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
export default App;
