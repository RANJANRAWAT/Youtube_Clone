import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Image, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { fetchPopularVideos } from '../services/youtubeApi';
import { COLORS } from '../utils/constants';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

const ShortsScreen = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
    const listRef = useRef(null);
    const [embedErrors, setEmbedErrors] = useState({});
    const webviewRefs = useRef({});

    const onWebViewMessage = (event, index) => {
        let msg = null;
        try { msg = JSON.parse(event.nativeEvent.data); } catch (e) { msg = { raw: event.nativeEvent.data }; }
        if (msg && msg.type === 'error') {
            const code = msg.data;
            setEmbedErrors(prev => ({ ...prev, [index]: code || 'embed_error' }));
        }
    };

    // parse ISO8601 duration (PT#M#S) or common hh:mm:ss / mm:ss strings into seconds
    const parseDurationToSeconds = (d) => {
        if (!d) return 0;
        // ISO8601 format e.g. PT15S, PT1M30S
        if (d.startsWith('P') || d.startsWith('PT')) {
            try {
                let s = 0;
                const matchH = d.match(/(\d+)H/);
                const matchM = d.match(/(\d+)M/);
                const matchS = d.match(/(\d+)S/);
                if (matchH) s += Number(matchH[1]) * 3600;
                if (matchM) s += Number(matchM[1]) * 60;
                if (matchS) s += Number(matchS[1]);
                return s;
            } catch (e) { return 0; }
        }

        // fallback: hh:mm:ss or mm:ss
        const parts = d.split(':').map(p => Number(p));
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        if (parts.length === 2) return parts[0]*60 + parts[1];
        return Number(d) || 0;
    };

    const formatDuration = (secs) => {
        if (!secs || isNaN(secs)) return '';
        const s = Math.floor(secs % 60);
        const m = Math.floor((secs % 3600) / 60);
        if (m > 0) return `${m}:${s.toString().padStart(2,'0')}`;
        return `0:${s.toString().padStart(2,'0')}`;
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const items = await fetchPopularVideos();
                if (!mounted) return;
                // filter to shorts-like durations between 15 and 30 seconds
                const filtered = items.filter(it => {
                    const secs = parseDurationToSeconds(it.duration || it.contentDetails || '');
                    return secs >= 15 && secs <= 30;
                });
                setVideos(filtered.length ? filtered : items); // fallback to all if none match
            } catch (e) {
                console.warn('Failed to load shorts list', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

        const ORIGIN = 'https://example.com';

        const embedHtmlFor = (videoId) => {
                return `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                        <style>html,body{margin:0;padding:0;height:100%;background-color:black;}#player{width:100%;height:100%;}</style>
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
                            function onYouTubeIframeAPIReady() {
                                player = new YT.Player('player', {
                                    height: '100%',
                                    width: '100%',
                                    videoId: '${videoId}',
                                    playerVars: { 'autoplay': 1, 'playsinline': 1, 'rel': 0, 'controls': 0, 'mute': 1, 'origin': '${ORIGIN}' },
                                    events: {
                                        'onReady': function() { postMessage({type:'ready'}); },
                                        'onStateChange': function(e) { postMessage({type:'state', data: e.data}); },
                                        'onError': function(e) { postMessage({type:'error', data: e.data}); }
                                    }
                                });
                            }
                        </script>
                    </body>
                </html>
                `;
        };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const idx = viewableItems[0].index || 0;
            setCurrentIndex(idx);
        }
    }).current;

    const renderItem = useCallback(({ item, index }) => {
        const videoId = item.youtubeId || item.id || '';
        const isActive = index === currentIndex;
        const hasError = !!embedErrors[index];

        return (
            <View style={styles.itemContainer}>
                {isActive ? (
                    <WebView
                        ref={(r) => { webviewRefs.current[index] = r; }}
                        originWhitelist={["*"]}
                        source={{ html: embedHtmlFor(videoId), baseUrl: ORIGIN }}
                        javaScriptEnabled
                        domStorageEnabled
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        style={styles.webview}
                        onMessage={(e) => onWebViewMessage(e, index)}
                        onError={() => setEmbedErrors(prev => ({ ...prev, [index]: 'webview_error' }))}
                        onHttpError={() => setEmbedErrors(prev => ({ ...prev, [index]: 'http_error' }))}
                    />
                ) : (
                    <View style={{flex:1}}>
                        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />

                        {/* duration badge top-right */}
                        <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>{formatDuration(parseDurationToSeconds(item.duration || item.contentDetails || item.duration || ''))}</Text>
                        </View>

                        {/* center play icon to mimic YouTube */}
                        <View style={styles.centerPlay} pointerEvents="none">
                            <Text style={styles.playIcon}>▶</Text>
                        </View>

                        {/* bottom overlay with avatar + title */}
                        <View style={styles.bottomOverlay} pointerEvents="none">
                            <Image source={{ uri: item.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.channel)}` }} style={styles.smallAvatar} />
                            <View style={{marginLeft:10, flex:1}}>
                                <Text style={styles.titleSmall} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.channelSmall} numberOfLines={1}>{item.channel}</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.metaOverlay} pointerEvents="none">
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.channel}>{item.channel}</Text>
                </View>

                {hasError && isActive && (
                    <View style={styles.unavailableOverlay} pointerEvents="box-none">
                        <View style={styles.unavailableBox}>
                            <Text style={styles.unavailableText}>Video cannot be embedded</Text>
                            <View style={{flexDirection:'row', marginTop:8}}>
                                <TouchableOpacity style={[styles.openButton, {marginRight:10}]} onPress={() => Linking.openURL(item.url || `https://www.youtube.com/watch?v=${videoId}`)}>
                                    <Text style={styles.openButtonText}>Open on YouTube</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.openButton, {backgroundColor:'#333'}]} onPress={() => {
                                    if (listRef.current) listRef.current.scrollToIndex({ index: Math.min(videos.length - 1, index + 1), animated: true });
                                }}>
                                    <Text style={styles.openButtonText}>Next</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {!isActive && (
                    <View style={styles.tapPlayOverlay} pointerEvents="none">
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}

                {/* Unmute button when active and no embed error */}
                {isActive && !hasError && (
                    <TouchableOpacity style={styles.unmuteButton} onPress={() => {
                        try {
                            const w = webviewRefs.current[index];
                            if (w && typeof w.injectJavaScript === 'function') {
                                w.injectJavaScript(`(function(){ try{ player.unMute && player.unMute(); player.setVolume && player.setVolume(100); player.playVideo && player.playVideo(); }catch(e){} })(); true;`);
                            }
                        } catch (e) { console.warn('unmute inject failed', e); }
                    }}>
                        <Text style={styles.unmuteText}>Tap to unmute</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }, [currentIndex, embedErrors]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!videos || videos.length === 0) {
        return (
            <View style={styles.center}>
                <Text>No shorts available</Text>
            </View>
        );
    }

    return (
        <FlatList
            ref={listRef}
            data={videos}
            keyExtractor={(i) => (i.youtubeId || i.id || Math.random().toString())}
            renderItem={renderItem}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={WINDOW_HEIGHT}
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig.current}
            getItemLayout={(_, index) => ({ length: WINDOW_HEIGHT, offset: WINDOW_HEIGHT * index, index })}
            initialNumToRender={2}
            windowSize={3}
            removeClippedSubviews
        />
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    itemContainer: { width: '100%', height: WINDOW_HEIGHT, backgroundColor: 'black' },
    webview: { flex: 1, backgroundColor: 'black' },
    thumbnail: { width: '100%', height: '100%' },
    metaOverlay: { position: 'absolute', left: 12, bottom: 40, right: 12 },
    title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
    channel: { color: '#ddd', fontSize: 14 },
    tapPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    unmuteButton: {
        position: 'absolute',
        right: 12,
        bottom: 80,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        zIndex: 1001,
    },
    unmuteText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    durationBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        zIndex: 1000,
    },
    durationText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    centerPlay: { position: 'absolute', alignSelf: 'center', top: '45%', zIndex: 1000 },
    playIcon: { color: 'rgba(255,255,255,0.95)', fontSize: 40, fontWeight: '700' },
    bottomOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', padding: 8, borderRadius: 8 },
    smallAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray },
    titleSmall: { color: '#fff', fontSize: 14, fontWeight: '600' },
    channelSmall: { color: '#ddd', fontSize: 12, marginTop: 2 },
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
});

export default ShortsScreen;
