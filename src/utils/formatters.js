export const formatDuration = (isoDuration) => {
    if (!isoDuration) return '';
    // Check if it's already formatted (doesn't start with PT)
    if (!isoDuration.startsWith('PT')) return isoDuration;

    const matches = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!matches) return isoDuration;

    const hours = (matches[1] ? matches[1].replace('H', '') : '0');
    const minutes = (matches[2] ? matches[2].replace('M', '') : '0');
    const seconds = (matches[3] ? matches[3].replace('S', '') : '0');

    let result = '';
    if (parseInt(hours) > 0) {
        result += `${hours}:`;
        result += `${minutes.padStart(2, '0')}:`;
    } else {
        result += `${minutes}:`;
    }
    result += seconds.padStart(2, '0');

    return result;
};

export const formatTimeAgo = (isoDate) => {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + " years ago";

        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + " months ago";

        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + " days ago";

        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + " hours ago";

        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + " minutes ago";

        return Math.floor(seconds) + " seconds ago";
    } catch (e) {
        return isoDate;
    }
};
