import React, { useState, useEffect, useRef } from 'react';
import { Play, Menu, Search, Bell, GraduationCap, ChevronRight, ArrowLeft, User, CheckCircle2, LogOut, X, Plus, Trash2, Edit2, Save, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { Channel, Playlist, Video } from './data';
import { motion, AnimatePresence } from 'framer-motion';
import { loginWithGoogle, auth, logoutUser, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const ADMIN_EMAIL = "ahiroom30@gmail.com";

function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
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

  const playerRef = useRef<any>(null);

  // Sync with Firestore
  useEffect(() => {
    const q = query(collection(db, "channels"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
      setChannels(docs);
      if (docs.length > 0 && !activeChannel) {
        setActiveChannel(docs[0]);
      }
    });
    return () => unsubscribe();
  }, [activeChannel]);

  // Sync with real Firebase state
  useEffect(() => {
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

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // YouTube API initialization
  useEffect(() => {
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

  useEffect(() => {
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
    setIsAdminMode(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0c14] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="h-20 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0f111a]/80 backdrop-blur-xl sticky top-0 z-[100] flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full lg:hidden"
          >
            <Menu size={24} />
          </button>
          <div 
            onClick={resetToHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40 transform group-hover:rotate-6 transition-transform">
              <GraduationCap className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter hidden sm:block">NIMCET<span className="text-indigo-600">2027</span></span>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-8 relative hidden md:block">
          <div className={clsx(
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300",
            isSearchFocused ? "bg-white dark:bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.02]" : "bg-slate-100 dark:bg-white/5 border-transparent"
          )}>
            <Search size={18} className={isSearchFocused ? "text-indigo-500" : "text-slate-400"} />
            <input 
              type="text" 
              placeholder="Search playlists, subjects, topics..." 
              className="bg-transparent border-none outline-none w-full text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
          </div>
          
          <AnimatePresence>
            {searchQuery && isSearchFocused && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#1a1c29] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[110]"
              >
                {(() => {
                  const query = searchQuery.toLowerCase();
                  const playlistResults: any[] = [];
                  const videoResults: any[] = [];

                  channels.forEach(c => {
                    c.playlists.forEach(p => {
                      if (p.title.toLowerCase().includes(query)) {
                        playlistResults.push({ ...p, channel: c });
                      }
                      p.videos.forEach(v => {
                        if (v.title.toLowerCase().includes(query)) {
                          videoResults.push({ ...v, playlist: p, channel: c });
                        }
                      });
                    });
                  });

                  if (playlistResults.length === 0 && videoResults.length === 0) {
                    return <div className="p-8 text-center text-slate-500 text-sm">No results found for "{searchQuery}"</div>;
                  }

                  return (
                    <div className="flex flex-col">
                      {playlistResults.length > 0 && (
                        <div className="p-2 bg-slate-50 dark:bg-white/5 uppercase text-[10px] font-bold tracking-widest text-slate-500">Playlists</div>
                      )}
                      {playlistResults.map(p => (
                        <div key={`pl-${p.id}`} onClick={() => { setActiveChannel(p.channel); setActivePlaylist(p); setActiveVideo(null); setSearchQuery(''); }} className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center gap-4 border-b last:border-0 border-slate-100 dark:border-white/5">
                           <img src={p.thumbnail} alt="" className="w-16 aspect-video rounded-lg object-cover" />
                           <div className="flex-1 overflow-hidden">
                             <h4 className="text-sm font-bold truncate">{p.title}</h4>
                             <p className="text-[10px] text-slate-500">{p.channel.name}</p>
                           </div>
                        </div>
                      ))}
                      {videoResults.length > 0 && (
                        <div className="p-2 bg-slate-50 dark:bg-white/5 uppercase text-[10px] font-bold tracking-widest text-slate-500 mt-2">Lectures</div>
                      )}
                      {videoResults.map((v, i) => (
                        <div key={`vid-${v.id}-${i}`} onClick={() => { setActiveChannel(v.channel); setActivePlaylist(v.playlist); handleVideoClick(v.playlist, v); setSearchQuery(''); }} className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center gap-4 border-b last:border-0 border-slate-100 dark:border-white/5">
                           <div className="w-16 aspect-video rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                             <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 overflow-hidden">
                             <h4 className="text-sm font-bold truncate">{v.title}</h4>
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
            <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className={clsx("p-2 rounded-full transition-colors relative", isNotificationsOpen ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500" : "hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400")}>
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-[#141621]"></span>
            </button>
            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#1a1c29] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
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
                        <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-white/5 last:border-0 cursor-pointer">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">{n.icon}</div>
                            <div>
                               <p className="text-sm font-bold mb-0.5">{n.title}</p>
                               <p className="text-xs text-slate-500">{n.desc}</p>
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
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg overflow-hidden active:scale-95 transition-transform">
              {user ? <img src={user.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" /> : <User size={18} />}
            </button>
            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-56 bg-white dark:bg-[#1a1c29] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <img src={user?.avatar} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{user?.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <div className="p-2 space-y-1">
                      {user?.email === ADMIN_EMAIL && (
                        <button onClick={() => { setIsAdminMode(true); setIsProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors">
                          <Edit2 size={16} /> Admin Dashboard
                        </button>
                      )}
                      <button onClick={async () => { await logoutUser(); localStorage.removeItem('nimcet_user_v1'); setUser(null); setIsProfileOpen(false); setIsAuthModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-[#141621]/50 backdrop-blur-xl hidden lg:flex flex-col py-6">
          <div className="px-6 pb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Learning Channels</h2>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {channels.map(channel => (
              <button key={channel.id} onClick={() => { setActiveChannel(channel); setActivePlaylist(null); setActiveVideo(null); }} className={clsx("w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all", activeChannel?.id === channel.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5")}>
                <img src={channel.icon} alt="" className="w-8 h-8 rounded-full" />
                <span className="text-sm font-bold truncate">{channel.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0a0c14] relative">
          {isAdminMode ? (
            <AdminPanel onExit={() => setIsAdminMode(false)} channels={channels} />
          ) : activeVideo && activePlaylist ? (
            <div className="h-full flex flex-col lg:flex-row overflow-hidden">
               <div className="flex-1 flex flex-col bg-black">
                 <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10">
                    <button onClick={() => setActiveVideo(null)} className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full hover:bg-white/20 transition-all font-bold text-sm">
                      <ArrowLeft size={18} /> Back
                    </button>
                 </div>
                 <div className="flex-1">
                    <div id="youtube-player" className="w-full h-full"></div>
                 </div>
                 <div className="p-6 md:p-10 bg-white dark:bg-[#0f111a] border-t border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <h1 className="text-2xl font-black">{activeVideo.title}</h1>
                       <div className={clsx("px-6 py-2 rounded-full font-black text-sm flex items-center gap-2", progressData[activePlaylist.id]?.watched?.includes(activeVideo.id) ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                         {progressData[activePlaylist.id]?.watched?.includes(activeVideo.id) ? <><CheckCircle2 size={18} /> COMPLETED</> : "AUTO-COMPLETES AT END"}
                       </div>
                    </div>
                    <div className="flex items-center gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                       <img src={activeChannel?.icon} className="w-12 h-12 rounded-full" alt="" />
                       <div>
                         <p className="font-black">{activeChannel?.name}</p>
                         <p className="text-xs text-slate-500">{activeChannel?.subscribers} subscribers</p>
                       </div>
                    </div>
                 </div>
               </div>
               <div className="w-full lg:w-96 bg-white dark:bg-[#0f111a] border-l border-slate-200 dark:border-white/5 overflow-y-auto">
                  <div className="p-4 border-b border-slate-200 dark:border-white/5 sticky top-0 bg-white dark:bg-[#0f111a] z-10">
                    <h3 className="font-black text-sm">UP NEXT</h3>
                  </div>
                  <div className="divide-y dark:divide-white/5">
                    {activePlaylist.videos.map((v: Video, i: number) => (
                      <div key={v.id} onClick={() => handleVideoClick(activePlaylist, v)} className={clsx("p-4 flex gap-3 cursor-pointer group transition-colors", activeVideo.id === v.id ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5")}>
                         <div className="w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0 relative">
                            <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                            <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1 rounded">{v.duration}</div>
                            {activeVideo.id === v.id && <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center"><Play size={20} fill="currentColor" className="text-white" /></div>}
                         </div>
                         <div className="flex-1 overflow-hidden">
                           <h4 className={clsx("text-xs font-bold line-clamp-2 leading-tight", activeVideo.id === v.id ? "text-indigo-500" : "group-hover:text-indigo-600 dark:group-hover:text-white")}>{i+1}. {v.title}</h4>
                           <p className="text-[10px] text-slate-500 mt-2">{activeChannel?.name}</p>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          ) : activePlaylist ? (
            <div className="p-6 md:p-12 max-w-7xl mx-auto">
               <div className="flex flex-col md:flex-row gap-10 mb-16 items-center">
                  <div className="w-full md:w-96 aspect-video rounded-3xl overflow-hidden shadow-2xl relative group">
                     <img src={activePlaylist.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={48} className="text-white fill-white" />
                     </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                     <button onClick={() => setActivePlaylist(null)} className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-4 font-bold text-sm"><ArrowLeft size={16} /> Back to channel</button>
                     <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">{activePlaylist.title}</h1>
                     <p className="text-indigo-600 font-bold">{activePlaylist.videoCount} Exclusive Lectures</p>
                  </div>
               </div>

               <div className="grid gap-4">
                  {activePlaylist.videos.map((v: Video, i: number) => (
                    <div key={v.id} onClick={() => handleVideoClick(activePlaylist, v)} className="flex items-center gap-4 p-5 bg-white dark:bg-[#0f111a] rounded-2xl border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 hover:shadow-xl transition-all cursor-pointer group">
                       <div className="w-8 font-black text-slate-300 group-hover:text-indigo-500 transition-colors">{(i+1).toString().padStart(2, '0')}</div>
                       <div className="w-32 md:w-48 aspect-video rounded-xl overflow-hidden relative">
                         <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                         <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1.5 py-0.5 rounded font-bold">{v.duration}</div>
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <h4 className="font-bold text-sm md:text-lg truncate group-hover:text-indigo-500 transition-colors">{v.title}</h4>
                         {progressData[activePlaylist.id]?.watched?.includes(v.id) && <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> WATCHED</span>}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : activeChannel ? (
            <div className="p-6 md:p-12 max-w-7xl mx-auto">
               <div className="flex flex-col md:flex-row items-center gap-8 mb-20 bg-white dark:bg-[#0f111a] p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 opacity-5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                  <img src={activeChannel.icon} className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] shadow-2xl relative" alt="" />
                  <div className="text-center md:text-left relative">
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">{activeChannel.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-lg mb-4">{activeChannel.subscribers} Subscribers • {activeChannel.playlists.length} Courses</p>
                    <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">{activeChannel.description}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {activeChannel.playlists.map(p => (
                    <div key={p.id} onClick={() => setActivePlaylist(p)} className="bg-white dark:bg-[#0f111a] rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                       <div className="aspect-video relative overflow-hidden">
                          <img src={p.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                             <Play size={40} className="text-white fill-white" />
                          </div>
                          {progressData[p.id]?.watched && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
                              <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" style={{ width: `${(progressData[p.id].watched.length / p.videoCount) * 100}%` }} />
                            </div>
                          )}
                       </div>
                       <div className="p-8">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">{p.videoCount} LECTURES</span>
                            {progressData[p.id]?.watched && <span className="text-[10px] font-black text-emerald-500">{Math.round((progressData[p.id].watched.length / p.videoCount) * 100)}% COMPLETE</span>}
                          </div>
                          <h4 className="font-black text-lg group-hover:text-indigo-500 transition-colors line-clamp-1">{p.title}</h4>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center opacity-30">
                <GraduationCap size={120} className="mx-auto mb-6" />
                <p className="text-2xl font-black italic">CHOOSE YOUR PATHWAY</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#0f111a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden"
            >
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3 transform">
                  <GraduationCap size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-black mb-3 tracking-tight">Welcome to NIMCET2027</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 leading-relaxed">Sign in to sync your progress across all your devices and start learning.</p>
                
                <button 
                  onClick={async () => {
                   try { await loginWithGoogle(); } catch(e) {}
                  }}
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-500 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-slate-200/50 dark:shadow-none"
                >
                  <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" className="w-5 h-5" alt="Google" />
                  <span>Continue with Google</span>
                </button>
                
                <p className="text-[10px] text-slate-400 mt-8 leading-tight">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500]" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-[#0f111a] z-[501] p-6 flex flex-col">
              <div className="flex items-center justify-between mb-10">
                <span className="text-2xl font-black">NIMCET<span className="text-indigo-600">2027</span></span>
                <button onClick={() => setIsMobileMenuOpen(false)}><X /></button>
              </div>
              <div className="space-y-4">
                {channels.map(c => (
                  <button key={c.id} onClick={() => { setActiveChannel(c); setActivePlaylist(null); setActiveVideo(null); setIsMobileMenuOpen(false); }} className={clsx("w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all", activeChannel?.id === c.id ? "bg-indigo-600 text-white shadow-xl" : "bg-slate-50 dark:bg-white/5 text-slate-500")}>
                    <img src={c.icon} className="w-10 h-10 rounded-full" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ADMIN PANEL COMPONENT
function AdminPanel({ onExit, channels }: { onExit: () => void, channels: Channel[] }) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '', subscribers: '', description: '', playlistTitle: '', playlistThumbnail: '', videoTitle: '', videoId: '', videoDuration: '' });

  const handleAddChannel = async () => {
    if (!form.name || !form.icon) return alert("Fill mandatory fields");
    await addDoc(collection(db, "channels"), {
      name: form.name,
      icon: form.icon,
      subscribers: form.subscribers || "0",
      description: form.description || "",
      playlists: []
    });
    setForm({ ...form, name: '', icon: '', subscribers: '', description: '' });
    setIsAddingChannel(false);
  };

  const deleteChannel = async (id: string) => {
    if (confirm("Delete this channel?")) await deleteDoc(doc(db, "channels", id));
  };

  const addPlaylist = async () => {
    if (!selectedChannel || !form.playlistTitle || !form.playlistThumbnail) return alert("Playlist details required");
    const updatedPlaylists = [
      ...selectedChannel.playlists,
      {
        id: Date.now().toString(),
        title: form.playlistTitle,
        thumbnail: form.playlistThumbnail,
        videoCount: 0,
        videos: []
      }
    ];
    await updateDoc(doc(db, "channels", selectedChannel.id), { playlists: updatedPlaylists });
    setForm({ ...form, playlistTitle: '', playlistThumbnail: '' });
    setSelectedChannel({ ...selectedChannel, playlists: updatedPlaylists } as any);
  };

  const addVideo = async (playlistId: string) => {
    if (!selectedChannel || !form.videoTitle || !form.videoId) return alert("Video details required");
    const updatedPlaylists = selectedChannel.playlists.map(p => {
      if (p.id === playlistId) {
        const newVideo = {
          id: form.videoId,
          title: form.videoTitle,
          thumbnail: `https://img.youtube.com/vi/${form.videoId}/mqdefault.jpg`,
          duration: form.videoDuration || "0:00"
        };
        return { ...p, videos: [...p.videos, newVideo], videoCount: p.videos.length + 1 };
      }
      return p;
    });
    await updateDoc(doc(db, "channels", selectedChannel.id), { playlists: updatedPlaylists });
    setForm({ ...form, videoTitle: '', videoId: '', videoDuration: '' });
    setSelectedChannel({ ...selectedChannel, playlists: updatedPlaylists } as any);
  };

  return (
    <div className="p-6 md:p-12">
      <div className="flex items-center justify-between mb-10 pb-6 border-b dark:border-white/5">
        <div>
          <h1 className="text-3xl font-black">NIMCET Master Console</h1>
          <p className="text-slate-500 text-sm">Real-time Cloud Management</p>
        </div>
        <button onClick={onExit} className="bg-rose-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-rose-500/20">Exit Console</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Channels */}
        <div className="lg:col-span-1 space-y-4">
           <div className="flex items-center justify-between px-2">
             <h2 className="font-black text-xl">CHANNELS</h2>
             <button onClick={() => setIsAddingChannel(true)} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={18} /></button>
           </div>
           
           {isAddingChannel && (
             <div className="p-6 bg-white dark:bg-[#0f111a] rounded-3xl border border-indigo-500/50 space-y-3 shadow-xl">
                <input placeholder="Name" className="w-full bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <input placeholder="Icon URL" className="w-full bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-sm" value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} />
                <input placeholder="Subscribers" className="w-full bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-sm" value={form.subscribers} onChange={e => setForm({...form, subscribers: e.target.value})} />
                <div className="flex gap-2 pt-2">
                  <button onClick={handleAddChannel} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-bold">Add</button>
                  <button onClick={() => setIsAddingChannel(false)} className="px-4 bg-slate-100 dark:bg-white/5 rounded-xl">X</button>
                </div>
             </div>
           )}

           <div className="space-y-3">
             {channels.map(c => (
               <div key={c.id} onClick={() => setSelectedChannel(c)} className={clsx("p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all", selectedChannel?.id === c.id ? "bg-indigo-600 text-white border-transparent" : "bg-white dark:bg-[#0f111a] border-slate-200 dark:border-white/5")}>
                 <div className="flex items-center gap-3">
                   <img src={c.icon} className="w-10 h-10 rounded-full" />
                   <div className="overflow-hidden w-32">
                     <p className="font-bold text-sm truncate">{c.name}</p>
                     <p className={clsx("text-[10px]", selectedChannel?.id === c.id ? "text-indigo-200" : "text-slate-500")}>{c.playlists.length} Playlists</p>
                   </div>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); deleteChannel(c.id); }} className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-400"><Trash2 size={16} /></button>
               </div>
             ))}
           </div>
        </div>

        {/* Right: Detailed Edit */}
        <div className="lg:col-span-2">
           {selectedChannel ? (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8 bg-white dark:bg-[#0f111a] rounded-[2.5rem] border dark:border-white/5 shadow-xl">
                   <h3 className="font-black text-2xl mb-6 flex items-center gap-2">Manage: <span className="text-indigo-500">{selectedChannel.name}</span></h3>
                   
                   <div className="space-y-6">
                      <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border dark:border-white/5">
                        <h4 className="font-bold mb-4 text-sm text-indigo-500 uppercase tracking-widest">Add New Playlist</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input placeholder="Playlist Title" className="bg-white dark:bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-indigo-500 transition-all" value={form.playlistTitle} onChange={e => setForm({...form, playlistTitle: e.target.value})} />
                           <input placeholder="Thumbnail URL" className="bg-white dark:bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-indigo-500 transition-all" value={form.playlistThumbnail} onChange={e => setForm({...form, playlistThumbnail: e.target.value})} />
                        </div>
                        <button onClick={addPlaylist} className="mt-4 w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Plus size={20}/> Create Playlist</button>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-sm text-slate-500 uppercase tracking-widest px-2">Existing Playlists</h4>
                        {selectedChannel.playlists.map(p => (
                          <div key={p.id} className="bg-slate-50 dark:bg-white/5 rounded-[2rem] p-6 border dark:border-white/10">
                             <div className="flex justify-between items-start mb-6">
                               <div className="flex gap-4">
                                 <img src={p.thumbnail} className="w-24 aspect-video rounded-xl object-cover" />
                                 <div>
                                   <p className="font-bold">{p.title}</p>
                                   <p className="text-xs text-slate-500">{p.videos.length} Videos</p>
                                 </div>
                               </div>
                               <button className="text-rose-500 p-2"><Trash2 size={16} /></button>
                             </div>

                             <div className="space-y-3 bg-white dark:bg-black/20 p-4 rounded-2xl">
                               <p className="text-[10px] font-black text-indigo-500 uppercase mb-2">Push New Video</p>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                 <input placeholder="Video Title" className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-xs" value={form.videoTitle} onChange={e => setForm({...form, videoTitle: e.target.value})} />
                                 <input placeholder="YouTube ID" className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-xs" value={form.videoId} onChange={e => setForm({...form, videoId: e.target.value})} />
                                 <input placeholder="Duration (m:ss)" className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-xs" value={form.videoDuration} onChange={e => setForm({...form, videoDuration: e.target.value})} />
                               </div>
                               <button onClick={() => addVideo(p.id)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold mt-2">Add Video to List</button>
                               
                               <div className="mt-4 border-t dark:border-white/5 pt-4">
                                  {p.videos.length > 0 && (
                                     <div className="grid gap-2">
                                       {p.videos.slice(-3).map(v => (
                                         <div key={v.id} className="flex items-center justify-between bg-white dark:bg-white/5 p-2 rounded-lg">
                                           <span className="text-[10px] truncate w-40">{v.title}</span>
                                           <span className="text-[10px] text-slate-500">{v.id}</span>
                                         </div>
                                       ))}
                                     </div>
                                  )}
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-[60vh] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-slate-400">
               <ExternalLink size={48} className="mb-4 opacity-20" />
               <p className="font-bold">Select a channel to edit its database</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default App;
