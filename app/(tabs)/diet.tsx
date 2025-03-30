import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';

export default function DietScreen() {
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const [caloriesLeft, setCaloriesLeft] = useState(1247);
  
  // Logo colors
  const primaryColor = '#6A3DE8'; // Purple from logo
  const secondaryColor = '#3D7BE8'; // Blue from logo
  const accentColor = '#FF6B00'; // Orange accent color
  
  // Macronutrient data
  const macros = [
    { name: 'CARBS', value: 122, unit: 'g left', color: '#FF5252' },
    { name: 'PROTEIN', value: 45, unit: 'g left', color: '#4CAF50' },
    { name: 'FAT', value: 20, unit: 'g left', color: '#FFC107' },
  ];
  
  // Calculate days of the week using today's date
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const [selectedDay, setSelectedDay] = useState(dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Default to today
  
  // Generate array of days for the current week
  const generateWeekDays = () => {
    const days = [];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    // Find the Monday of the current week
    const mondayDate = new Date(today);
    const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
    mondayDate.setDate(diff);
    
    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(mondayDate);
      currentDate.setDate(mondayDate.getDate() + i);
      days.push({
        day: dayNames[i === 6 ? 0 : i + 1], // Adjust index for dayNames
        date: currentDate.getDate(),
        fullDate: currentDate
      });
    }
    
    return days;
  };
  
  const days = generateWeekDays();
  
  // Planned meals data
  const meals = [
    {
      type: 'Frokost',
      name: 'Egg og avokado',
      calories: 170,
      time: '08:00',
      macros: { carbs: 25, protein: 8, fat: 3 },
      completed: true
    },
    {
        type: 'Lunsj',
        name: '',
        calories: 450,
        time: '12:00',
        macros: { carbs: 20, protein: 20, fat: 10 },
        completed: false
      },
      
    {
      type: 'Middag',
      name: 'Kylling med grønnsaker',
      calories: 340,
      time: '18:00',
      macros: { carbs: 25, protein: 20, fat: 17 },
      completed: false
    },
   
  ];
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F7FA',
    },
    darkContainer: {
      backgroundColor: '#05101a',
    },
    pageTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      padding: 16,
    },
    darkText: {
      color: '#fff',
    },
    daysContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 16,
    },
    dayButton: {
      alignItems: 'center',
      width: 40,
      height: 40,
      justifyContent: 'center',
      borderRadius: 20,
    },
    selectedDayButton: {
      backgroundColor: '#6A3DE8', // Updated to primary color
    },
    dayText: {
      fontSize: 12,
      color: isDarkMode ? '#fff' : '#000',
    },
    dateText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#212121',
    },
    selectedDayText: {
      color: '#fff',
    },
    selectedDateText: {
      color: '#fff',
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    mainCard: {
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000',
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
   
    circularProgressContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    circleBackground: {
      width: 150,
      height: 150,
      borderRadius: 75,
      borderWidth: 12,
      borderColor: '#F0F0F0',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    circleProgress: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      borderWidth: 12,
      borderLeftColor: 'transparent',
      borderBottomColor: 'transparent',
      borderRightColor: 'transparent',
      transform: [{ rotate: '0deg' }],
    },
    circleContent: {
      alignItems: 'center',
    },
    caloriesValue: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#212121',
    },
    caloriesLabel: {
      fontSize: 14,
      color: '#757575',
      marginTop: 4,
    },
    darkSubText: {
      color: '#B0B7C3',
    },
    macrosContainer: {
      gap: 16,
    },
    macroItem: {
      marginBottom: 4,
    },
    macroName: {
      fontSize: 12,
      fontWeight: '600',
      color: '#757575',
      marginBottom: 4,
    },
    macroValueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 4,
    },
    macroValue: {
      fontSize: 16,
      fontWeight: 'bold',
      marginRight: 4,
    },
    macroUnit: {
      fontSize: 12,
      color: '#757575',
    },
    progressBarContainer: {
      height: 4,
      backgroundColor: '#F0F0F0',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#212121',
    },
    mealCard: {
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      padding: 16,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    mealLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    mealImage: {
      width: 40,
      height: 40,
      borderRadius: 8,
      marginRight: 12,
    },
    mealInfo: {
      flex: 1,
    },
    mealType: {
      fontSize: 16,
      fontWeight: '600',
      color: '#212121',
    },
    mealDetails: {
      fontSize: 14,
      color: '#757575',
      marginTop: 2,
    },
    macroTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      gap: 8,
    },
    macroTag: {
      backgroundColor: '#F0F0F0',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    macroTagText: {
      fontSize: 12,
      color: '#757575',
    },
    mealRightContent: {
      marginLeft: 8,
    },
    addMealButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#F0F0F0',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }); 
  // Calculate progress percentage for the circle (70% in the example)
  const progressPercentage = 70;
  
  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.pageTitle, isDarkMode && styles.darkText]}>Din måltidsplan</Text>
      
      {/* Days of week selector */}
      <View style={styles.daysContainer}>
        {days.map((day, index) => (
          <Pressable 
            key={index}
            style={[
              styles.dayButton,
              selectedDay === index && styles.selectedDayButton,
            ]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[
              styles.dayText,
              selectedDay === index && styles.selectedDayText,
            ]}>
              {day.day}
            </Text>
            <Text style={[
              styles.dateText,
              selectedDay === index && styles.selectedDateText,
            ]}>
              {day.date}
            </Text>
          </Pressable>
        ))}
      </View>
      
      {/* Main content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Calories and macros card */}
        <View style={[styles.mainCard, isDarkMode && styles.darkCard]}>
          {/* Circular progress */}
          <View style={styles.circularProgressContainer}>
            <View style={styles.circleBackground}>
              <View style={[
                styles.circleProgress,
                { 
                  borderColor: primaryColor,
                  transform: [{ rotate: `${progressPercentage * 3.6}deg` }]
                }
              ]} />
              <View style={styles.circleContent}>
                <Text style={[styles.caloriesValue, isDarkMode && styles.darkText]}>
                  {caloriesLeft}
                </Text>
                <Text style={[styles.caloriesLabel, isDarkMode && styles.darkSubText]}>
                  KCAL LEFT
                </Text>
              </View>
            </View>
          </View>
          
          {/* Macronutrients */}
          <View style={styles.macrosContainer}>
            {macros.map((macro, index) => (
              <View key={index} style={styles.macroItem}>
                <Text style={[styles.macroName, isDarkMode && styles.darkText]}>
                  {macro.name}
                </Text>
                <View style={styles.macroValueContainer}>
                  <Text style={[styles.macroValue, { color: macro.color }]}>
                    {macro.value}
                  </Text>
                  <Text style={[styles.macroUnit, isDarkMode && styles.darkSubText]}>
                    {macro.unit}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${70 - (index * 15)}%`,
                        backgroundColor: macro.color
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* Planned Meals Section */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
          Måltider
        </Text>
        
        {meals.map((meal, index) => (
          <View key={index} style={[styles.mealCard]}>
            <View style={styles.mealLeftContent}>
              <Image 
                source={require('../../assets/images/LP.png')} 
                style={styles.mealImage}
                resizeMode="contain"
              />
              
              <View style={styles.mealInfo}>
                <Text style={[styles.mealType, isDarkMode && styles.darkText]}>
                  {meal.type} {meal.calories > 0 && `• ${meal.calories} kcal`}
                </Text>
                {meal.name ? (
                  <Text style={[styles.mealDetails, isDarkMode && styles.darkSubText]}>
                    {meal.time && `${meal.time} • `}
                    {meal.name && `${meal.name}`}
                  </Text>
                ) : (
                  <Text style={[styles.mealDetails, isDarkMode && styles.darkSubText]}>
                    {meal.time}
                  </Text>
                )}
                
                {index === 1 && (
                  <View style={styles.macroTags}>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagText}>C: {meal.macros.carbs}g</Text>
                    </View>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagText}>P: {meal.macros.protein}g</Text>
                    </View>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagText}>F: {meal.macros.fat}g</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.mealRightContent}>
              {meal.completed ? (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              ) : index === 1 ? (
                <Ionicons name="close-circle" size={24} color="#FF5252" />
              ) : (
                <Pressable style={styles.addMealButton}>
                  <Ionicons name="add" size={20} color={primaryColor} />
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

