/**
 * Usage & Cost Tracking Screen
 * Shows fax usage statistics and cost estimates
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFaxStore } from '../state/fax-store';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

const COST_PER_PAGE = 0.10; // $0.10 per page

export default function UsageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { faxHistory } = useFaxStore();

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const lastMonth = { 
      start: startOfMonth(subMonths(now, 1)), 
      end: endOfMonth(subMonths(now, 1)) 
    };

    // Filter faxes by period
    const currentMonthFaxes = faxHistory.filter(fax =>
      isWithinInterval(new Date(fax.timestamp), currentMonth)
    );

    const lastMonthFaxes = faxHistory.filter(fax =>
      isWithinInterval(new Date(fax.timestamp), lastMonth)
    );

    // Calculate totals
    const totalFaxes = faxHistory.length;
    const totalPages = faxHistory.reduce((sum, fax) => sum + fax.totalPages, 0);
    const totalCost = totalPages * COST_PER_PAGE;

    const successfulFaxes = faxHistory.filter(fax => fax.status === 'sent').length;
    const failedFaxes = faxHistory.filter(fax => fax.status === 'failed').length;
    const successRate = totalFaxes > 0 ? (successfulFaxes / totalFaxes * 100) : 0;

    // Current month stats
    const currentMonthTotal = currentMonthFaxes.length;
    const currentMonthPages = currentMonthFaxes.reduce((sum, fax) => sum + fax.totalPages, 0);
    const currentMonthCost = currentMonthPages * COST_PER_PAGE;

    // Last month stats
    const lastMonthTotal = lastMonthFaxes.length;
    const lastMonthPages = lastMonthFaxes.reduce((sum, fax) => sum + fax.totalPages, 0);
    const lastMonthCost = lastMonthPages * COST_PER_PAGE;

    // Average cost per fax
    const avgCostPerFax = totalFaxes > 0 ? totalCost / totalFaxes : 0;

    return {
      totalFaxes,
      totalPages,
      totalCost,
      successfulFaxes,
      failedFaxes,
      successRate,
      currentMonthTotal,
      currentMonthPages,
      currentMonthCost,
      lastMonthTotal,
      lastMonthPages,
      lastMonthCost,
      avgCostPerFax,
    };
  }, [faxHistory]);

  return (
    <View className="flex-1 bg-white">
      <View style={{ paddingTop: insets.top }} className="bg-white border-b border-gray-200 pb-4">
        <View className="px-6 pt-4 flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4 w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-3xl font-bold text-gray-900 mb-2">Usage & Costs</Text>
            <Text className="text-gray-600">Track your fax usage and expenses</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Overview Cards */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Overview</Text>
          
          <View className="flex-row space-x-3 mb-3">
            <View className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Ionicons name="document-text" size={24} color="#2563EB" />
              <Text className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalFaxes}
              </Text>
              <Text className="text-gray-600 text-sm">Total Faxes</Text>
            </View>

            <View className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4">
              <Ionicons name="document" size={24} color="#059669" />
              <Text className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalPages}
              </Text>
              <Text className="text-gray-600 text-sm">Total Pages</Text>
            </View>
          </View>

          <View className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="cash" size={24} color="#7C3AED" />
                <Text className="text-gray-600 text-sm">Total Cost</Text>
              </View>
              <Text className="text-xs text-gray-500">
                ${COST_PER_PAGE.toFixed(2)}/page
              </Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              ${stats.totalCost.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Success Rate */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Performance</Text>
          
          <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-900 font-medium">Success Rate</Text>
              <Text className="text-2xl font-bold text-green-600">
                {stats.successRate.toFixed(1)}%
              </Text>
            </View>
            
            <View className="bg-gray-200 rounded-full h-2 mb-3">
              <View 
                className="bg-green-500 rounded-full h-2" 
                style={{ width: `${stats.successRate}%` }}
              />
            </View>

            <View className="flex-row justify-between text-sm">
              <Text className="text-gray-600">
                ✓ {stats.successfulFaxes} Successful
              </Text>
              <Text className="text-gray-600">
                ✗ {stats.failedFaxes} Failed
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Comparison */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Monthly Usage</Text>
          
          <View className="space-y-3">
            {/* Current Month */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Text className="text-gray-900 font-semibold mb-3">
                {format(new Date(), 'MMMM yyyy')} (Current)
              </Text>
              
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Faxes Sent:</Text>
                  <Text className="text-gray-900 font-medium">{stats.currentMonthTotal}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Pages Sent:</Text>
                  <Text className="text-gray-900 font-medium">{stats.currentMonthPages}</Text>
                </View>
                <View className="flex-row justify-between border-t border-blue-300 pt-2">
                  <Text className="text-gray-900 font-semibold">Total Cost:</Text>
                  <Text className="text-blue-600 font-bold">
                    ${stats.currentMonthCost.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Last Month */}
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <Text className="text-gray-900 font-semibold mb-3">
                {format(subMonths(new Date(), 1), 'MMMM yyyy')}
              </Text>
              
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Faxes Sent:</Text>
                  <Text className="text-gray-900 font-medium">{stats.lastMonthTotal}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Pages Sent:</Text>
                  <Text className="text-gray-900 font-medium">{stats.lastMonthPages}</Text>
                </View>
                <View className="flex-row justify-between border-t border-gray-300 pt-2">
                  <Text className="text-gray-900 font-semibold">Total Cost:</Text>
                  <Text className="text-gray-900 font-bold">
                    ${stats.lastMonthCost.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Additional Stats */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Additional Stats</Text>
          
          <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Average Cost per Fax:</Text>
              <Text className="text-gray-900 font-medium">
                ${stats.avgCostPerFax.toFixed(2)}
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Average Pages per Fax:</Text>
              <Text className="text-gray-900 font-medium">
                {stats.totalFaxes > 0 ? (stats.totalPages / stats.totalFaxes).toFixed(1) : '0'}
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Cost per Page:</Text>
              <Text className="text-gray-900 font-medium">
                ${COST_PER_PAGE.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <View className="flex-row items-start space-x-3">
            <Ionicons name="information-circle" size={24} color="#D97706" />
            <View className="flex-1">
              <Text className="text-yellow-900 font-semibold mb-1">Cost Estimates</Text>
              <Text className="text-yellow-800 text-sm">
                These are estimated costs based on ${COST_PER_PAGE.toFixed(2)} per page. 
                Actual costs may vary based on your Sinch Fax API plan and usage.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
