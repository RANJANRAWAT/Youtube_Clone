import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'watch_history';
const MAX_HISTORY_ITEMS = 20;

export const addToHistory = async (video) => {
    try {
        const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
        let history = jsonValue != null ? JSON.parse(jsonValue) : [];

        // Remove existing entry for this video if it exists (to move it to top)
        history = history.filter(item => item.id !== video.id);

        // Add new video to the beginning
        history.unshift(video);

        // Limit to max items
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }

        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save history', e);
    }
};

export const getHistory = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load history', e);
        return [];
    }
};

export const clearHistory = async () => {
    try {
        await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (e) {
        console.error('Failed to clear history', e);
    }
};
