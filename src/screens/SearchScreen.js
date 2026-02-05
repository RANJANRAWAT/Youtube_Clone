import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../utils/constants';
import { searchVideos } from '../services/youtubeApi';
import VideoCard from '../components/VideoCard';

const RECENT_SEARCHES = [
    'React Native tutorial', 'YouTube clone', 'JavaScript tips', 'Music 2024', 'Travel vlogs'
];

const SearchScreen = ({ onCloseSearch, onVideoSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const data = await searchVideos(query);
            setResults(Array.isArray(data) ? data : []);
            if (!Array.isArray(data)) console.warn('searchVideos returned unexpected response', data);
        } catch (err) {
            console.warn('search failed', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { setResults(null); if (typeof onCloseSearch === 'function') onCloseSearch(); }}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Search YouTube"
                    placeholderTextColor={COLORS.gray}
                    value={query}
                    onChangeText={(t) => { setQuery(t); setResults(null); }}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                    autoFocus={true}
                />
                <TouchableOpacity style={styles.micButton} onPress={handleSearch}>
                    <Text style={styles.micIcon}>🔍</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="red" style={{ marginTop: 20 }} />
            ) : Array.isArray(results) ? (
                results.length === 0 ? (
                    <View style={{alignItems:'center', marginTop:40}}>
                        <Text style={{color:COLORS.darkGray}}>No results found for "{query}"</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => { if (typeof onVideoSelect === 'function') onVideoSelect(item); }}>
                                <VideoCard video={item} />
                            </TouchableOpacity>
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                )
            ) : (
                <FlatList
                    data={RECENT_SEARCHES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.historyItem} onPress={() => { setQuery(item); handleSearch(); }}>
                            <Text style={styles.historyIcon}>🕒</Text>
                            <Text style={styles.historyText}>{item}</Text>
                            <Text style={styles.arrowIcon}>↖</Text>
                        </TouchableOpacity>
                    )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    backIcon: {
        fontSize: 24,
        marginRight: 10,
        color: COLORS.black,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        color: COLORS.black,
    },
    micButton: {
        marginLeft: 10,
        padding: 5,
        backgroundColor: COLORS.lightGray,
        borderRadius: 20,
    },
    micIcon: {
        fontSize: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    historyIcon: {
        marginRight: 15,
        fontSize: 16,
        color: COLORS.gray,
    },
    historyText: {
        flex: 1,
        fontSize: 16,
        color: COLORS.black,
        fontWeight: '500',
    },
    arrowIcon: {
        color: COLORS.gray,
        fontSize: 18,
    }
});

export default SearchScreen;
