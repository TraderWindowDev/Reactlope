import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSpotifyAccessToken, getShowEpisodes } from '@/src/utils/spotify';
import { useTheme } from '@/src/context/ThemeContext';
type PodcastEpisode = {
  id: string;
  name: string;
  description: string;
  duration_ms: number;
  images: { url: string }[];
  release_date: string;
  external_urls: { spotify: string };
  uri: string;
};

export default function PodcastScreen() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();
  // Replace with your Spotify show ID
  const SHOW_ID = '3qgFcOnvDYi42RVi6WmFFm';

  useEffect(() => {
    loadPodcasts();
  }, []);

  const loadPodcasts = async () => {
    try {
      setLoading(true);
      const token = await getSpotifyAccessToken();
      const episodesData = await getShowEpisodes(token, SHOW_ID);
      setEpisodes(episodesData.items);
    } catch (error) {
      console.error('Error loading podcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodePress = (episode: PodcastEpisode) => {
    // First try to open in Spotify app
    Linking.openURL(episode.external_urls.spotify).catch(() => {
      // If Spotify app isn't installed, open in browser
      Linking.openURL(episode.uri);
    });
  };
  const styles = StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    episodeCard: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    episodeImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    episodeInfo: {
      flex: 1,
      marginHorizontal: 12,
    },
    episodeTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
      color: isDarkMode ? '#fff' : '#000',
    },
    episodeDetails: {
      fontSize: 12,
      color: isDarkMode ? '#fff' : '#666',
      marginBottom: 4,
    },
    episodeDescription: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#444',
    },
    playButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    playButtonText: {
      color: isDarkMode ? '#0047AB' : '#1DB954',
      marginLeft: 4,
      fontSize: 14,
      fontWeight: '500',
    },
  });
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  return (
    
    <FlatList
    
      data={episodes}
      renderItem={({ item }) => (
        <Pressable 
          style={styles.episodeCard}
          onPress={() => handleEpisodePress(item)}
        >
          <Image 
            source={{ uri: item.images[0]?.url }} 
            style={styles.episodeImage} 
          />
          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.episodeDescription}>
              {new Date(item.release_date).toLocaleDateString()}
            </Text>
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.playButton}>
              <Ionicons name="play-circle" size={24} color={isDarkMode ? '#0047AB' : '#1DB954'} />
              <Text style={styles.playButtonText}>Play on Spotify</Text>
            </View>
          </View>
        </Pressable>
      )}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
    />
  );
}

