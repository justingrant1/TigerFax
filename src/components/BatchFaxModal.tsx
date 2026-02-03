import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { validatePhoneNumber } from '../utils/phone-validation';

interface Recipient {
  id: string;
  number: string;
  name?: string;
}

interface BatchFaxModalProps {
  visible: boolean;
  onClose: () => void;
  onSendBatch: (recipients: Recipient[]) => void;
  documentCount: number;
}

export default function BatchFaxModal({ 
  visible, 
  onClose, 
  onSendBatch,
  documentCount 
}: BatchFaxModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');

  const addRecipient = () => {
    if (!newRecipient.trim()) {
      Alert.alert('Error', 'Please enter a fax number');
      return;
    }

    // Validate phone number
    const validation = validatePhoneNumber(newRecipient.trim());
    if (!validation.valid) {
      Alert.alert('Invalid Phone Number', validation.error || 'Please enter a valid phone number');
      return;
    }

    // Check for duplicates
    const normalizedNumber = validation.e164 || newRecipient.trim();
    if (recipients.some(r => r.number === normalizedNumber)) {
      Alert.alert('Error', 'This recipient is already in the list');
      return;
    }

    const recipient: Recipient = {
      id: Date.now().toString(),
      number: normalizedNumber,
      name: newRecipientName.trim() || undefined,
    };

    setRecipients(prev => [...prev, recipient]);
    setNewRecipient('');
    setNewRecipientName('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSendBatch = () => {
    if (recipients.length === 0) {
      Alert.alert('Error', 'Please add at least one recipient');
      return;
    }

    if (documentCount === 0) {
      Alert.alert('Error', 'Please add at least one document');
      return;
    }

    const totalCost = recipients.length * documentCount * 0.50;
    
    Alert.alert(
      'Send Batch Fax',
      `Send ${documentCount} document${documentCount !== 1 ? 's' : ''} to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}?\n\nEstimated cost: $${totalCost.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send All', 
          onPress: () => {
            onSendBatch(recipients);
            setRecipients([]);
            onClose();
          }
        }
      ]
    );
  };

  const totalCost = recipients.length * documentCount * 0.50;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="border-b border-gray-200 pb-4 pt-4 px-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-gray-900">Batch Fax</Text>
            <Pressable
              onPress={onClose}
              className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>
          <Text className="text-gray-600">
            Send the same documents to multiple recipients
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {/* Add Recipient Form */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Add Recipients</Text>
            
            <View className="space-y-3">
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="Fax number (e.g., +1-555-123-4567)"
                value={newRecipient}
                onChangeText={setNewRecipient}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
              
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="Name (optional)"
                value={newRecipientName}
                onChangeText={setNewRecipientName}
                placeholderTextColor="#9CA3AF"
              />
              
              <Pressable
                onPress={addRecipient}
                className="bg-blue-500 rounded-xl p-3 flex-row items-center justify-center space-x-2 active:bg-blue-600"
              >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-semibold">Add Recipient</Text>
              </Pressable>
            </View>
          </View>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <View className="mb-8">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Recipients ({recipients.length})
              </Text>
              
              <View className="space-y-3">
                {recipients.map((recipient) => (
                  <View key={recipient.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        {recipient.name && (
                          <Text className="text-gray-900 font-medium text-base mb-1">
                            {recipient.name}
                          </Text>
                        )}
                        <Text className="text-gray-600 text-sm">
                          {recipient.number}
                        </Text>
                      </View>
                      
                      <Pressable
                        onPress={() => removeRecipient(recipient.id)}
                        className="w-10 h-10 rounded-full bg-red-100 items-center justify-center active:bg-red-200"
                      >
                        <Ionicons name="trash" size={18} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Summary */}
          {recipients.length > 0 && documentCount > 0 && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Batch Summary</Text>
              
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Recipients:</Text>
                  <Text className="text-gray-900 font-medium">{recipients.length}</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Documents per fax:</Text>
                  <Text className="text-gray-900 font-medium">{documentCount}</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Total faxes:</Text>
                  <Text className="text-gray-900 font-medium">{recipients.length}</Text>
                </View>
                
                <View className="border-t border-blue-200 pt-2 mt-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-900 font-semibold">Estimated cost:</Text>
                    <Text className="text-gray-900 font-semibold">
                      ${totalCost.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Send Button */}
        <View className="px-6 pb-6 border-t border-gray-200 bg-white">
          <Pressable
            onPress={handleSendBatch}
            disabled={recipients.length === 0 || documentCount === 0}
            className={`rounded-xl p-4 ${
              recipients.length > 0 && documentCount > 0
                ? 'bg-blue-500 active:bg-blue-600' 
                : 'bg-gray-300'
            }`}
          >
            <Text className={`text-center font-semibold text-base ${
              recipients.length > 0 && documentCount > 0 ? 'text-white' : 'text-gray-500'
            }`}>
              Send Batch Fax {recipients.length > 0 && `(${recipients.length})`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}