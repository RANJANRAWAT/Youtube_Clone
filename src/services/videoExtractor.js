import { Alert } from 'react-native';

const APIs = [
    'https://co.wuk.sh/api/json', // Cobalt instance
    'https://api.cobalt.tools/api/json', // Official Cobalt instance
];

/**
 * Attempts to extract a direct MP4 stream URL for a given YouTube video URL.
 * @param {string} videoUrl - The full YouTube video URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID)
 * @returns {Promise<string|null>} - The direct download URL or null if failed.
 */
export const fetchStreamUrl = async (videoUrl) => {
    for (const api of APIs) {
        try {
            console.log(`Attempting to extract stream via ${api}...`);
            const response = await fetch(api, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: videoUrl,
                    vCodec: 'h264',
                    vQuality: '720',
                    aFormat: 'mp3',
                    filenamePattern: 'basic'
                })
            });

            if (!response.ok) {
                console.warn(`API ${api} failed with status: ${response.status}`);
                continue;
            }

            const data = await response.json();
            if (data && data.url) {
                console.log('Stream URL extracted successfully:', data.url);
                return data.url;
            } else {
                console.warn('API returned success but no URL in response:', data);
            }

        } catch (error) {
            console.error(`Error fetching stream from ${api}:`, error);
        }
    }

    return null;
};
