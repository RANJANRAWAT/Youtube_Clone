import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import Header from '../components/Header';
import VideoCard from '../components/VideoCard';
import { COLORS, FILTER_CATEGORIES } from '../utils/constants';
import { fetchPopularVideos } from '../services/youtubeApi';

const HomeScreen = ({ onVideoSelect, openSearch }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async (category = "All") => {
        setLoading(true);
        let data = [];
        try {
            if (category === "All") {
                data = await fetchPopularVideos();
            } else {
                // Use the search API to simulate filtering by category
                const { searchVideos } = require('../services/youtubeApi');
                data = await searchVideos(category);
            }
        } catch (error) {
            console.error("Failed to load videos:", error);
        }
        setVideos(data);
        setLoading(false);
    };

    const handleCategoryPress = (category) => {
        setSelectedCategory(category);
        loadVideos(category);
    };

    const renderFilterBar = () => (
        <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                {FILTER_CATEGORIES.map((category, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.filterChip,
                            selectedCategory === category && styles.activeFilterChip
                        ]}
                        onPress={() => handleCategoryPress(category)}
                    >
                        <Text style={[
                            styles.filterText,
                            selectedCategory === category && styles.activeFilterText
                        ]}>
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />
            <Header onSearchPress={openSearch} />
            {renderFilterBar()}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="red" />
                </View>
            ) : (
                <FlatList
                    data={videos}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        if (!item) return null;
                        return (
                            <TouchableOpacity onPress={() => onVideoSelect(item)}>
                                <VideoCard video={item} />
                            </TouchableOpacity>
                        );
                    }}
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
    },
    filterContainer: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        backgroundColor: COLORS.white,
        paddingVertical: 10,
    },
    filterContent: {
        paddingHorizontal: 15,
    },
    filterChip: {
        backgroundColor: '#f2f2f2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    activeFilterChip: {
        backgroundColor: COLORS.black,
        borderColor: COLORS.black,
    },
    filterText: {
        color: COLORS.black,
        fontSize: 14,
        fontWeight: '500',
    },
    activeFilterText: {
        color: COLORS.white,
    }
});

export default HomeScreen;
