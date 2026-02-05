/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import TrackPlayer from 'react-native-track-player';

// Register the playback service (see src/services/playerService.js)
TrackPlayer.registerPlaybackService(() => require('./src/services/playerService'));

AppRegistry.registerComponent(appName, () => App);
