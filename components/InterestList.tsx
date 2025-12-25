// app/(tabs)/InterestList.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface InterestListProps {
  interests: string[];
  newInterest: string;
  setNewInterest: (value: string) => void;
  addInterest: (interest?: string) => void;
  removeInterest: (index: number) => void;
}

const SUGGESTED_INTERESTS = [
  'البرمجة',
  'التصميم',
  'الذكاء الاصطناعي',
  'الرياضة',
  'القراءة',
  'السفر',
  'التصوير',
  'الألعاب',
];

export default function InterestList({
  interests,
  newInterest,
  setNewInterest,
  addInterest,
  removeInterest,
}: InterestListProps) {
  return (
    <>
      <Text style={styles.label}>اهتماماتك</Text>

      {/* الاهتمامات الحالية */}
      <View style={styles.interestsList}>
        {interests.map((item, index) => (
          <View key={index} style={styles.interestTag}>
            <Text style={styles.interestText}>{item}</Text>
            <TouchableOpacity onPress={() => removeInterest(index)}>
              <Text style={styles.remove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* إدخال اهتمام جديد */}
      <View style={styles.addInterest}>
        <TextInput
          style={styles.input}
          value={newInterest}
          onChangeText={setNewInterest}
          placeholder="أضف اهتمام جديد"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.addButton} onPress={() => addInterest()}>
          <Text style={styles.addButtonText}>إضافة</Text>
        </TouchableOpacity>
      </View>

      {/* اقتراحات */}
      <Text style={styles.suggestionLabel}>اقتراحات</Text>
      <View style={styles.suggestions}>
        {SUGGESTED_INTERESTS.map((item) => (
          <TouchableOpacity
            key={item}
            style={styles.suggestionChip}
            onPress={() => addInterest(item)}
          >
            <Text style={styles.suggestionText}>+ {item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    color: '#222',
    textAlign: 'right',
  },

  interestsList: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },

  interestTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },

  interestText: {
    color: '#4338CA',
    fontWeight: '600',
  },

  remove: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
  },

  addInterest: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FFF',
    fontSize: 16,
    textAlign: 'right',
  },

  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },

  addButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },

  suggestionLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    color: '#444',
  },

  suggestions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },

  suggestionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },

  suggestionText: {
    color: '#374151',
    fontWeight: '500',
  },
}); 