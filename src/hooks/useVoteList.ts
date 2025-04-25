import { useState, useCallback } from 'react';
import { getMainPageVotes, getVoteById } from '../api/post';
import type { VoteResponse } from '../types/Vote';

export const useVoteList = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchInitialVotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getMainPageVotes(0);
      setVotes(response.content);
      setHasMore(response.content.length === 10);
      setPage(0);
    } catch (error) {
      console.error('초기 투표 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await getMainPageVotes(nextPage);
      
      if (response.content.length > 0) {
        setVotes(prev => [...prev, ...response.content]);
        setHasMore(response.content.length === 10);
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('다음 페이지 로딩 실패:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, isLoadingMore, hasMore]);

  const refreshVotes = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getMainPageVotes(0);
      setVotes(response.content);
      setHasMore(response.content.length === 10);
      setPage(0);
    } catch (error) {
      console.error('투표 새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const updateVoteById = useCallback(async (voteId: number) => {
    try {
      const updatedVote = await getVoteById(voteId);
      setVotes(prev => 
        prev.map(vote => 
          vote.voteId === voteId ? updatedVote : vote
        )
      );
    } catch (error) {
      console.error('투표 업데이트 실패:', error);
    }
  }, []);

  return {
    votes,
    isLoading,
    isLoadingMore,
    refreshing,
    hasMore,
    fetchInitialVotes,
    fetchNextPage,
    refreshVotes,
    updateVoteById
  };
}; 