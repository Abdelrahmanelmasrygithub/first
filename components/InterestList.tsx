// app/(tabs)/InterestList.tsx (كومبوننت منفصل لقائمة الاهتمامات)
import React from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

interface InterestListProps {
  interests: string[];
  newInterest: string;
  setNewInterest: (value: string) => void;
  addInterest: () => void;
  removeInterest: (index: number) => void;
}

export default function InterestList({ interests, newInterest, setNewInterest, addInterest, removeInterest }: InterestListProps) {
  return (
    <>
      <Text style={styles.label}>اهتماماتك</Text>
      <View style={styles.interestsList}>
        {interests.map((item, index) => (
          <View key={index} style={styles.interestTag}>
            <Text style={styles.interestText}>{item}</Text>
            <TouchableOpacity onPress={() => removeInterest(index)}>
              <Text style={styles.remove}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.addInterest}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={newInterest}
          onChangeText={setNewInterest}
          placeholder="أضف اهتمام جديد"
        />
        <Button title="إضافة" onPress={addInterest} color="#0066cc" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: { 
    fontSize: 17, 
    fontWeight: '600', 
    marginTop: 20, 
    marginBottom: 8, 
    color: '#333',
    textAlign: 'right'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    textAlign: 'right'
  },
  interestsList: {
    flexDirection: 'row-reverse', // لدعم RTL
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  interestTag: {
    flexDirection: 'row-reverse', // لدعم RTL
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
  },
  interestText: { 
    color: '#0066cc', 
    fontWeight: '600' 
  },
  remove: { 
    color: 'red', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  addInterest: { 
    flexDirection: 'row-reverse', // لدعم RTL
    alignItems: 'center', 
    gap: 12, 
    marginTop: 10 
  },
});