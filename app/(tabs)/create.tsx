import React, { useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/src/context/PostContext';
import { supabase } from '@/src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-polyfill-globals/auto';

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const { createPost } = usePosts();

  const pickImage = async () => {
    try {
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert('Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image');
    }
  };

  const handlePost = async () => {
    try {
      let imageUrl = null;
      if (image) {
        try {
          // Create file name
          const fileName = `${Date.now()}.jpg`;

          // Create form data
          const formData = new FormData();
          formData.append('file', {
            uri: image,
            name: fileName,
            type: 'image/jpeg'
          } as any);

          // Upload using fetch directly to Supabase storage
          const { data, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, formData, {
              contentType: 'multipart/form-data',
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

          imageUrl = publicUrl;
          console.log('Upload successful, URL:', imageUrl);

        } catch (imageError) {
          console.error('Image processing error:', imageError);
          alert('Failed to upload image. Please try again.');
          return;
        }
      }

      await createPost(content, imageUrl);
      router.back();
    } catch (error) {
      console.error('Error in handlePost:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            placeholderTextColor="#999"
          />
          
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <Pressable 
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#FF4B4B" />
              </Pressable>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Pressable style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="image" size={24} color="#FF4B4B" />
            </Pressable>

            <Pressable 
              style={[styles.postButton, !content && styles.postButtonDisabled]}
              onPress={handlePost}
              disabled={!content}
            >
              <Text style={styles.postButtonText}>Post</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  input: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  imageContainer: {
    position: 'relative',
    marginVertical: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  imageButton: {
    padding: 10,
  },
  postButton: {
    backgroundColor: '#FF4B4B',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});