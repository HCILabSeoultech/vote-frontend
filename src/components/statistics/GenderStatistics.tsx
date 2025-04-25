import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getVoteStatisticsByGender } from '../../api/post';
import { GenderStatistics as GenderStatsType } from '../../types/Vote';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

interface Props {
  voteId: number;
}

const GENDER_COLORS = {
  MALE: '#4299E1',
  FEMALE: '#F687B3',
};

const GENDER_LABELS = {
  MALE: '남성',
  FEMALE: '여성',
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
      <Text style={styles.title}>성별 투표 분포</Text>
      
      <Animated.View style={[styles.chartContainer, animatedStyle]}>
        <View style={styles.skeletonChartTitle} />
        <View style={styles.skeletonChart} />
      </Animated.View>
      
      <View style={styles.statsContainer}>
        <View style={styles.skeletonStatsTitle} />
        {[1, 2].map((index) => (
          <Animated.View key={index} style={[styles.genderSection, animatedStyle]}>
            <View style={styles.genderHeader}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
            <View style={styles.optionsList}>
              {[1, 2, 3].map((optionIndex) => (
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

const GenderStatistics = ({ voteId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GenderStatsType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getVoteStatisticsByGender(voteId);
      setStats(response);
    } catch (err) {
      console.error('Gender Stats Error:', err);
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
    
    return Object.entries(stats).map(([gender, data]) => {
      const total = Object.values(data.stat).reduce((sum, count) => sum + count, 0);
      return {
        gender,
        total,
        details: data.stat
      };
    });
  }, [stats]);

  const totalParticipants = useMemo(() => 
    datasets.reduce((sum, { total }) => sum + total, 0),
    [datasets]
  );

  const chartData = useMemo(() => 
    datasets.map(({ gender, total }) => ({
      name: GENDER_LABELS[gender as keyof typeof GENDER_LABELS] || gender,
      population: total,
      color: GENDER_COLORS[gender as keyof typeof GENDER_COLORS] || '#A0AEC0',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    })),
    [datasets]
  );

  const { maxParticipationGender, genderDiff } = useMemo(() => {
    const maxParticipationGender = datasets.reduce((max, current) => 
      current.total > max.total ? current : max,
      datasets[0]
    );

    const genderDiff = datasets.length >= 2 ? 
      Math.abs(datasets[0].total - datasets[1].total) : 
      0;

    return { maxParticipationGender, genderDiff };
  }, [datasets]);

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error || !stats || datasets.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || '데이터를 불러올 수 없습니다.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>성별 투표 분포</Text>
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>참여자 현황</Text>
        <PieChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute
        />
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>상세 통계</Text>
        {datasets.map(({ gender, total, details }) => (
          <View key={gender} style={styles.genderSection}>
            <View style={styles.genderHeader}>
              <Text style={styles.label}>
                {GENDER_LABELS[gender as keyof typeof GENDER_LABELS] || gender}
              </Text>
              <Text style={styles.value}>
                총 {total}명 ({((total / totalParticipants) * 100).toFixed(1)}%)
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
          </View>
        ))}
      </View>

      <Text style={styles.aiAnalysis}>
        AI 분석 결과: {GENDER_LABELS[maxParticipationGender.gender as keyof typeof GENDER_LABELS] || maxParticipationGender.gender}의 
        참여율이 더 높게 나타났으며 ({maxParticipationGender.total}명, 
        {((maxParticipationGender.total / totalParticipants) * 100).toFixed(1)}%), 
        성별 간의 차이는 {genderDiff}명입니다.
      </Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 16,
  },
  chartContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2D3748',
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  genderSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  genderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  optionsList: {
    paddingLeft: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
  },
  optionLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  optionValue: {
    fontSize: 14,
    color: '#4A5568',
  },
  aiAnalysis: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
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
});

export default GenderStatistics; 