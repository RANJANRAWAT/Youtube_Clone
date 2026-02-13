import { MOCK_VIDEOS, API_KEY, BASE_URL } from '../utils/constants';

// Simulate API delay (used as fallback behavior)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getYoutubeIdFromVideo = (v) => {
    if (v.url) {
        const m = v.url.match(/[?&]v=([^&]+)/) || v.url.match(/youtu\.be\/([^?&]+)/) || v.url.match(/embed\/([^?&]+)/);
        if (m) return m[1];
    }
    // fall back to id if looks like a youtube id
    return v.id;
};

const normalize = (videos) => videos.map(v => {
    const youtubeId = getYoutubeIdFromVideo(v);
    return { ...v, id: youtubeId || v.id, youtubeId };
});

// Parse duration strings like '1:45:20' or '3:45' into seconds (best-effort)
const parseDurationStr = (d) => {
    if (!d || typeof d !== 'string') return null;
    // handle '24/7' or other non-time labels
    if (d.includes('/') || d.toLowerCase().includes('live')) return null;
    const parts = d.split(':').map(p => p.replace(/[^0-9]/g, ''));
    if (parts.length === 0) return null;
    let seconds = 0;
    try {
        if (parts.length === 3) {
            seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
        } else if (parts.length === 2) {
            seconds = Number(parts[0]) * 60 + Number(parts[1]);
        } else if (parts.length === 1) {
            seconds = Number(parts[0]);
        }
        if (Number.isFinite(seconds)) return seconds;
    } catch (e) { }
    return null;
};

const mapVideoItem = (item) => ({
    id: item.id,
    title: item.snippet.title,
    thumbnail: (item.snippet.thumbnails && (item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url)) || '',
    channel: item.snippet.channelTitle,
    channelAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.snippet.channelTitle)}`,
    views: item.statistics?.viewCount ? String(item.statistics.viewCount) : '0',
    time: item.snippet.publishedAt,
    duration: item.contentDetails?.duration || '',
    url: `https://www.youtube.com/watch?v=${item.id}`,
});

export const fetchPopularVideos = async () => {
    // Prefer real API when API_KEY is set
    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
        try {
            const url = `${BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=25&regionCode=US&key=${API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
            const json = await res.json();
            const items = json.items || [];
            if (items.length === 0) return normalize(MOCK_VIDEOS);
            return items.map(mapVideoItem);
        } catch (err) {
            console.warn('fetchPopularVideos failed:', err);
            // fallback to mocks so app remains functional
            await delay(500);
            return normalize(MOCK_VIDEOS);
        }
    }

    // default: return mocked & normalized videos
    await delay(500);
    return normalize(MOCK_VIDEOS);
};

export const fetchRelatedVideos = async (videoOrId) => {
    const videoId = typeof videoOrId === 'string' ? videoOrId : videoOrId.id;
    const title = typeof videoOrId === 'object' ? videoOrId.title : '';

    // For now, reuse popular videos logic or search logic to get a list
    // In a real app with API key, we'd use the search endpoint with relatedToVideoId
    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
        try {
            const url = `${BASE_URL}/search?part=snippet&type=video&relatedToVideoId=${videoId}&maxResults=10&key=${API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`YouTube Related API error: ${res.status}`);
            const json = await res.json();
            const ids = (json.items || []).map(i => i.id.videoId).filter(Boolean);
            if (ids.length === 0) return normalize(MOCK_VIDEOS.slice(0, 5));

            const detailsUrl = `${BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${ids.join(',')}&key=${API_KEY}`;
            const detailsRes = await fetch(detailsUrl);
            if (!detailsRes.ok) throw new Error(`YouTube Related Details API error: ${detailsRes.status}`);
            const detailsJson = await detailsRes.json();
            return (detailsJson.items || []).map(mapVideoItem);
        } catch (e) {
            console.warn('fetchRelatedVideos failed', e);
        }
    }

    await delay(500);

    // Tokenize and clean a string
    const getTokens = (str) => {
        return (str || '').toLowerCase()
            .replace(/[^\w\s]|_/g, '') // remove punctuation
            .split(/\s+/)
            .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'full', 'watch', 'free'].includes(w))
            .map(w => w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w); // simple singularization
    };

    const sourceTokens = getTokens(title);
    const sourceChannel = (typeof videoOrId === 'object' ? videoOrId.channel : '').toLowerCase();

    // Calculate relevance score for each mock video
    const scored = MOCK_VIDEOS.map(v => {
        if (v.id === videoId) return { v, score: -1 }; // Skip current video

        let score = 0;
        const targetTokens = getTokens(v.title);
        const targetChannel = (v.channel || '').toLowerCase();

        // 1. Title Keyword Overlap
        sourceTokens.forEach(token => {
            if (targetTokens.includes(token)) score += 2;
        });

        // 2. Channel Match
        if (sourceChannel && targetChannel === sourceChannel) score += 3;

        // 3. Category/Broad Keyword Match (Boost for generally similar content)
        // Check for specific strong indicators in title if they match
        ['react', 'native', 'javascript', 'python', 'code', 'song', 'music', 'movie', 'film', 'gaming', 'kids'].forEach(indicator => {
            if (sourceTokens.includes(indicator) && targetTokens.includes(indicator)) {
                score += 1;
            }
        });

        return { v, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Filter out zero relevance if we have enough matches, otherwise keep them to fill the list
    // We want at least some results.
    const related = scored.filter(item => item.score > 0).map(item => item.v);

    // If we have fewer than 5 related videos, fill with random others to ensure the list isn't empty
    if (related.length < 5) {
        const others = scored.filter(item => item.score === 0).map(item => item.v);
        others.sort(() => 0.5 - Math.random()); // Shuffle others
        related.push(...others.slice(0, 10 - related.length));
    }

    return normalize(related.slice(0, 10));
};

export const searchVideos = async (query) => {
    if (!query) return [];

    if (API_KEY && API_KEY !== 'YOUR_API_KEY') {
        try {
            const searchUrl = `${BASE_URL}/search?part=snippet&type=video&maxResults=25&q=${encodeURIComponent(query)}&key=${API_KEY}`;
            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) throw new Error(`YouTube Search API error: ${searchRes.status}`);
            const searchJson = await searchRes.json();
            const ids = (searchJson.items || []).map(i => i.id.videoId).filter(Boolean);
            if (ids.length === 0) return [];

            const detailsUrl = `${BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${ids.join(',')}&key=${API_KEY}`;
            const detailsRes = await fetch(detailsUrl);
            if (!detailsRes.ok) throw new Error(`YouTube Videos API error: ${detailsRes.status}`);
            const detailsJson = await detailsRes.json();
            const items = detailsJson.items || [];
            return items.map(mapVideoItem);
        } catch (err) {
            console.warn('searchVideos failed:', err);
            await delay(500);
            const lowerQuery = query.toLowerCase();
            const filtered = MOCK_VIDEOS.filter(video =>
                video.title.toLowerCase().includes(lowerQuery) ||
                video.channel.toLowerCase().includes(lowerQuery)
            );
            return normalize(filtered);
        }
    }

    // fallback to mock search
    await delay(500);
    const lowerQuery = query.toLowerCase();
    const filtered = MOCK_VIDEOS.filter(video =>
        video.title.toLowerCase().includes(lowerQuery) ||
        video.channel.toLowerCase().includes(lowerQuery)
    );
    return normalize(filtered);
};

export const getVideoStatus = async (videoId) => {
    // Simple in-memory cache (short lived)
    getVideoStatus._cache = getVideoStatus._cache || new Map();
    const cacheKey = videoId;
    const now = Date.now();
    const cached = getVideoStatus._cache.get(cacheKey);
    if (cached && (now - cached.ts) < 60_000) {
        return cached.val;
    }

    if (!videoId) return { embeddable: true };

    if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
        // If there's no API key configured we can't check — assume embeddable to avoid blocking
        const val = { embeddable: true, note: 'no-api-key' };
        getVideoStatus._cache.set(cacheKey, { ts: now, val });
        return val;
    }

    try {
        const url = `${BASE_URL}/videos?part=status&id=${videoId}&key=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`YouTube API status error: ${res.status}`);
        const json = await res.json();
        const s = json.items?.[0]?.status || {};
        const val = { embeddable: Boolean(s.embeddable), privacyStatus: s.privacyStatus || null, uploadStatus: s.uploadStatus || null };
        getVideoStatus._cache.set(cacheKey, { ts: now, val });
        return val;
    } catch (err) {
        console.warn('getVideoStatus failed:', err);
        return { embeddable: true, error: err.message };
    }
};
