import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  HelpCenter: undefined;
  Settings: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'HelpCenter'>;

export default function HelpCenterScreen({ navigation }: Props) {
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@tigerfax.com?subject=TigerFax Support Request');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-6 border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">Help Center</Text>
          </View>
        </View>

        {/* FAQ Section */}
        <View className="bg-white mt-4">
          <View className="px-6 py-3 border-b border-gray-100">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Frequently Asked Questions
            </Text>
          </View>

          <FAQItem
            question="How do I send a fax?"
            answer="To send a fax: 1) Tap 'Scan Document' or 'Upload File' on the home screen. 2) Add your document(s). 3) Enter the recipient's fax number. 4) Review and tap 'Send Fax'. You'll receive a notification when the fax is delivered."
          />

          <FAQItem
            question="What file formats are supported?"
            answer="TigerFax supports PDF, JPG, PNG, and other common image formats. You can also scan documents directly using your camera."
          />

          <FAQItem
            question="How many faxes can I send?"
            answer="Free users get 3 faxes per month. Pro subscribers have unlimited faxes. You can also purchase credit packs for pay-as-you-go faxing."
          />

          <FAQItem
            question="How do I receive faxes?"
            answer="Pro subscribers get a dedicated fax number for receiving faxes. Incoming faxes appear in your Inbox tab and you'll receive push notifications."
          />

          <FAQItem
            question="What countries can I send faxes to?"
            answer="TigerFax supports sending faxes to most countries worldwide. International rates may apply for some destinations."
          />

          <FAQItem
            question="How do I upgrade to Pro?"
            answer="Tap your profile icon, then 'Subscription' to view and purchase Pro plans. Pro includes unlimited faxes, a dedicated fax number, and premium features."
          />

          <FAQItem
            question="Can I cancel my subscription?"
            answer="Yes, you can cancel anytime through your App Store subscription settings. Your Pro features will remain active until the end of your billing period."
          />

          <FAQItem
            question="How do I restore my purchases?"
            answer="Go to Profile > Subscription and tap 'Restore Purchases'. This will sync your subscription across devices."
          />

          <FAQItem
            question="Is my data secure?"
            answer="Yes! All faxes are transmitted using industry-standard encryption. We take your privacy and security seriously."
          />

          <FAQItem
            question="What if my fax fails?"
            answer="If a fax fails, you'll receive a notification with the reason. Common issues include invalid fax numbers or recipient machine errors. You can retry sending at no additional cost."
          />
        </View>

        {/* Contact Support */}
        <View className="bg-white mt-4 mb-4">
          <View className="px-6 py-3 border-b border-gray-100">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Still Need Help?
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleContactSupport}
            className="flex-row items-center px-6 py-4 border-b border-gray-100"
          >
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="mail" size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900">Contact Support</Text>
              <Text className="text-sm text-gray-600 mt-0.5">
                support@tigerfax.com
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://tigerfax.com/privacy')}
            className="flex-row items-center px-6 py-4 border-b border-gray-100"
          >
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="shield-checkmark" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900">Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://tigerfax.com/terms')}
            className="flex-row items-center px-6 py-4"
          >
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="document" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900">Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      className="px-6 py-4 border-b border-gray-100"
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-medium text-gray-900 flex-1 pr-4">
          {question}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#6b7280"
        />
      </View>
      {expanded && (
        <Text className="text-sm text-gray-600 mt-2 leading-5">
          {answer}
        </Text>
      )}
    </TouchableOpacity>
  );
}
