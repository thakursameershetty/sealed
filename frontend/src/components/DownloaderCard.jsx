import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, Loader2, AlertCircle, Clock, Video, Music, Trash2, ArrowDownUp, X } from 'lucide-react';
import videoImage from '../images/video.png';
import audioImage from '../images/audio.png';

const DownloaderCard = () => {
    const [url, setUrl] = useState('');
    const [format, setFormat] = useState('video');
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [history, setHistory] = useState([]);
    const [sortOrder, setSortOrder] = useState('newest');

    const videoTabRef = useRef(null);
    const audioTabRef = useRef(null);
    const inputRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

    useEffect(() => {
        const saved = localStorage.getItem('downloadHistory');
        if (saved) {
            try { setHistory(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    // Auto-focus the input box whenever the app is ready for a new link
    useEffect(() => {
        if (status === 'idle' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [status]);

    // Global Paste Listener
    useEffect(() => {
        const handleGlobalPaste = (e) => {
            // Don't intercept if they are actively typing in the input already
            if (document.activeElement === inputRef.current) return; 
            
            const pastedText = e.clipboardData?.getData('text');
            if (pastedText && pastedText.startsWith('http')) {
                setUrl(pastedText);
                if (inputRef.current) inputRef.current.focus();
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, []);

    useEffect(() => {
        const ref = format === 'video' ? videoTabRef : audioTabRef;
        if (ref.current) {
            setIndicatorStyle({ width: ref.current.offsetWidth, left: ref.current.offsetLeft });
        }
    }, [format]);

    const addHistoryItem = (item) => {
        setHistory(prev => {
            const next = [item, ...prev];
            localStorage.setItem('downloadHistory', JSON.stringify(next));
            return next;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('downloadHistory');
    };

    const handleDownload = async () => {
        if (!url || status === 'downloading') return;
        
        try {
            setStatus('downloading');
            setErrorMsg('');

            // Call Rust directly and wait for the actual video title to be returned
            const downloadedTitle = await invoke('download_media', { url, format });

            // Add the real title to the local storage history
            addHistoryItem({ 
                id: Date.now().toString(), 
                url, 
                fileName: downloadedTitle, 
                format, 
                timestamp: Date.now() 
            });

            setStatus('idle');
            setUrl('');
            
        } catch (err) {
            // Tauri passes Rust Err() messages directly to the catch block
            setErrorMsg(typeof err === 'string' ? err : 'Failed to download. Check the URL.');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 6000);
        }
    };

    const sortedHistory = [...history].sort((a, b) =>
        sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );

    const toggleSort = () => setSortOrder(p => p === 'newest' ? 'oldest' : 'newest');

    const formatDate = (ts) => new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(ts));

    return (
        <div className="w-full max-w-2xl flex flex-col items-center">

            {/* Format Tabs */}
            <div className="relative flex mb-8">
                <button
                    ref={videoTabRef}
                    onClick={() => setFormat('video')}
                    className={`group flex flex-col items-center gap-2.5 pb-4 px-8 sm:px-10 transition-colors duration-200 ${
                        format === 'video' ? 'text-[#222222]' : 'text-[#AAAAAA] hover:text-[#717171]'
                    }`}
                >
                    <img
                        src={videoImage} alt="Video"
                        className={`object-contain transition-all duration-300 ${
                            format === 'video' ? 'w-10 h-10 opacity-100 scale-110' : 'w-8 h-8 opacity-40 group-hover:opacity-60 group-hover:scale-105'
                        }`}
                    />
                    <span className="text-[15px] font-semibold">Video</span>
                </button>

                <button
                    ref={audioTabRef}
                    onClick={() => setFormat('audio')}
                    className={`group flex flex-col items-center gap-2.5 pb-4 px-8 sm:px-10 transition-colors duration-200 ${
                        format === 'audio' ? 'text-[#222222]' : 'text-[#AAAAAA] hover:text-[#717171]'
                    }`}
                >
                    <img
                        src={audioImage} alt="Audio"
                        className={`object-contain transition-all duration-300 ${
                            format === 'audio' ? 'w-10 h-10 opacity-100 scale-110' : 'w-8 h-8 opacity-40 group-hover:opacity-60 group-hover:scale-105'
                        }`}
                    />
                    <span className="text-[15px] font-semibold">Audio</span>
                </button>

                <div
                    className="absolute bottom-0 h-[2px] bg-[#222222] rounded-full transition-all duration-300 ease-out"
                    style={indicatorStyle}
                />
            </div>

            {/* URL Input — desktop pill */}
            <div className="w-full hidden sm:flex border border-[#DDDDDD] rounded-full shadow-[0_2px_16px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.15)] transition-shadow bg-white items-center pl-2 pr-2 py-2">
                <div className="flex-1 px-5">
                    <input
                        ref={inputRef}
                        autoFocus
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste the link here"
                        className="w-full outline-none text-[#222222] bg-transparent text-[15px] placeholder-[#AAAAAA] py-2"
                        disabled={status === 'downloading'}
                        onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                    />
                </div>
                {url && status !== 'downloading' && (
                    <button onClick={() => setUrl('')} className="p-2 text-[#AAAAAA] hover:text-[#717171] transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={handleDownload}
                    disabled={!url || status === 'downloading'}
                    className="bg-[#FF385C] hover:bg-[#E31C5F] active:scale-95 text-white px-6 py-4 rounded-full flex gap-2 items-center font-semibold text-[15px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-1"
                >
                    {status === 'downloading'
                        ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Downloading…</span></>
                        : <><Download className="w-5 h-5" /><span>Download</span></>
                    }
                </button>
            </div>

            {/* URL Input — mobile card */}
            <div className="sm:hidden w-full bg-white border border-[#DDDDDD] rounded-[32px] shadow-[0_8px_28px_rgba(0,0,0,0.08)] p-3 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2 px-5 py-4">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste the link here"
                        className="flex-1 outline-none text-[#222222] bg-transparent text-[16px] placeholder-[#AAAAAA]"
                        disabled={status === 'downloading'}
                        onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                    />
                    {url && status !== 'downloading' && (
                        <button onClick={() => setUrl('')} className="text-[#AAAAAA] hover:text-[#717171] transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <button
                    onClick={handleDownload}
                    disabled={!url || status === 'downloading'}
                    className="w-full bg-[#FF385C] hover:bg-[#E31C5F] active:scale-[0.98] text-white py-4 rounded-full flex gap-2 items-center justify-center font-semibold text-[16px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {status === 'downloading'
                        ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Downloading…</span></>
                        : <><Download className="w-5 h-5" /><span>Download</span></>
                    }
                </button>
            </div>

            {/* Error */}
            {status === 'error' && (
                <div className="mt-4 w-full bg-[#FFF8F6] border border-[#FFCFC0] text-[#C13515] px-5 py-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-[14px] font-medium">{errorMsg}</span>
                </div>
            )}

            {/* Tagline */}
            {history.length === 0 && (
                <p className="mt-10 text-[13px] text-[#BBBBBB] text-center leading-relaxed max-w-xs">
                    Paste any Video link above and hit download.<br />Your files stay on your device — nothing is stored.
                </p>
            )}

            {/* Download History */}
            {history.length > 0 && (
                <div className="w-full mt-12">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-xl font-bold text-[#222222]">Recent downloads</h2>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleSort}
                                className="flex items-center gap-1.5 text-sm font-medium text-[#717171] hover:text-[#222222] transition-colors"
                            >
                                <ArrowDownUp className="w-4 h-4" />
                                <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
                            </button>
                            <button
                                onClick={clearHistory}
                                className="flex items-center gap-1.5 text-sm font-medium text-[#FF385C] hover:text-[#E31C5F] transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Clear all</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden shadow-sm">
                        {sortedHistory.map((item, index) => (
                            <div
                                key={item.id}
                                className={`flex items-start sm:items-center gap-4 p-4 sm:p-5 hover:bg-[#F7F7F7] transition-colors ${
                                    index !== sortedHistory.length - 1 ? 'border-b border-[#EBEBEB]' : ''
                                }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#F7F7F7] border border-[#EBEBEB] flex items-center justify-center flex-shrink-0">
                                    {item.format === 'video'
                                        ? <Video className="w-5 h-5 text-[#484848]" />
                                        : <Music className="w-5 h-5 text-[#484848]" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] sm:text-[15px] font-semibold text-[#222222] truncate">{item.fileName}</p>
                                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs sm:text-sm text-[#717171] truncate hover:underline max-w-[180px] sm:max-w-[280px]"
                                        >
                                            {item.url}
                                        </a>
                                        <span className="text-[10px] font-bold uppercase text-[#717171] bg-[#F0F0F0] px-2 py-0.5 rounded-full tracking-wide">
                                            {item.format}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1.5 text-xs text-[#AAAAAA] sm:hidden">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatDate(item.timestamp)}</span>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5 text-sm text-[#AAAAAA] flex-shrink-0 whitespace-nowrap">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDate(item.timestamp)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DownloaderCard;
