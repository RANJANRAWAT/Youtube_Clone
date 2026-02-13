import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/constants';

const Header = ({ onSearchPress }) => {
    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png' }}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
                <Text style={styles.logoText}>YouTube</Text>
            </View>
            <View style={styles.iconsContainer}>
                <TouchableOpacity style={styles.iconButton}>
                    <Text style={styles.iconText}>📺</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Text style={styles.iconText}>🔔</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
                    <Text style={styles.iconText}>🔍</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity style={styles.profileButton}>
                    <Text style={styles.profileText}>👤</Text>
                </TouchableOpacity> */}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoIcon: {
        width: 30,
        height: 20,
        backgroundColor: 'red',
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5,
    },
    playButton: {
        width: 0,
        height: 0,
        backgroundColor: 'white',
        borderTopWidth: 3,
        borderBottomWidth: 3,
        borderLeftWidth: 6,
        borderStyle: 'solid',
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'white',
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.black,
        fontFamily: 'sans-serif-condensed',
    },
    iconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginLeft: 15,
    },
    iconText: {
        fontSize: 20,
        color: COLORS.black,
    },
    profileButton: {
        marginLeft: 15,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.darkGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileText: {
        fontSize: 14,
        color: COLORS.white,
    },
});

export default Header;
