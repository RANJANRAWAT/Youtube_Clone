import TrackPlayer from 'react-native-track-player';

module.exports = async function () {
  // Minimal event handlers for remote controls
  TrackPlayer.addEventListener('remote-play', async () => {
    await TrackPlayer.play();
  });
  TrackPlayer.addEventListener('remote-pause', async () => {
    await TrackPlayer.pause();
  });
  TrackPlayer.addEventListener('remote-stop', async () => {
    await TrackPlayer.destroy();
  });
  TrackPlayer.addEventListener('remote-seek', async (data) => {
    if (data && typeof data.position === 'number') {
      await TrackPlayer.seekTo(data.position);
    }
  });
};
