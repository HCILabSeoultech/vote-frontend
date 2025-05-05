import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getVoteStatisticsByRegion } from '../api/post';
import { RegionStatistics as RegionStatsType, StatOption } from '../types/Vote';
import Animated, { 
  FadeIn, 
  SlideInRight,
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';

const CHART_COLORS = [
  '#FF6B6B', // 빨간색
  '#4ECDC4', // 청록색
  '#45B7D1', // 하늘색
  '#96CEB4', // 민트색
  '#FFEEAD', // 연한 노란색
  '#D4A5A5', // 분홍색
  '#9B59B6', // 보라색
  '#3498DB', // 파란색
  '#2ECC71', // 초록색
  '#F1C40F', // 노란색
];

interface Props {
  voteId: number;
}

type RegionData = {
  [key: string]: {
    stat: {
      [key: string]: number;
    };
  };
};

const SkeletonLoader = () => {
  const opacity = useSharedValue(0.3);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={[styles.headerContainer, animatedStyle]}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </Animated.View>
      
      <Animated.View style={[styles.chartContainer, animatedStyle]}>
        <View style={styles.skeletonChart} />
      </Animated.View>
      
      <View style={styles.statsContainer}>
        <View style={styles.skeletonStatsTitle} />
        {[1, 2, 3, 4, 5].map((index) => (
          <Animated.View key={index} style={[styles.regionSection, animatedStyle]}>
            <View style={styles.regionHeader}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
            <View style={styles.optionsList}>
              {[1, 2].map((optionIndex) => (
                <View key={optionIndex} style={styles.optionRow}>
                  <View style={styles.skeletonOptionLabel} />
                  <View style={styles.skeletonOptionValue} />
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.aiAnalysis, animatedStyle]}>
        <View style={styles.skeletonAnalysis} />
      </Animated.View>
    </ScrollView>
  );
};

const RegionStatistics = ({ voteId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RegionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getVoteStatisticsByRegion(voteId);
      
      const typedResponse = response as RegionData;
      const cleanedResponse: RegionData = {};
      Object.keys(typedResponse).forEach(key => {
        const cleanedKey = key.replace(/^\d+\s+/, '').trim();
        cleanedResponse[cleanedKey] = typedResponse[key];
      });
      
      setStats(cleanedResponse);
    } catch (err) {
      console.error('Region Stats Error:', err);
      setError('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [voteId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const datasets = useMemo(() => {
    if (!stats) return [];
    
    const data = Object.entries(stats).map(([region, data]) => {
      const total = Object.values(data.stat).reduce<number>((sum, count) => sum + Number(count), 0);
      return {
        region,
        total,
        details: data.stat
      };
    });

    return data.sort((a, b) => b.total - a.total);
  }, [stats]);

  const totalParticipants = useMemo(() => 
    datasets.reduce((sum, { total }) => sum + total, 0),
    [datasets]
  );

  const chartData = useMemo(() => 
    datasets.map(({ region, total }, index) => ({
      name: `${region}`,
      population: total,
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    })),
    [datasets]
  );

  const maxParticipationRegion = useMemo(() => 
    datasets[0],
    [datasets]
  );

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error || !stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || '데이터를 불러올 수 없습니다.'}</Text>
      </View>
    );
  }

  console.log('[DEBUG] stats 데이터:', stats);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.headerContainer}>
        <Text style={styles.title}>지역별 투표 분포</Text>
        <Text style={styles.totalParticipants}>총 참여자 {totalParticipants}명</Text>
      </Animated.View>
      
      <Animated.View 
        entering={FadeIn.delay(300).duration(800)}
        style={styles.chartContainer}
      >
        <View style={styles.chartWrapper}>
          <View style={styles.chartSection}>
            <PieChart
              data={chartData}
              width={240}
              height={200}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="20"
              absolute
              hasLegend={false}
              center={[20, 0]}
              avoidFalseZero
            />
          </View>

          <View style={styles.quickStatsContainer}>
            {datasets.map(({ region, total }, index) => (
              <TouchableOpacity
                key={region}
                style={[
                  styles.quickStatItem,
                  selectedRegion === region && styles.selectedQuickStatItem
                ]}
                onPress={() => setSelectedRegion(region === selectedRegion ? null : region)}
              >
                <View style={[styles.colorIndicator, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                <Text style={styles.quickStatText}>
                  {region} ({total}명)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>상세 통계</Text>
        {datasets.map(({ region, total, details }, index) => (
          <Animated.View
            key={region}
            entering={FadeIn.delay(300 + (index * 100)).duration(600)}
            style={[
              styles.regionSection,
              selectedRegion === region && styles.selectedRegionSection
            ]}
          >
            <View style={styles.regionHeader}>
              <View style={styles.regionLabelContainer}>
                <Text style={styles.label}>{region}</Text>
                <View style={[styles.colorIndicator, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
              </View>
              <Text style={styles.value}>
                {total}명 ({((total / totalParticipants) * 100).toFixed(1)}%)
              </Text>
            </View>
            <View style={styles.optionsList}>
              {Object.entries(details).map(([option, count]) => (
                <View key={option} style={styles.optionRow}>
                  <Text style={styles.optionLabel}>- {option}</Text>
                  <Text style={styles.optionValue}>
                    {count}명 ({((count / total) * 100).toFixed(1)}%)
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={FadeIn.delay(800).duration(600)}
        style={styles.aiAnalysis}
      >
        <Text style={styles.aiAnalysisTitle}>AI 분석 결과</Text>
        <Text style={styles.aiAnalysisContent}>
          {maxParticipationRegion.region}에서 가장 높은 참여율({((maxParticipationRegion.total / totalParticipants) * 100).toFixed(1)}%)을 보였으며, 
          이는 해당 지역의 관심도가 특히 높았음을 나타냅니다.
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  totalParticipants: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 8,
    fontWeight: '500',
  },
  chartContainer: {
    margin: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 220,
  },
  chartWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  chartSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 0,
    marginLeft: 10,
  },
  quickStatsContainer: {
    width: 160,
    paddingRight: 0,
    justifyContent: 'center',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
  },
  selectedQuickStatItem: {
    backgroundColor: '#EBF8FF',
    borderColor: '#4299E1',
    borderWidth: 1,
  },
  quickStatText: {
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 8,
    fontWeight: '500',
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  regionSection: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedRegionSection: {
    borderColor: '#4299E1',
    borderWidth: 2,
    backgroundColor: '#F7FAFC',
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  regionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
    marginRight: 8,
  },
  value: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  optionsList: {
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  optionLabel: {
    fontSize: 15,
    color: '#4A5568',
  },
  optionValue: {
    fontSize: 15,
    color: '#4A5568',
    fontWeight: '500',
  },
  aiAnalysis: {
    margin: 16,
    padding: 20,
    backgroundColor: '#EBF8FF',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4299E1',
  },
  aiAnalysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5282',
    marginBottom: 8,
  },
  aiAnalysisContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2D3748',
  },
  skeletonChartTitle: {
    height: 20,
    width: '40%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonChart: {
    height: 220,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  skeletonStatsTitle: {
    height: 24,
    width: '30%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonLabel: {
    height: 20,
    width: '30%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonValue: {
    height: 20,
    width: '20%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonOptionLabel: {
    height: 16,
    width: '40%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonOptionValue: {
    height: 16,
    width: '15%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonAnalysis: {
    height: 48,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  headerContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  skeletonTitle: {
    height: 24,
    width: '60%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 18,
    width: '40%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
});

export default RegionStatistics; 