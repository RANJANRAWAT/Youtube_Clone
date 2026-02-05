import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Image, Linking, ActivityIndicator, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import Video from 'react-native-video';
import TrackPlayer from 'react-native-track-player';
import { COLORS } from '../utils/constants';
import { getVideoStatus } from '../services/youtubeApi';

const VideoScreen = ({ videoParam }) => {


    const video = videoParam || {
        id: 'dQw4w9WgXcQ', 
        title: "Video Title",
        views: "0 views",
        time: "Just now",
        description: "No description",
        channel: "Channel Name",
        channelAvatar: ""
    };

    const getVideoIdFromUrl = (v) => {
        if (v.url) {
            const m = v.url.match(/[?&]v=([^&]+)/) || v.url.match(/youtu\.be\/([^?&]+)/) || v.url.match(/embed\/([^?&]+)/);
            if (m) return m[1];
        }
        return v.id;
    };

    const videoId = getVideoIdFromUrl(video);

    // origin used to set iframe origin and WebView baseUrl so requests include a Referer
    // Replace with your app domain if you have one (e.g. 'https://myapp.example')
    const ORIGIN = 'https://example.com';

    const embedHtml = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <style>html,body{margin:0;padding:0;height:100%;background-color:black;touch-action:manipulation;-webkit-user-select:none;-webkit-touch-callout:none;}#player{width:100%;height:100%;}</style>
      </head>
      <body>
        <div id="player"></div>
        <script>
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

          function postMessage(obj) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj));
          }

          var player;
          var loadTimeout = setTimeout(function(){ postMessage({type:'timeout'}); }, 9000);
          // heartbeat interval reference stored on window so we can clear it when player stops
          window.__heartbeatInterval = null;

          function safe(fn){ try{ return fn(); }catch(e){ return null; } }

          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoId}',
              playerVars: { 'autoplay': 1, 'playsinline': 1, 'rel': 0, 'controls': 1, 'enablejsapi': 1, 'origin': '${ORIGIN}' },
              events: {
                'onReady': function(event) { 
                  clearTimeout(loadTimeout); 
                  postMessage({type: 'ready'}); 
                  try { 
                    // attempt autoplay and ensure unmuted
                    event.target.unMute && event.target.unMute();
                    event.target.playVideo && event.target.playVideo();
                    postMessage({type:'autoplay_attempt', muted: false});
                  } catch(e){}
                },
                'onStateChange': function(e) { 
                  var state = e && e.data;
                  if (state === 1) {
                    clearTimeout(loadTimeout);
                    postMessage({type: 'state', data: state});
                    postMessage({type:'playing', ts: Date.now()});
                    // start heartbeat so native side knows player is alive
                    if (window.__heartbeatInterval) clearInterval(window.__heartbeatInterval);
                    window.__heartbeatInterval = setInterval(function(){ postMessage({type:'heartbeat', muted: safe(function(){return player.isMuted && player.isMuted();}), volume: safe(function(){return player.getVolume && player.getVolume();}), currentTime: safe(function(){return player.getCurrentTime && player.getCurrentTime();})}); }, 3000);
                  } else {
                    postMessage({type: 'state', data: state});
                    // clear heartbeat when not playing
                    if (window.__heartbeatInterval) { clearInterval(window.__heartbeatInterval); window.__heartbeatInterval = null; }
                  }
                },
                'onError': function(e) { clearTimeout(loadTimeout); if (window.__heartbeatInterval) { clearInterval(window.__heartbeatInterval); window.__heartbeatInterval = null; } postMessage({type: 'error', data: e.data}); }
              }
            });
          }

          // Note: loadTimeout is cleared when player becomes ready or starts playing
        </script>
      </body>
    </html>
    `;

    const isValidVideoId = videoId && videoId.length > 2;

    const [embedError, setEmbedError] = useState(false);
    const [loadingEmbed, setLoadingEmbed] = useState(true);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [lastWebViewMsg, setLastWebViewMsg] = useState(null);
    const [playerState, setPlayerState] = useState(-1); // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
    const [playAttempts, setPlayAttempts] = useState(0);
    const [lastPlayTimestamp, setLastPlayTimestamp] = useState(null);
    const [playbackFailed, setPlaybackFailed] = useState(null);
    const [heartbeatReceived, setHeartbeatReceived] = useState(false);
    const [playerMuted, setPlayerMuted] = useState(null);
    const [playerVolume, setPlayerVolume] = useState(null);
    const [playerCurrentTime, setPlayerCurrentTime] = useState(null);
    const [playerCurrentTimeReportedAt, setPlayerCurrentTimeReportedAt] = useState(null);
    const webviewRef = useRef(null);
    // Local video player ref and state
    const videoRef = useRef(null);
    const [isLocalPlaying, setIsLocalPlaying] = useState(false);
    const handingOffRef = useRef(false);

    // Track latest player state and time in refs so AppState handler can read the current values without re-registering listeners
    const currentPlayerStateRef = useRef(playerState);
    const playerCurrentTimeRef = useRef(null);
    const playerCurrentTimeReportedAtRef = useRef(null);
    const openedOnBackgroundRef = useRef(false);
    // Timeout ref used to fallback to opening YouTube if WebView playback can't continue in background
    const backgroundFallbackTimeoutRef = useRef(null);
    // Interval ref + counter for repeated injection attempts while backgrounding
    const backgroundInjectionIntervalRef = useRef(null);
    const backgroundInjectionAttemptsRef = useRef(0);
    useEffect(() => { currentPlayerStateRef.current = playerState; }, [playerState]);

    // Helper: hand off foreground react-native-video to TrackPlayer for background audio
    const handoffToTrackPlayer = async (positionSec = 0) => {
        try {
            handingOffRef.current = true;
            // prepare TrackPlayer with the same media
            await TrackPlayer.reset();
            await TrackPlayer.add({
                id: `local-${video.id || videoId}`,
                url: video.fileUrl,
                title: video.title || 'Audio',
                artwork: video.thumbnail || undefined,
            });
            await TrackPlayer.seekTo(positionSec);
            await TrackPlayer.play();
            setIsLocalPlaying(false); // pause the in-app Video component
            console.warn('Handoff to TrackPlayer at', positionSec);
        } catch (e) {
            console.warn('Handoff to TrackPlayer failed', e);
            handingOffRef.current = false;
        }
    };

    // Helper: stop TrackPlayer and resume in-app Video at the same position
    const resumeFromTrackPlayer = async () => {
        try {
            const pos = await TrackPlayer.getPosition();
            await TrackPlayer.stop();
            await TrackPlayer.reset();
            if (videoRef && videoRef.current && typeof videoRef.current.seek === 'function') {
                videoRef.current.seek(pos);
            }
            setIsLocalPlaying(true);
            handingOffRef.current = false;
            console.warn('Resumed in-app video at', pos);
        } catch (e) {
            console.warn('Resume from TrackPlayer failed', e);
            handingOffRef.current = false;
        }
    };

    useEffect(() => {
        let mounted = true;
        setCheckingStatus(true);
        setEmbedError(false);
        (async () => {
            if (!videoId) { setCheckingStatus(false); return; }
            const status = await getVideoStatus(videoId);
            console.warn('getVideoStatus result for', videoId, status);
            if (!mounted) return;
            if (status && status.embeddable === false) {
                setEmbedError(true);
                setLoadingEmbed(false);
            } else {
                setEmbedError(false);
            }
            setCheckingStatus(false);
        })();
        return () => { mounted = false; };
    }, [videoId]);

    // If playback repeatedly fails, open video on YouTube as a fallback after a short delay
    useEffect(() => {
        let t;
        if (playbackFailed && (playAttempts >= 2)) {
            console.warn('Auto fallback: will open on YouTube due to repeated playback failures');
            // small delay to give user a chance to cancel (if you want to add cancel later)
            t = setTimeout(() => {
                Linking.openURL(video.url || `https://www.youtube.com/watch?v=${videoId}`);
            }, 2500);
        }
        return () => clearTimeout(t);
    }, [playbackFailed, playAttempts]);

    // Open video in YouTube app when the app backgrounds while the video is playing
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            console.warn('AppState changed to', nextAppState);
            if ((nextAppState === 'background' || nextAppState === 'inactive') && !embedError && isValidVideoId) {
                // If this video is a self-hosted file, try handing off to TrackPlayer instead of opening YouTube
                if (video.fileUrl) {
                    const playingLocally = isLocalPlaying;
                    if (playingLocally && !openedOnBackgroundRef.current) {
                        openedOnBackgroundRef.current = true;
                        const pos = playerCurrentTimeRef.current || 0;
                        // Attempt a handoff (non-blocking)
                        handoffToTrackPlayer(pos);

                        // Fallback: if TrackPlayer hasn't started playback within ~2.5s, resume WebView fallback or notify user
                        if (backgroundFallbackTimeoutRef.current) { clearTimeout(backgroundFallbackTimeoutRef.current); }
                        backgroundFallbackTimeoutRef.current = setTimeout(async () => {
                            try {
                                const state = await TrackPlayer.getState();
                                // TrackPlayer states: 0-4 depending on lib; if not playing, open fallback / notify
                                const isPlaying = state === (TrackPlayer.STATE_PLAYING || 3);
                                if (!isPlaying) {
                                    console.warn('TrackPlayer did not start — consider opening externally');
                                    // open externally as a last resort
                                    const url = video.fileUrl;
                                    Linking.openURL(url).catch(e => console.warn('Linking failed', e));
                                }
                            } catch (e) { console.warn('TrackPlayer state check failed', e); }
                            backgroundFallbackTimeoutRef.current = null;
                        }, 2500);
                    }
                    return; // local handled; do not execute webview fallback below
                }

                const playing = currentPlayerStateRef.current === 1;
                if (playing && !openedOnBackgroundRef.current) {
                    openedOnBackgroundRef.current = true;

                    // First try: request an immediate accurate time sample from the iframe and open YouTube quickly with that timestamp
                    const prevAt = playerCurrentTimeReportedAtRef.current || 0;
                    try {
                        if (webviewRef && webviewRef.current) {
                            webviewRef.current.injectJavaScript(`(function(){ try{ var t = (player && player.getCurrentTime && player.getCurrentTime()) || 0; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'current_time', currentTime: t})); } catch(e){} })(); true;`);
                            console.warn('Requested immediate currentTime from iframe prior to background open');
                        }
                    } catch (e) { console.warn('request current time failed', e); }

                    // Wait a short window (350ms) to see if we got a current_time back; then open YouTube at that spot immediately
                    setTimeout(() => {
                        const lastCt = playerCurrentTimeRef.current;
                        const lastAt = playerCurrentTimeReportedAtRef.current || prevAt;
                        let startSec = 0;
                        if (typeof lastCt === 'number' && lastAt) {
                            const estimated = lastCt + ((Date.now() - lastAt) / 1000);
                            startSec = Math.max(0, Math.round(estimated));
                        }
                        let url;
                        if (video.url) {
                            url = startSec ? `${video.url}${video.url.includes('?') ? '&' : '?'}t=${startSec}s` : video.url;
                        } else {
                            url = `https://www.youtube.com/watch?v=${videoId}${startSec ? `&t=${startSec}s` : ''}`;
                        }
                        console.warn('Immediate fallback: opening on YouTube at', startSec, 'sec:', url);
                        Linking.openURL(url).catch(e => console.warn('Linking failed', e));
                    }, 350);

                    // Also continue best-effort injection attempts (in case the platform allows background play despite opening fallback)
                    try {
                        if (webviewRef && webviewRef.current) {
                            webviewRef.current.injectJavaScript(`(function(){ try{ player.unMute && player.unMute(); player.playVideo && player.playVideo(); } catch(e){} })(); true;`);
                            console.warn('Injected initial background play/unmute command');
                        }
                    } catch (e) { console.warn('inject on background failed', e); }

                    try {
                        if (backgroundInjectionIntervalRef.current) {
                            clearInterval(backgroundInjectionIntervalRef.current);
                            backgroundInjectionIntervalRef.current = null;
                        }
                        backgroundInjectionAttemptsRef.current = 0;
                        backgroundInjectionIntervalRef.current = setInterval(() => {
                            try {
                                if (webviewRef && webviewRef.current) {
                                    webviewRef.current.injectJavaScript(`(function(){ try{ player.unMute && player.unMute(); player.playVideo && player.playVideo(); } catch(e){} })(); true;`);
                                    backgroundInjectionAttemptsRef.current += 1;
                                    console.warn('Background inject attempt', backgroundInjectionAttemptsRef.current);
                                }
                            } catch (e) { console.warn('background inject attempt failed', e); }
                            if ((backgroundInjectionAttemptsRef.current || 0) >= 7) {
                                if (backgroundInjectionIntervalRef.current) { clearInterval(backgroundInjectionIntervalRef.current); backgroundInjectionIntervalRef.current = null; }
                                backgroundInjectionAttemptsRef.current = 0;
                            }
                        }, 300);
                    } catch (e) { console.warn('failed to start background injection interval', e); }

                    // Start a slightly longer timeout: if we don't receive a fresh heartbeat/currentTime update shortly after backgrounding,
                    // assume playback was stopped by the system and fall back (already opened immediate fallback above but keep this as a safety net)
                    if (backgroundFallbackTimeoutRef.current) { clearTimeout(backgroundFallbackTimeoutRef.current); }
                    backgroundFallbackTimeoutRef.current = setTimeout(() => {
                        const lastAt = playerCurrentTimeReportedAtRef.current || 0;
                        const stale = (Date.now() - lastAt) > 4000; // >4s since last reported position
                        const haveRecentTime = (typeof playerCurrentTimeRef.current === 'number') && !stale;
                        if (!haveRecentTime) {
                            console.warn('Background play could not be maintained — already opened immediate fallback earlier');
                        } else {
                            console.warn('Background play appears to be continuing (recent heartbeat found) — not falling back.');
                        }
                        backgroundFallbackTimeoutRef.current = null;
                    }, 4000);
                }
            } else if (nextAppState === 'active') {
                // allow future background attempts and clean up any pending fallback work
                openedOnBackgroundRef.current = false;
                if (backgroundFallbackTimeoutRef.current) {
                    clearTimeout(backgroundFallbackTimeoutRef.current);
                    backgroundFallbackTimeoutRef.current = null;
                }
                // If we handed off to TrackPlayer while backgrounded for a local file, resume in-app playback
                if (video.fileUrl && handingOffRef.current) {
                    resumeFromTrackPlayer();
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            if (backgroundFallbackTimeoutRef.current) { clearTimeout(backgroundFallbackTimeoutRef.current); backgroundFallbackTimeoutRef.current = null; }
            subscription.remove();
        };
    }, [embedError, isValidVideoId, videoId, video]);

    const YT_ERROR_MAP = {
        2: 'Invalid parameter.',
        5: 'HTML5 player error.',
        100: 'Video not found (removed or private).',
        101: 'Embedding disabled by the video owner.',
        150: 'Embedding disabled by the video owner.',
        153: 'Missing Referer / app identification (embedding blocked).'
    };

    const getEmbedErrorText = () => {
        if (!embedError) return 'Video not available for embedding';
        if (lastWebViewMsg) {
            try {
                const m = typeof lastWebViewMsg === 'string' ? JSON.parse(lastWebViewMsg) : lastWebViewMsg;
                const code = (m && (m.data || m.code || m.statusCode)) || undefined;
                if (code && YT_ERROR_MAP[code]) return `${YT_ERROR_MAP[code]} (code ${code})`;
                if (code) return `Video not available for embedding (code ${code})`;
                if (m && m.type === 'timeout') return 'Embed timed out';
                if (m && m.type) return `Video not available for embedding (${m.type})`;
            } catch (e) {
                const match = (lastWebViewMsg + '').match(/(\d{2,3})/);
                if (match) {
                    const c = Number(match[1]);
                    if (YT_ERROR_MAP[c]) return `${YT_ERROR_MAP[c]} (code ${c})`;
                    return `Video not available for embedding (code ${match[1]})`;
                }
                return 'Video not available for embedding';
            }
        }
        return 'Video not available for embedding';
    };

    return (
        <View style={styles.container}>
            <View style={styles.videoPlayer}>
                {video.fileUrl ? (
                    <>
                        <Video
                            ref={videoRef}
                            source={{ uri: video.fileUrl }}
                            style={{ flex: 1, backgroundColor: 'black' }}
                            resizeMode="contain"
                            controls={false}
                            muted={false}
                            volume={1.0}
                            paused={!isLocalPlaying}
                            onLoadStart={() => { setLoadingEmbed(true); setEmbedError(false); }}
                            onLoad={() => { setLoadingEmbed(false); setEmbedError(false); }}
                            onProgress={(p) => {
                                const t = p.currentTime || 0;
                                setPlayerCurrentTime(t);
                                playerCurrentTimeRef.current = t;
                                playerCurrentTimeReportedAtRef.current = Date.now();
                            }}
                            onError={(e) => { console.warn('local video error', e); setPlaybackFailed('Local playback error'); setEmbedError(true); setLoadingEmbed(false); }}
                        />

                        {loadingEmbed && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        )}

                        {(!loadingEmbed && !embedError && !isLocalPlaying && !playbackFailed) && (
                            <View style={styles.playOverlay} pointerEvents="box-none">
                                <TouchableOpacity style={styles.playButton} onPress={async () => {
                                    try {
                                        // stop any TrackPlayer instance and play in-app
                                        try { await TrackPlayer.stop(); await TrackPlayer.reset(); } catch (e) {}
                                        setIsLocalPlaying(true);
                                        setPlaybackFailed(null);
                                    } catch (e) { console.warn('local play failed', e); }
                                }}>
                                    <Text style={styles.playIcon}>▶</Text>
                                    <Text style={styles.playText}>Tap to play</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {isLocalPlaying && (
                            <View style={styles.unmuteOverlay} pointerEvents="box-none">
                                <TouchableOpacity style={styles.unmuteButton} onPress={() => {
                                    // manual handoff to background player
                                    const pos = playerCurrentTimeRef.current || 0;
                                    handoffToTrackPlayer(pos);
                                }}>
                                    <Text style={styles.unmuteText}>Play in background</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {playbackFailed && (
                            <View style={[styles.unavailableOverlay, {justifyContent:'flex-start', paddingTop:40}]} pointerEvents="box-none">
                                <View style={styles.unavailableBox}>
                                    <Text style={styles.unavailableText}>{playbackFailed}</Text>
                                    <Text style={{color:'#fff', fontSize:12, marginBottom:8}}>Local playback failed — try again or open externally</Text>
                                    <View style={{flexDirection:'row'}}>
                                        <TouchableOpacity style={[styles.openButton, {marginRight:10}]} onPress={() => {
                                            // try to play again
                                            try {
                                                setIsLocalPlaying(true);
                                                setPlaybackFailed(null);
                                            } catch (e) { console.warn('retry local play failed', e); }
                                        }}>
                                            <Text style={styles.openButtonText}>Try again</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.openButton, {backgroundColor:'#333'}]} onPress={() => Linking.openURL(video.fileUrl)}>
                                            <Text style={styles.openButtonText}>Open externally</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}

                    </>
                ) : (!video.fileUrl && isValidVideoId && !embedError) ? (
                    <>
                        <WebView
                            style={{ flex: 1 }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            mediaPlaybackRequiresUserAction={false}
                            allowsInlineMediaPlayback={true}
                            originWhitelist={['*']}
                            mixedContentMode="always"
                            source={{ html: embedHtml, baseUrl: ORIGIN }}
                            scrollEnabled={true}
                            scalesPageToFit={true}
                            allowsFullscreenVideo={true}
                            onLoadStart={(e) => { console.warn('webview onLoadStart', e.nativeEvent); setLoadingEmbed(true); setEmbedError(false); }}
                            onLoadProgress={(e) => { console.warn('webview onLoadProgress', e.nativeEvent); }}
                            onLoadEnd={(e) => { console.warn('webview onLoadEnd', e.nativeEvent); setLoadingEmbed(false); }}
                            onError={(e) => { console.warn('webview onError', e.nativeEvent); setLastWebViewMsg(JSON.stringify(e.nativeEvent)); setEmbedError(true); setLoadingEmbed(false); }}
                            onHttpError={(e) => { console.warn('webview onHttpError', e.nativeEvent); setLastWebViewMsg(JSON.stringify(e.nativeEvent)); setEmbedError(true); setLoadingEmbed(false); }}
                            onNavigationStateChange={(nav) => { console.warn('webview nav change', nav); }}
                            onMessage={(event) => {
                                const raw = event.nativeEvent.data;
                                console.warn('webview message:', raw);

                                let msg;
                                try {
                                    msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                } catch (e) {
                                    // try to extract useful bits from non-json payloads
                                    const s = (raw || '').toString();
                                    const m = s.match(/(error|timeout|autoplayblocked)/i);
                                    const codeMatch = s.match(/(\d{2,3})/);
                                    msg = {
                                        type: m ? m[1].toLowerCase() : 'error',
                                        data: codeMatch ? Number(codeMatch[1]) : undefined,
                                        raw: s,
                                    };
                                }

                                // Attach a friendly message when known YT error codes appear
                                if (msg && msg.data && YT_ERROR_MAP[msg.data]) {
                                    setLastWebViewMsg(JSON.stringify({ type: 'yt-error', code: msg.data, text: YT_ERROR_MAP[msg.data], raw: msg.raw || raw }));
                                } else {
                                    setLastWebViewMsg(typeof raw === 'string' ? raw : JSON.stringify(raw));
                                }

                                // handle immediate current time responses from injected requests
                                if (msg && msg.type === 'current_time') {
                                    const ct = Number(msg.currentTime || 0);
                                    setPlayerCurrentTime(ct);
                                    setPlayerCurrentTimeReportedAt(Date.now());
                                    playerCurrentTimeRef.current = ct;
                                    playerCurrentTimeReportedAtRef.current = Date.now();
                                    console.warn('current_time received from iframe:', ct);
                                    // Clear any background fallback because we now have a fresh time sample
                                    if (backgroundFallbackTimeoutRef.current) {
                                        clearTimeout(backgroundFallbackTimeoutRef.current);
                                        backgroundFallbackTimeoutRef.current = null;
                                    }
                                    return;
                                }

                                // handle heartbeat / playing pings from the iframe
                                if (msg && msg.type === 'heartbeat') {
                                    // update last play timestamp so we ignore spurious timeouts
                                    setLastPlayTimestamp(Date.now());
                                    setPlaybackFailed(null);
                                    setHeartbeatReceived(true);

                                    // If we were attempting repeated injects in background, stop them — heartbeat means play continued
                                    if (backgroundInjectionIntervalRef.current) {
                                        clearInterval(backgroundInjectionIntervalRef.current);
                                        backgroundInjectionIntervalRef.current = null;
                                        backgroundInjectionAttemptsRef.current = 0;
                                        console.warn('Cleared background injection interval due to heartbeat');
                                    }
                                    if (backgroundFallbackTimeoutRef.current) {
                                        clearTimeout(backgroundFallbackTimeoutRef.current);
                                        backgroundFallbackTimeoutRef.current = null;
                                        console.warn('Cleared background fallback timeout due to heartbeat');
                                    }

                                    // track muted/volume info reported from iframe
                                    if (typeof msg.muted !== 'undefined') setPlayerMuted(!!msg.muted);
                                    if (typeof msg.volume !== 'undefined') setPlayerVolume(Number(msg.volume));
                                    if (typeof msg.currentTime !== 'undefined') {
                                        const ct = Number(msg.currentTime || 0);
                                        setPlayerCurrentTime(ct);
                                        setPlayerCurrentTimeReportedAt(Date.now());
                                        playerCurrentTimeRef.current = ct;
                                        playerCurrentTimeReportedAtRef.current = Date.now();
                                    }
                                    console.warn('heartbeat received (muted=' + msg.muted + ', volume=' + msg.volume + ', time=' + msg.currentTime + ')');
                                    // reset heartbeat flag after a short while
                                    setTimeout(() => setHeartbeatReceived(false), 6000);
                                    return;
                                }
                                if (msg && msg.type === 'playing') {
                                    setLastPlayTimestamp(msg.ts || Date.now());
                                }

                                // track player state messages so we can present a Play button if autoplay is blocked
                                if (msg && msg.type === 'state' && typeof msg.data === 'number') {
                                    const s = msg.data;
                                    setPlayerState(s);

                                    // if we start playing, reset attempts
                                    if (s === 1) {
                                        setPlayAttempts(0);
                                        setPlaybackFailed(null);
                                        setLastPlayTimestamp(Date.now());
                                    }

                                    // If the player stops shortly after starting, try a couple automatic retries
                                    if ((s === 0 || s === 2 || s === 5) && lastPlayTimestamp && (Date.now() - lastPlayTimestamp) < 10000) {
                                        const attempts = playAttempts || 0;
                                        if (attempts < 2) {
                                            console.warn('Playback stopped early — retrying playback (attempt', attempts + 1, ')');
                                            setPlayAttempts(attempts + 1);
                                            try {
                                                if (webviewRef && webviewRef.current) {
                                                    // first retry: try unmute + play
                                                    if (attempts === 0) {
                                                        webviewRef.current.injectJavaScript(`(function(){ try{ player.unMute && player.unMute(); player.playVideo && player.playVideo(); } catch(e){} })(); true;`);
                                                    } else {
                                                        // second retry: reload the video and play (can fix transient server blocks)
                                                        webviewRef.current.injectJavaScript(`(function(){ try{ player.loadVideoById && player.loadVideoById('${videoId}'); player.playVideo && player.playVideo(); } catch(e){} })(); true;`);
                                                    }
                                                }
                                            } catch (e) {
                                                console.warn('retry inject failed', e);
                                            }
                                        } else {
                                            console.warn('Playback failed after retries');
                                            setPlaybackFailed('Playback stopped after multiple attempts');
                                        }
                                    }
                                }

                                if (msg.type === 'ready') {
                                    setEmbedError(false);
                                    setLoadingEmbed(false);
                                } else if (msg.type === 'autoplayblocked') {
                                    // Autoplay blocked — show play overlay already handles this, but keep a note
                                    console.warn('Autoplay was blocked by the browser/webview');
                                    setPlaybackFailed('Autoplay blocked — tap to play');
                                    setLoadingEmbed(false);
                                } else if (msg.type === 'timeout') {
                                    console.warn('YT timeout received:', msg);
                                    // If video started playing recently, this timeout is likely spurious — ignore it
                                    if (lastPlayTimestamp && (Date.now() - lastPlayTimestamp) < 15000) {
                                        console.warn('Ignoring timeout because playback recently started (lastPlayTimestamp)', lastPlayTimestamp);
                                        return;
                                    }
                                    setPlaybackFailed('Embed timed out');
                                    setEmbedError(true);
                                    setLoadingEmbed(false);
                                } else if (msg.type === 'error' || msg.type === 'unknown') {
                                    console.warn('YT player error detected:', msg);
                                    // show friendly playback message for known codes
                                    const code = msg.data;
                                    if (code && YT_ERROR_MAP[code]) setPlaybackFailed(YT_ERROR_MAP[code] + ` (code ${code})`);
                                    else setPlaybackFailed('Playback error occurred');
                                    setEmbedError(true); // treat any error as embedding blocked
                                    setLoadingEmbed(false);
                                }
                            }} ref={webviewRef}
                        />

                        {loadingEmbed && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        )}

                        {/* If autoplay is blocked on mobile, provide a manual play button overlay */}
                        {(!loadingEmbed && !embedError && playerState !== 1 && !playbackFailed) && (
                            <View style={styles.playOverlay} pointerEvents="box-none">
                                <TouchableOpacity style={styles.playButton} onPress={() => {
                                    try {
                                        if (webviewRef && webviewRef.current) {
                                            // try to unmute and play
                                            webviewRef.current.injectJavaScript(`(function(){ try{ player.unMute && player.unMute(); player.playVideo && player.playVideo(); } catch(e){} })(); true;`);
                                            setLoadingEmbed(false);
                                            setPlaybackFailed(null);
                                        }
                                    } catch (e) { console.warn('play injection failed', e); }
                                }}>
                                    <Text style={styles.playIcon}>▶</Text>
                                    <Text style={styles.playText}>Tap to play</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Unmute overlay: shows when video is playing but audio appears muted or volume is 0 */}
                        {(playerState === 1 && (playerMuted === true || playerVolume === 0)) && (
                            <View style={styles.unmuteOverlay} pointerEvents="box-none">
                                <TouchableOpacity style={styles.unmuteButton} onPress={() => {
                                    try {
                                        if (webviewRef && webviewRef.current) {
                                            webviewRef.current.injectJavaScript(`(function(){ try{ player.unMute && player.unMute(); player.setVolume && player.setVolume(100); player.playVideo && player.playVideo(); } catch(e){} })(); true;`);
                                            setPlayerMuted(false);
                                            setPlayerVolume(100);
                                        }
                                    } catch (e) { console.warn('unmute inject failed', e); }
                                }}>
                                    <Text style={styles.unmuteText}>Unmute</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {playbackFailed && (
                            <View style={[styles.unavailableOverlay, {justifyContent:'flex-start', paddingTop:40}]} pointerEvents="box-none">
                                <View style={styles.unavailableBox}>
                                    <Text style={styles.unavailableText}>{playbackFailed}</Text>
                                    <Text style={{color:'#fff', fontSize:12, marginBottom:8}}>Playback ruk gaya — fir se koshish karein ya YouTube par kholen</Text>
                                    <View style={{flexDirection:'row'}}>
                                        <TouchableOpacity style={[styles.openButton, {marginRight:10}]} onPress={() => {
                                            // try to play again
                                            try {
                                                if (webviewRef && webviewRef.current) {
                                                    webviewRef.current.injectJavaScript(`(function(){ try{ player.unMute && player.unMute(); player.playVideo && player.playVideo(); } catch(e){} })(); true;`);
                                                    setPlaybackFailed(null);
                                                    setPlayAttempts(0);
                                                }
                                            } catch (e) { console.warn('retry inject failed', e); }
                                        }}>
                                            <Text style={styles.openButtonText}>Try again</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.openButton, {backgroundColor:'#333'}]} onPress={() => Linking.openURL(video.url || `https://www.youtube.com/watch?v=${videoId}`)}>
                                            <Text style={styles.openButtonText}>Open on YouTube</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}

                    </>
                ) : (
                    <View style={{flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'black'}}>
                        {checkingStatus ? (
                            <>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={{color:'#fff', marginTop:10}}>Checking video availability...</Text>
                            </>
                        ) : (
                            <>
                                <Image source={{ uri: video.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }} style={{width:'100%', height:'100%'}} resizeMode="cover" />
                                <View style={{position:'absolute', alignItems:'center'}}>
                                    <Text style={{color:'white', fontWeight:'bold', marginBottom:8}}>Video not available for embedding</Text>
                                    {isValidVideoId && (
                                        <TouchableOpacity style={[styles.openButton, {marginTop:12}]} onPress={() => Linking.openURL(video.url || `https://www.youtube.com/watch?v=${videoId}`)}>
                                            <Text style={styles.openButtonText}>Open on YouTube</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                )}

                {embedError && (
                    <View style={styles.unavailableOverlay} pointerEvents="box-none">
                        <View style={styles.unavailableBox}>
                            <Text style={styles.unavailableText}>{getEmbedErrorText()}</Text>
                            <TouchableOpacity style={styles.openButton} onPress={() => Linking.openURL(video.url || `https://www.youtube.com/watch?v=${videoId}`)}>
                                <Text style={styles.openButtonText}>Open on YouTube</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}



            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.title}>{video.title}</Text>
                <Text style={styles.stats}>{video.views} • {video.time}</Text>

                <View style={styles.actionsContainer}>
                    <View style={styles.actionItem}>
                        <Text style={styles.actionIcon}>👍</Text>
                        <Text style={styles.actionText}>Like</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <Text style={styles.actionIcon}>👎</Text>
                        <Text style={styles.actionText}>Dislike</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <Text style={styles.actionIcon}>share</Text>
                        <Text style={styles.actionText}>Share</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <Text style={styles.actionIcon}>⬇️</Text>
                        <Text style={styles.actionText}>Download</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <Text style={styles.actionIcon}>save</Text>
                        <Text style={styles.actionText}>Save</Text>
                    </View>
                </View>

                <View style={styles.channelContainer}>
                    <View style={styles.channelInfo}>
                        <Image source={{ uri: video.channelAvatar || 'https://ui-avatars.com/api/?name=C&background=random' }} style={styles.avatar} />
                        <View>
                            <Text style={styles.channelName}>{video.channel}</Text>
                            <Text style={styles.subscriberCount}>100K subscribers</Text>
                        </View>
                    </View>
                    <TouchableOpacity>
                        <Text style={styles.subscribeText}>SUBSCRIBE</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.commentsSection}>
                    <Text style={styles.commentsHeader}>Comments</Text>
                    <View style={styles.commentPreview}>
                        <View style={styles.commentAvatar} />
                        <Text style={styles.commentText} numberOfLines={1}>Add a comment...</Text>
                    </View>
                </View>

                <Text style={styles.description} numberOfLines={3}>{video.description}</Text>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    videoPlayer: {
        width: '100%',
        height: 220, // Standard 16:9 aspect ratio height approx
        backgroundColor: 'black',
    },
    content: {
        flex: 1,
        padding: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 5,
    },
    stats: {
        fontSize: 12,
        color: COLORS.darkGray,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionIcon: {
        fontSize: 20,
        marginBottom: 5,
        color: COLORS.black,
    },
    actionText: {
        fontSize: 12,
        color: COLORS.darkGray,
    },
    channelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    channelInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.gray,
        marginRight: 10,
    },
    channelName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.black,
    },
    subscriberCount: {
        fontSize: 12,
        color: COLORS.darkGray,
    },
    subscribeText: {
        color: 'red',
        fontWeight: 'bold',
        fontSize: 16,
    },
    commentsSection: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    commentsHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 10,
    },
    commentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    commentAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.gray,
        marginRight: 10,
    },
    commentText: {
        fontSize: 12,
        color: COLORS.black,
        flex: 1,
    },
    description: {
        fontSize: 14,
        color: COLORS.darkGray,
        marginTop: 10,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    unavailableOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    unavailableBox: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    unavailableText: {
        color: '#fff',
        marginBottom: 10,
        fontSize: 14,
    },
    openButton: {
        backgroundColor: '#ff0000',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 4,
    },
    openButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },

    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        zIndex: 999,
    },
    playButton: {
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 8,
        alignItems: 'center',
    },
    playIcon: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    playText: {
        color: '#fff',
        fontSize: 14,
    },
    unmuteOverlay: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 1001,
    },
    unmuteButton: {
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unmuteText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default VideoScreen;
