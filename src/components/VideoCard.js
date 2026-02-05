import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../utils/constants';

const VideoCard = ({ video }) => {
    return (
        <View style={styles.container}>
            <View style={styles.thumbnailContainer}>
                <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                <View style={styles.durationContainer}>
                    <Text style={styles.durationText}>{video.duration}</Text>
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <Image source={{ uri: video.channelAvatar }} style={styles.avatar} />
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
                    <Text style={styles.subtitle}>
                        {video.channel} • {video.views} • {video.time}
                    </Text>
                </View>
                <TouchableOpacity style={styles.moreIcon}>
                    <Text style={styles.moreText}>⋮</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
    },
    thumbnailContainer: {
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: 200,
        backgroundColor: COLORS.lightGray,
    },
    durationContainer: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    detailsContainer: {
        flexDirection: 'row',
        padding: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.lightGray,
    },
    textContainer: {
        flex: 1,
        marginLeft: 10,
        paddingRight: 10,
    },
    title: {
        fontSize: 16,
        color: COLORS.black,
        fontWeight: '500',
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.darkGray,
        marginTop: 4,
    },
    moreIcon: {
        padding: 5,
    },
    moreText: {
        fontSize: 18,
        color: COLORS.black,
        fontWeight: 'bold',
    }
});

export default VideoCard;
