/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useEffect } from 'react';
import { initTrackPlayer } from './src/services/trackPlayerSetup';

function App() {
  useEffect(() => {
    initTrackPlayer();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
