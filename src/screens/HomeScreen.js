import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import VideoCard from '../components/VideoCard';
import { COLORS } from '../utils/constants';
import { fetchPopularVideos } from '../services/youtubeApi';

const HomeScreen = ({ onVideoSelect, openSearch }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadVideos = async () => {
            const data = await fetchPopularVideos();
            setVideos(data);
            setLoading(false);
        };
        loadVideos();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />
            <Header onSearchPress={openSearch} />
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="red" />
                </View>
            ) : (
                <FlatList
                    data={videos}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => onVideoSelect(item)}>
                            <VideoCard video={item} />
                        </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default HomeScreen;
