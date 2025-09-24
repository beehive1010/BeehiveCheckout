import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Clock, ChevronLeft, ChevronRight, Award, Filter, Search, Calendar, X } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

interface RewardHistory {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  date: string;
  layer?: number;
}

interface RewardHistoryProps {
  history: RewardHistory[];
  className?: string;
}

export default function RewardHistory({ history, className }: RewardHistoryProps) {
  const { t } = useI18n();
  
  // Filters and pagination state
  const [historyFilters, setHistoryFilters] = useState({
    layer: '',
    searchKeyword: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [filteredHistory, setFilteredHistory] = useState<RewardHistory[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and pagination logic
  useEffect(() => {
    if (!history) {
      setFilteredHistory([]);
      return;
    }

    let filtered = [...history];

    // Apply filters
    if (historyFilters.layer) {
      filtered = filtered.filter(item => item.layer?.toString() === historyFilters.layer);
    }
    
    if (historyFilters.searchKeyword) {
      const keyword = historyFilters.searchKeyword.toLowerCase();
      filtered = filtered.filter(item => 
        item.description?.toLowerCase().includes(keyword) ||
        item.id?.toLowerCase().includes(keyword)
      );
    }
    
    if (historyFilters.dateFrom) {
      filtered = filtered.filter(item => new Date(item.date) >= new Date(historyFilters.dateFrom));
    }
    
    if (historyFilters.dateTo) {
      filtered = filtered.filter(item => new Date(item.date) <= new Date(historyFilters.dateTo));
    }
    
    if (historyFilters.status) {
      filtered = filtered.filter(item => item.status === historyFilters.status);
    }

    setFilteredHistory(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [history, historyFilters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setHistoryFilters({ layer: '', searchKeyword: '', dateFrom: '', dateTo: '', status: '' });
  };

  const hasActiveFilters = historyFilters.layer || historyFilters.searchKeyword || 
                          historyFilters.dateFrom || historyFilters.dateTo || historyFilters.status;

  if (!history || history.length === 0) {
    return (
      <Card className={`border-0 shadow-lg bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-900/10 dark:to-green-900/10 ${className}`}>
        <CardContent className="p-8 md:p-12">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
              <Award className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('rewards.noHistory')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {t('rewards.noHistoryDescription') || 'Your reward transactions will appear here once you start earning through the matrix system.'}
            </p>
            <Button variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
              <span className="text-sm">{t('rewards.learnMore') || 'Learn More'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {/* Premium Header */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 border-0 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.1),transparent_70%)]" />
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {t('rewards.history.title') || 'Reward History'}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('rewards.history.subtitle') || 'Complete transaction history and reward tracking'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="bg-emerald-500/15 border-emerald-500/30 text-emerald-500 font-semibold px-3 py-1"
              >
                {filteredHistory.length} {t('rewards.history.transactions') || 'Transactions'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Enhanced Filters Panel */}
      {showFilters && (
        <Card className="border border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/10 dark:to-green-900/10">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-500" />
                {t('rewards.history.filters') || 'Filters'}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('rewards.history.searchPlaceholder') || 'Search...'}
                  value={historyFilters.searchKeyword}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, searchKeyword: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Layer Filter */}
              <select
                value={historyFilters.layer}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, layer: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">{t('rewards.history.allLayers') || 'All Layers'}</option>
                <option value="1">Layer 1</option>
                <option value="2">Layer 2</option>
                <option value="3">Layer 3</option>
              </select>

              {/* Status Filter */}
              <select
                value={historyFilters.status}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">{t('rewards.history.allStatus') || 'All Status'}</option>
                <option value="completed">{t('rewards.status.completed') || 'Completed'}</option>
                <option value="pending">{t('rewards.status.pending') || 'Pending'}</option>
                <option value="failed">{t('rewards.status.failed') || 'Failed'}</option>
              </select>

              {/* Date From */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={historyFilters.dateFrom}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={historyFilters.dateTo}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('rewards.history.clearFilters') || 'Clear Filters'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground text-center">
        {t('rewards.history.showing') || 'Showing'} {Math.min(paginatedHistory.length, itemsPerPage)} {t('rewards.history.of') || 'of'} {filteredHistory.length} {t('rewards.history.results') || 'results'}
      </div>

      {/* Enhanced History List */}
      <div className="grid gap-3 md:gap-4">
        {paginatedHistory.length > 0 ? paginatedHistory.map((reward, index) => (
          <Card 
            key={reward.id} 
            className="group relative overflow-hidden border border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'fadeInUp 0.5s ease-out forwards'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status Icon */}
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    reward.status === 'completed' 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                    reward.status === 'pending' 
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                      'bg-gradient-to-br from-red-500 to-red-600'
                  } shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {reward.status === 'completed' ? (
                      <svg className="h-4 w-4 md:h-5 md:w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : reward.status === 'pending' ? (
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    ) : (
                      <svg className="h-4 w-4 md:h-5 md:w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm md:text-base text-foreground line-clamp-1 mb-1">
                      {reward.description}
                    </h5>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <span>{reward.date}</span>
                      {reward.layer && (
                        <>
                          <span>•</span>
                          <span>Layer {reward.layer}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Amount and Status */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${reward.amount.toFixed(2)}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs mt-1 ${
                      reward.status === 'completed' 
                        ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' :
                      reward.status === 'pending' 
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' :
                        'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {reward.status === 'completed' ? t('rewards.status.completed') || 'Completed' :
                     reward.status === 'pending' ? t('rewards.status.pending') || 'Pending' :
                     t('rewards.status.failed') || 'Failed'}
                  </Badge>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-muted/50 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    reward.status === 'completed' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 w-full' :
                    reward.status === 'pending' 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 w-2/3' :
                      'bg-gradient-to-r from-red-500 to-red-600 w-1/3'
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="border border-border/50">
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                {t('rewards.history.noFilteredResults') || 'No transactions match your filters'}
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  {t('rewards.history.clearFilters') || 'Clear Filters'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <Card className="border-0 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/10 dark:to-green-900/10">
          <CardContent className="p-4">
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-10 w-10 p-0 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 w-10 p-0 ${
                        currentPage === page
                          ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                          : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-10 w-10 p-0 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center mt-3 text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}