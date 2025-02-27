import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ScrollView, 
  Modal, 
  Platform,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function CalculatorScreen() {
  const { isDarkMode } = useTheme();
  const { session, userProfile } = useAuth();
  
  const [distance, setDistance] = useState('10');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('50');
  const [seconds, setSeconds] = useState('00');
  const [pace, setPace] = useState('5:00');
  const [calculationMode, setCalculationMode] = useState<'time' | 'pace'>('time');
  
  // State for picker modals
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPacePicker, setShowPacePicker] = useState(false);
  const [showDistancePicker, setShowDistancePicker] = useState(false);
  
  // Temporary values for pickers
  const [tempHours, setTempHours] = useState(hours);
  const [tempMinutes, setTempMinutes] = useState(minutes);
  const [tempSeconds, setTempSeconds] = useState(seconds);
  const [tempPaceMinutes, setTempPaceMinutes] = useState(pace.split(':')[0]);
  const [tempPaceSeconds, setTempPaceSeconds] = useState(pace.split(':')[1] || '00');
  const [tempDistance, setTempDistance] = useState(distance);
  
  // Quick distance options
  const distanceOptions = [
    { label: '5km', value: '5' },
    { label: '10km', value: '10' },
    { label: '21,1k', value: '21.1' },
    { label: '42,2k', value: '42.2' },
  ];

  useEffect(() => {
    calculatePace();
  }, [distance, hours, minutes, seconds, calculationMode]);

  const calculatePace = () => {
    if (calculationMode === 'pace') {
      // Calculate time based on distance and pace
      const [paceMin, paceSec] = pace.split(':').map(Number);
      const totalPaceSeconds = (paceMin * 60) + (paceSec || 0);
      const distanceValue = parseFloat(distance) || 0;
      
      const totalSeconds = totalPaceSeconds * distanceValue;
      const calculatedHours = Math.floor(totalSeconds / 3600);
      const calculatedMinutes = Math.floor((totalSeconds % 3600) / 60);
      const calculatedSeconds = Math.floor(totalSeconds % 60);
      
      setHours(calculatedHours.toString());
      setMinutes(calculatedMinutes.toString().padStart(2, '0'));
      setSeconds(calculatedSeconds.toString().padStart(2, '0'));
    } else {
      // Calculate pace based on distance and time
      const distanceValue = parseFloat(distance) || 0;
      if (distanceValue === 0) return;
      
      const totalSeconds = 
        (parseInt(hours) * 3600) + 
        (parseInt(minutes) * 60) + 
        parseInt(seconds || '0');
      
      const paceSeconds = totalSeconds / distanceValue;
      const paceMinutes = Math.floor(paceSeconds / 60);
      const paceRemainingSeconds = Math.floor(paceSeconds % 60);
      
      setPace(`${paceMinutes}:${paceRemainingSeconds.toString().padStart(2, '0')}`);
    }
  };

  const selectDistanceOption = (value: string) => {
    setDistance(value);
  };
  
  // Open time picker
  const openTimePicker = () => {
    setTempHours(hours);
    setTempMinutes(minutes);
    setTempSeconds(seconds);
    setShowTimePicker(true);
  };
  
  // Open pace picker
  const openPacePicker = () => {
    setTempPaceMinutes(pace.split(':')[0]);
    setTempPaceSeconds(pace.split(':')[1] || '00');
    setShowPacePicker(true);
  };
  
  // Open distance picker
  const openDistancePicker = () => {
    setTempDistance(distance);
    setShowDistancePicker(true);
  };
  
  // Confirm time picker
  const confirmTimePicker = () => {
    setHours(tempHours);
    setMinutes(tempMinutes);
    setSeconds(tempSeconds);
    setShowTimePicker(false);
  };
  
  // Confirm pace picker
  const confirmPacePicker = () => {
    setPace(`${tempPaceMinutes}:${tempPaceSeconds.padStart(2, '0')}`);
    setShowPacePicker(false);
  };
  
  // Confirm distance picker
  const confirmDistancePicker = () => {
    setDistance(tempDistance);
    setShowDistancePicker(false);
  };
  
  // Generate picker items
  const generatePickerItems = (max: number, padZero = true) => {
    const items = [];
    for (let i = 0; i <= max; i++) {
      const value = padZero ? i.toString().padStart(2, '0') : i.toString();
      items.push(<Picker.Item key={i} label={value} value={value} />);
    }
    return items;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
      <View style={styles.header}>
        <Ionicons name="calculator-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
          Distansekalkulator
        </Text>
      </View>

      {/* Distance Input Section */}
      <View style={[styles.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Velg distanse
        </Text>
        <Text style={[styles.subtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
          Skriv inn eller velg et av hurtigvalgene
        </Text>
        
        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={[styles.inputContainer, { backgroundColor: isDarkMode ? '#2C2C2C' : '#f9f9f9' }]}
            onPress={openDistancePicker}
          >
            <Text style={[styles.input, { color: isDarkMode ? '#fff' : '#000' }]}>
              {distance}
            </Text>
            <Text style={[styles.inputLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Distanse (km)
            </Text>
          </TouchableOpacity>
          
          <View style={styles.optionsGrid}>
            {distanceOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionButton,
                  { backgroundColor: isDarkMode ? '#2C2C2C' : '#e6eef7' }
                ]}
                onPress={() => selectDistanceOption(option.value)}
              >
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Time and Pace Section */}
      <View style={[styles.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Velg sluttid og tempo
        </Text>
        
        <View style={styles.calculationToggle}>
          <Pressable
            style={[
              styles.toggleButton,
              calculationMode === 'time' && { 
                backgroundColor: isDarkMode ? '#2C2C2C' : '#e6eef7',
                borderColor: '#0047AB'
              }
            ]}
            onPress={() => setCalculationMode('time')}
          >
            <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
              Beregn tempo
            </Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.toggleButton,
              calculationMode === 'pace' && { 
                backgroundColor: isDarkMode ? '#2C2C2C' : '#e6eef7',
                borderColor: '#0047AB'
              }
            ]}
            onPress={() => setCalculationMode('pace')}
          >
            <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
              Beregn tid
            </Text>
          </Pressable>
        </View>
        
        <View style={styles.timeAndPaceRow}>
          <TouchableOpacity 
            style={[
              styles.timeContainer, 
              { backgroundColor: isDarkMode ? '#2C2C2C' : '#f9f9f9', opacity: calculationMode === 'pace' ? 0.7 : 1 }
            ]}
            onPress={openTimePicker}
            disabled={calculationMode === 'pace'}
          >
            <Text style={[styles.timeDisplay, { color: isDarkMode ? '#fff' : '#000' }]}>
              {hours}:{minutes}:{seconds}
            </Text>
            <Text style={[styles.inputLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Tid (t:min:sek)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.paceContainer, 
              { backgroundColor: isDarkMode ? '#2C2C2C' : '#f9f9f9', opacity: calculationMode === 'time' ? 0.7 : 1 }
            ]}
            onPress={openPacePicker}
            disabled={calculationMode === 'time'}
          >
            <Text style={[styles.paceDisplay, { color: isDarkMode ? '#fff' : '#000' }]}>
              {pace}
            </Text>
            <Text style={[styles.inputLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Tempo (min/km)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Section */}
      <View style={[styles.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Resultater
        </Text>
        
        <View style={styles.resultsContainer}>
          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Total distanse:
            </Text>
            <Text style={[styles.resultValue, { color: isDarkMode ? '#fff' : '#000' }]}>
              {distance} km
            </Text>
          </View>
          
          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Total tid:
            </Text>
            <Text style={[styles.resultValue, { color: isDarkMode ? '#fff' : '#000' }]}>
              {hours}:{minutes}:{seconds}
            </Text>
          </View>
          
          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Tempo:
            </Text>
            <Text style={[styles.resultValue, { color: isDarkMode ? '#fff' : '#000' }]}>
              {pace} min/km
            </Text>
          </View>
        </View>
      </View>

      {/* Distance Picker Modal */}
      <Modal
        visible={showDistancePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalContainer}>
          <View style={[
            styles.pickerContainer, 
            { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }
          ]}>
            <View style={[
              styles.pickerHeader, 
              { borderBottomColor: isDarkMode ? '#333' : '#e0e0e0' }
            ]}>
              <TouchableOpacity onPress={() => setShowDistancePicker(false)}>
                <Text style={[styles.pickerCancel, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Avbryt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDistancePicker}>
                <Text style={styles.pickerDone}>
                  Ferdig
                </Text>
              </TouchableOpacity>
            </View>
            
            <Picker
              selectedValue={tempDistance}
              onValueChange={(itemValue) => setTempDistance(itemValue.toString())}
              style={{ color: isDarkMode ? '#fff' : '#000' }}
              itemStyle={{ color: isDarkMode ? '#fff' : '#000', height: 120 }}
            >
              {Array.from({ length: 101 }, (_, i) => i).map((num) => (
                <Picker.Item key={num} label={`${num}`} value={`${num}`} />
              ))}
            </Picker>
            <Text style={[styles.pickerCenterLabel, { color: isDarkMode ? '#fff' : '#666' }]}>
              Kilometer
            </Text>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalContainer}>
          <View style={[
            styles.pickerContainer, 
            { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }
          ]}>
            <View style={[
              styles.pickerHeader, 
              { borderBottomColor: isDarkMode ? '#333' : '#e0e0e0' }
            ]}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={[styles.pickerCancel, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Avbryt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmTimePicker}>
                <Text style={styles.pickerDone}>
                  Ferdig
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerRow}>
              <View style={styles.pickerColumn}>
                <Picker
                  selectedValue={tempHours}
                  onValueChange={(itemValue) => setTempHours(itemValue.toString())}
                  style={[styles.picker, { color: isDarkMode ? '#fff' : '#000' }]}
                  itemStyle={{ color: isDarkMode ? '#fff' : '#000', height: 120 }}
                >
                  {generatePickerItems(24, false)}
                </Picker>
                <Text style={[styles.pickerLabel, { color: isDarkMode ? '#fff' : '#666' }]}>
                  Timer
                </Text>
              </View>
              
              <View style={styles.pickerColumn}>
                <Picker
                  selectedValue={tempMinutes}
                  onValueChange={(itemValue) => setTempMinutes(itemValue.toString())}
                  style={[styles.picker, { color: isDarkMode ? '#fff' : '#000' }]}
                  itemStyle={{ color: isDarkMode ? '#fff' : '#000', height: 120 }}
                >
                  {generatePickerItems(59)}
                </Picker>
                <Text style={[styles.pickerLabel, { color: isDarkMode ? '#fff' : '#666' }]}>
                  Minutter
                </Text>
              </View>
              
              <View style={styles.pickerColumn}>
                <Picker
                  selectedValue={tempSeconds}
                  onValueChange={(itemValue) => setTempSeconds(itemValue.toString())}
                  style={[styles.picker, { color: isDarkMode ? '#fff' : '#000' }]}
                  itemStyle={{ color: isDarkMode ? '#fff' : '#000', height: 120 }}
                >
                  {generatePickerItems(59)}
                </Picker>
                <Text style={[styles.pickerLabel, { color: isDarkMode ? '#fff' : '#666' }]}>
                  Sekunder
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pace Picker Modal */}
      <Modal
        visible={showPacePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalContainer}>
          <View style={[
            styles.pickerContainer, 
            { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }
          ]}>
            <View style={[
              styles.pickerHeader, 
              { borderBottomColor: isDarkMode ? '#333' : '#e0e0e0' }
            ]}>
              <TouchableOpacity onPress={() => setShowPacePicker(false)}>
                <Text style={[styles.pickerCancel, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Avbryt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmPacePicker}>
                <Text style={styles.pickerDone}>
                  Ferdig
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerRow}>
              <View style={styles.pickerColumn}>
                <Picker
                  selectedValue={tempPaceMinutes}
                  onValueChange={(itemValue) => setTempPaceMinutes(itemValue.toString())}
                  style={[styles.picker, { color: isDarkMode ? '#fff' : '#000' }]}
                  itemStyle={{ color: isDarkMode ? '#fff' : '#000', height: 120 }}
                >
                  {generatePickerItems(59, false)}
                </Picker>
                <Text style={[styles.pickerLabel, { color: isDarkMode ? '#fff' : '#666' }]}>
                  Minutter
                </Text>
              </View>
              
              <View style={styles.pickerColumn}>
                <Picker
                  selectedValue={tempPaceSeconds}
                  onValueChange={(itemValue) => setTempPaceSeconds(itemValue.toString())}
                  style={[styles.picker, { color: isDarkMode ? '#fff' : '#000' }]}
                  itemStyle={{ color: isDarkMode ? '#fff' : '#000', height: 120 }}
                >
                  {generatePickerItems(59)}
                </Picker>
                <Text style={[styles.pickerLabel, { color: isDarkMode ? '#fff' : '#666' }]}>
                  Sekunder
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inputContainer: {
    width: '40%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  optionsGrid: {
    width: '55%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  calculationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleButton: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeAndPaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeContainer: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  timeDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paceContainer: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  paceDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 16,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContainer: {
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerCancel: {
    fontSize: 16,
  },
  pickerDone: {
    fontSize: 16,
    color: '#0047AB',
    fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerColumn: {
    width: '33%',
    alignItems: 'center',
  },
  picker: {
    width: '100%',
  },
  pickerLabel: {
    marginTop: 4,
  },
  pickerCenterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
}); 