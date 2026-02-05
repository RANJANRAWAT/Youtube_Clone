import TrackPlayer, { Capability } from 'react-native-track-player';

export async function initTrackPlayer() {
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      stopWithApp: false,
      capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo],
      compactCapabilities: [Capability.Play, Capability.Pause],
      notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    });
    console.warn('TrackPlayer initialized');
  } catch (e) {
    console.warn('TrackPlayer init failed', e);
  }
}
