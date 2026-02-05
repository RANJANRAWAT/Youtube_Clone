import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/constants';

const MENU_ITEMS = [
    { icon: '🎬', label: 'Your videos' },
    { icon: '⬇️', label: 'Downloads' },
    { icon: '🎥', label: 'Your movies' },
    { icon: '⏱️', label: 'Time watched' },
    { icon: '❓', label: 'Help and feedback' },
];

const ProfileScreen = () => {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: 'https://ui-avatars.com/api/?name=User&background=random' }}
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.name}>John Doe</Text>
                    <Text style={styles.handle}>@johndoe • View Channel</Text>
                </View>
            </View>

            <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>History</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyList}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={styles.historyCard}>
                            <View style={styles.historyThumbnail} />
                            <Text style={styles.historyVideoTitle} numberOfLines={2}>Watched Video with a long title {i}</Text>
                            <Text style={styles.historyChannelName}>Channel Name</Text>
                        </View>
                    ))}
                </ScrollView>
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
