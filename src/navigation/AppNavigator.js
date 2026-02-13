import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VideoScreen from '../screens/VideoScreen';
import ShortsScreen from '../screens/ShortsScreen';
import { COLORS } from '../utils/constants';

const AppNavigator = () => {
    const [activeTab, setActiveTab] = useState('Home');
    const [selectedVideo, setSelectedVideo] = useState(null);

    const onVideoSelect = (video) => {
        setSelectedVideo(video);
        setActiveTab('Video');
    };

    const renderScreen = () => {
        switch (activeTab) {
            case 'Home':
                return <HomeScreen onVideoSelect={onVideoSelect} openSearch={() => setActiveTab('Search')} />;
            case 'Search':
                return <SearchScreen onCloseSearch={() => setActiveTab('Home')} onVideoSelect={onVideoSelect} />;
            case 'Video':
                return <VideoScreen videoParam={selectedVideo} onVideoSelect={onVideoSelect} />;
            case 'Shorts':
                return <ShortsScreen />;
            case 'Create':
                return <View style={styles.center}><Text>Create Placeholder</Text></View>;
            case 'Subscriptions':
                return <View style={styles.center}><Text>Subscriptions Placeholder</Text></View>;
            case 'Library': // Using Library as Profile for now based on typical layout, or could be separate
                return <ProfileScreen />;
            default:
                return <HomeScreen onVideoSelect={onVideoSelect} openSearch={() => setActiveTab('Search')} />;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {renderScreen()}
            </View>

            {/* Custom Bottom Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Home')}>
                    <Text style={[styles.tabIcon, activeTab === 'Home' && styles.activeTab]}>🏠</Text>
                    <Text style={[styles.tabLabel, activeTab === 'Home' && styles.activeTab]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Shorts')}>
                    <Text style={styles.tabIcon}>⚡</Text>
                    <Text style={styles.tabLabel}>Shorts</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Create')}>
                    <View style={styles.createButton}>
                        <Text style={styles.createIcon}>+</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Subscriptions')}>
                    <Text style={styles.tabIcon}>📺</Text>
                    <Text style={styles.tabLabel}>Subscriptions</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Library')}>
                    <Text style={[styles.tabIcon, activeTab === 'Library' && styles.activeTab]}>📁</Text>
                    <Text style={[styles.tabLabel, activeTab === 'Library' && styles.activeTab]}>Library</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    content: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        height: 50,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
        backgroundColor: COLORS.white,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabIcon: {
        fontSize: 20,
        color: COLORS.black,
        marginBottom: 2,
    },
    tabLabel: {
        fontSize: 10,
        color: COLORS.black,
    },
    activeTab: {
        color: COLORS.black,
        fontWeight: 'bold',
    },
    createButton: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderColor: COLORS.black,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createIcon: {
        fontSize: 24,
        color: COLORS.black,
        lineHeight: 24, // Adjust for vertical centering
    }
});

export default AppNavigator;
