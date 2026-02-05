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
