import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS } from '../utils/constants';
import { getHistory, clearHistory } from '../utils/storage';

const MENU_ITEMS = [
    { icon: '🎬', label: 'Your videos' },
    { icon: '⬇️', label: 'Downloads' },
    { icon: '🎥', label: 'Your movies' },
    { icon: '⏱️', label: 'Time watched' },
    { icon: '❓', label: 'Help and feedback' },
];

const ProfileScreen = () => {
    const [history, setHistory] = useState([]);

    const [avatarError, setAvatarError] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const data = await getHistory();
        setHistory(data);
    };

    const handleClearHistory = async () => {
        Alert.alert(
            "Clear History",
            "Are you sure you want to clear your watch history?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear", onPress: async () => {
                        await clearHistory();
                        setHistory([]);
                    }
                }
            ]
        );
    };
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{
                        uri: avatarError
                            ? 'https://via.placeholder.com/150'
                            : 'https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128'
                    }}
                    style={styles.avatar}
                    onError={() => setAvatarError(true)}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.name}>Ranjan Rawat</Text>
                    <Text style={styles.handle}>@ranjanrawat • View Channel</Text>
                </View>
            </View>

            <View style={styles.historySection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>History</Text>
                    {history.length > 0 && (
                        <TouchableOpacity onPress={handleClearHistory}>
                            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {history.length === 0 ? (
                    <Text style={{ color: COLORS.darkGray, fontStyle: 'italic' }}>No watch history yet</Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyList}>
                        {history.map((item, index) => (
                            <View key={item.id || index} style={styles.historyCard}>
                                <Image
                                    source={{ uri: item.thumbnail || `https://img.youtube.com/vi/${item.id}/hqdefault.jpg` }}
                                    style={styles.historyThumbnail}
                                    resizeMode="cover"
                                />
                                <Text style={styles.historyVideoTitle} numberOfLines={2}>{item.title}</Text>
                                <Text style={styles.historyChannelName}>{item.channel}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={styles.menuContainer}>
                {MENU_ITEMS.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.menuItem}>
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
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
        padding: 15,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    userInfo: {
        marginLeft: 15,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.black,
    },
    handle: {
        fontSize: 14,
        color: COLORS.darkGray,
        marginTop: 2,
    },
    historySection: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 10,
    },
    historyList: {
        flexDirection: 'row',
    },
    historyCard: {
        width: 140,
        marginRight: 10,
    },
    historyThumbnail: {
        width: 140,
        height: 80,
        backgroundColor: COLORS.gray,
        borderRadius: 8,
        marginBottom: 5,
    },
    historyVideoTitle: {
        fontSize: 14,
        color: COLORS.black,
        fontWeight: '500',
    },
    historyChannelName: {
        fontSize: 12,
        color: COLORS.darkGray,
    },
    menuContainer: {
        padding: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    menuIcon: {
        fontSize: 24,
        marginRight: 20,
        width: 30,
        textAlign: 'center',
    },
    menuLabel: {
        fontSize: 18,
        color: COLORS.black,
    },
});

export default ProfileScreen;
