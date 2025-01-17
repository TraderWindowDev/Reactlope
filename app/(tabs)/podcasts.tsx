import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSpotifyAccessToken, getShowEpisodes } from '@/src/utils/spotify';

type PodcastEpisode = {
  id: string;
  name: string;
  description: string;
  duration_ms: number;
  images: { url: string }[];
  release_date: string;
};

export default function PodcastScreen() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  return (
    <FlatList
      data={episodes}
      renderItem={({ item }) => (
        <Pressable style={styles.episodeCard}>
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
          </View>
        </Pressable>
      )}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
  },
  episodeDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  episodeDescription: {
    fontSize: 14,
    color: '#444',
  },
});