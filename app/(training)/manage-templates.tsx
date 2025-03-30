import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Modal, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/src/lib/supabase';
import { Button } from '../../components/Button';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';

type Template = {
  id: number;
  name: string;
  description: string;
  sets: number | null;
  reps: number | null;
  duration_minutes: number;
  type: 'exercise' | 'rest' | 'cardio';
};

export default function ManageTemplatesScreen() {
  const { session } = useAuth();
  const { isDarkMode } = useTheme();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [templateDetails, setTemplateDetails] = useState({
    name: '',
    description: '',
    sets: '',
    reps: '',
    duration_minutes: '',
    type: 'exercise' as const
  });
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const params = useLocalSearchParams();

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (params.prefill) {
      try {
        const prefillData = JSON.parse(params.prefill as string);
        setTemplateDetails(prefillData);
        setModalVisible(true);  // Automatically open modal with prefilled data
      } catch (error) {
        console.error('Error parsing prefill data:', error);
      }
    }
  }, [params.prefill]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_templates')
        .select('*')

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (!templateDetails.name.trim()) {
        Alert.alert('Error', 'Template name is required');
        return;
      }

      const templateData = {
        name: templateDetails.name.trim(),
        description: templateDetails.description?.trim() || '',
        sets: templateDetails.type === 'rest' ? 0 : parseInt(templateDetails.sets) || null,
        reps: templateDetails.type === 'rest' ? 0 : parseInt(templateDetails.reps) || null,
        duration_minutes: parseInt(templateDetails.duration_minutes) || 0,
        type: templateDetails.type,
        coach_id: session?.user.id
      };

      if (editingTemplateId) {
        // Update existing template
        const { error } = await supabase
          .from('exercise_templates')
          .update(templateData)
          .eq('id', editingTemplateId);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from('exercise_templates')
          .insert([templateData]);

        if (error) throw error;
      }

      // Reset form and close modal
      setModalVisible(false);
      setEditingTemplateId(null);
      setTemplateDetails({
        name: '',
        description: '',
        sets: '',
        reps: '',
        duration_minutes: '',
        type: 'exercise'
      });
      
      // Refresh templates list
      fetchTemplates();
      
      Alert.alert(
        'Success', 
        editingTemplateId ? 'Template updated successfully' : 'Template created successfully'
      );

    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleEditTemplate = (template: Template) => {
    setTemplateDetails({
      name: template.name,
      description: template.description || '',
      sets: template.sets?.toString() || '',
      reps: template.reps?.toString() || '',
      duration_minutes: template.duration_minutes.toString(),
      type: template.type
    });
    setEditingTemplateId(template.id);
    setModalVisible(true);
  };

  const handleDeleteTemplate = (templateId: number) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne malen?',
      [
        {
          text: 'Avbryt',
          style: 'cancel'
        },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('exercise_templates')
                .delete()
                .eq('id', templateId);

              if (error) throw error;
              
              // Refresh templates list
              fetchTemplates();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          }
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    addButton: {
      marginBottom: 16,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#fff',
      borderRadius: 8,
      alignItems: 'center',
    },
    templateCard: {
      marginBottom: 12,
      padding: 16,
    },
    templateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    templateName: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    templateType: {
      fontSize: 14,
      textTransform: 'capitalize',
    },
    templateDescription: {
      marginBottom: 8,
    },
    templateDetails: {
      fontSize: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      padding: 16,
    },
    modalContent: {
      borderRadius: 12,
      padding: 16,
      maxHeight: '80%',
      borderWidth: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    modalScrollView: {
      width: '100%',
    },
    modalScrollContent: {
      paddingBottom: 20,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: 'transparent',
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    saveButton: {
      marginTop: 16,
      backgroundColor: '#0047AB',
      borderRadius: 8,
      alignItems: 'center',
    },
    templateContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    templateInfo: {
      flex: 1,
    },
    templateActions: {
      flexDirection: 'row',
      marginLeft: 16,
    },
    actionButton: {
      padding: 8,
      marginLeft: 8,
    },
  }); 
  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
      <Button 
        title="Opprett ny mal"
        onPress={() => {
          setEditingTemplateId(null);
          setTemplateDetails({
            name: '',
            description: '',
            sets: '',
            reps: '',
            duration_minutes: '',
            type: 'exercise'
          });
          setModalVisible(true);
        }}
        style={styles.addButton}
      />
        <ScrollView>
      {templates.map((template) => (
        <Card key={template.id} style={[styles.templateCard, { 
          backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
          borderColor: isDarkMode ? '#333' : '#ccc'
        }]}>
          <View style={styles.templateContent}>
            <View style={styles.templateInfo}>
              <Text style={[styles.templateName, { color: isDarkMode ? '#fff' : '#000' }]}>
                {template.name}
              </Text>
              <Text style={[styles.templateType, { color: isDarkMode ? '#aaa' : '#666' }]}>
                {template.type}
              </Text>
              {template.description && (
                <Text style={[styles.templateDescription, { color: isDarkMode ? '#aaa' : '#666' }]}>
                  {template.description}
                </Text>
              )}
              <Text style={[styles.templateDetails, { color: isDarkMode ? '#aaa' : '#666' }]}>
                {template.type === 'exercise' 
                  ? `${template.sets || 0} sets × ${template.reps || 0} reps • ${template.duration_minutes}min`
                  : `Varighet: ${template.duration_minutes}min`
                }
              </Text>
            </View>
            <View style={styles.templateActions}>
              <Pressable
                onPress={() => handleEditTemplate(template)}
                style={styles.actionButton}
              >
                <Ionicons 
                  name="pencil" 
                  size={20} 
                  color={isDarkMode ? '#fff' : '#000'} 
                />
              </Pressable>
              <Pressable
                onPress={() => handleDeleteTemplate(template.id)}
                style={styles.actionButton}
              >
                <Ionicons 
                  name="trash" 
                  size={20} 
                  color="#ff4444" 
                />
              </Pressable>
            </View>
          </View>
        </Card>
      ))}
      </ScrollView>
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
            borderColor: isDarkMode ? '#333' : '#ccc'
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
                {editingTemplateId ? 'Oppdater mal' : 'Lagre mal'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Type</Text>
                <Picker
                  selectedValue={templateDetails.type}
                  onValueChange={(value) => setTemplateDetails({
                    ...templateDetails,
                    type: value,
                    sets: value === 'rest' ? '0' : templateDetails.sets,
                    reps: value === 'rest' ? '0' : templateDetails.reps,
                  })}
                  style={{ color: isDarkMode ? '#fff' : '#000', backgroundColor: isDarkMode ? '#2C2C2C' : '#fff' }}
                >
                  <Picker.Item label="Exercise" value="exercise" />
                  <Picker.Item label="Rest" value="rest" />
                  <Picker.Item label="Cardio" value="cardio" />
                </Picker>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Navn</Text>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ccc' }]}
                  value={templateDetails.name}
                  onChangeText={(text) => setTemplateDetails({...templateDetails, name: text})}
                  placeholder="Malenavn"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Beskrivelse</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ccc' }]}
                  value={templateDetails.description}
                  onChangeText={(text) => setTemplateDetails({...templateDetails, description: text})}
                  placeholder="Malbeskrivelse"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  multiline
                />
              </View>

              {templateDetails.type !== 'rest' && (
                <>
                  {templateDetails.type === 'exercise' && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Set</Text>
                        <TextInput
                          style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ccc' }]}
                          value={templateDetails.sets}
                          onChangeText={(text) => setTemplateDetails({...templateDetails, sets: text})}
                          placeholder="Antall set"
                          placeholderTextColor={isDarkMode ? '#666' : '#999'}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Rep</Text>
                        <TextInput
                          style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ccc' }]}
                          value={templateDetails.reps}
                          onChangeText={(text) => setTemplateDetails({...templateDetails, reps: text})}
                          placeholder="Antall reps"
                          placeholderTextColor={isDarkMode ? '#666' : '#999'}
                          keyboardType="numeric"
                        />
                      </View>
                    </>
                  )}
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Varighet (minutter)</Text>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ccc' }]}
                  value={templateDetails.duration_minutes}
                  onChangeText={(text) => setTemplateDetails({...templateDetails, duration_minutes: text})}
                  placeholder="Varighet i minutter"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  keyboardType="numeric"
                />
              </View>

              <Button
                title={editingTemplateId ? 'Oppdater mal' : 'Lagre mal'}
                onPress={handleSaveTemplate}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
