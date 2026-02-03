import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';

interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (phoneNumber: string) => void;
}

export default function ContactPickerModal({ 
  visible, 
  onClose, 
  onSelectContact 
}: ContactPickerModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      setHasPermission(true);

      // Load real contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      if (data.length > 0) {
        const formattedContacts: Contact[] = data
          .filter(contact => contact.id && contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .map(contact => ({
            id: contact.id!,
            name: contact.name || 'Unknown',
            phoneNumbers: contact.phoneNumbers?.map(phone => phone.number || '') || [],
          }))
          .filter(contact => contact.phoneNumbers.length > 0);

        setContacts(formattedContacts);
        setFilteredContacts(formattedContacts);
      } else {
        // If no contacts found, show empty state
        setContacts([]);
        setFilteredContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts from your device');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(query.toLowerCase()) ||
      contact.phoneNumbers.some(phone => phone.includes(query))
    );
    
    setFilteredContacts(filtered);
  };

  const handleSelectPhone = (phoneNumber: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectContact(phoneNumber);
    onClose();
    setSearchQuery('');
  };

  const requestPermission = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      loadContacts();
    }
  };

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
            <Text className="text-xl font-semibold text-gray-900">Select Contact</Text>
            <Pressable
              onPress={onClose}
              className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Search Bar */}
          {hasPermission && (
            <View className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center space-x-3">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 text-base"
                placeholder="Search contacts..."
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          {!hasPermission ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="bg-blue-100 rounded-full w-20 h-20 items-center justify-center mb-6">
                <Ionicons name="people" size={40} color="#2563EB" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-3 text-center">
                Access Your Contacts
              </Text>
              <Text className="text-gray-600 text-center mb-8 leading-6">
                Allow access to your contacts to quickly select fax recipients from your address book.
              </Text>
              <Pressable
                onPress={requestPermission}
                className="bg-blue-500 rounded-xl px-8 py-4 active:bg-blue-600"
              >
                <Text className="text-white font-semibold text-base">Allow Access</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View className="flex-1 items-center justify-center">
              <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-4">
                <Ionicons name="refresh" size={32} color="#6B7280" />
              </View>
              <Text className="text-gray-600">Loading contacts...</Text>
            </View>
          ) : (
            <ScrollView className="flex-1 px-6 py-4">
              {filteredContacts.length === 0 ? (
                <View className="items-center py-12">
                  <Ionicons name="person-circle-outline" size={64} color="#D1D5DB" />
                  <Text className="text-gray-500 mt-4 text-center">
                    {searchQuery ? 'No contacts found' : 'No contacts available'}
                  </Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <View key={contact.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <Text className="text-gray-900 font-semibold text-base mb-2">
                        {contact.name}
                      </Text>
                      
                      {contact.phoneNumbers.map((phone, index) => (
                        <Pressable
                          key={index}
                          onPress={() => handleSelectPhone(phone)}
                          className="flex-row items-center justify-between py-2 px-3 -mx-3 rounded-lg active:bg-gray-200"
                        >
                          <View className="flex-row items-center space-x-3">
                            <Ionicons name="call" size={16} color="#6B7280" />
                            <Text className="text-gray-700">{phone}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}