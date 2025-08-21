import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/UI/HexagonIcon';
import UserProfile from '../components/UI/UserProfile';
import { useState, useMemo } from 'react';
import { Progress } from '../components/ui/progress';

interface Course {
  id: string;
  title: string;
  description: string;
  requiredLevel: number;
  priceBCC: number;
  isFree: boolean;
  duration: string;
  courseType: 'online' | 'video';
  zoomMeetingId?: string;
  zoomPassword?: string;
  zoomLink?: string;
  videoUrl?: string;
  downloadLink?: string;
}

interface CourseAccess {
  id: string;
  walletAddress: string;
  courseId: string;
  progress: number;
  completed: boolean;
  grantedAt: string;
}

export default function Education() {
  const { walletAddress, currentLevel, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');

  // Fetch courses
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/education/courses'],
    queryFn: async () => {
      const response = await fetch('/api/education/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    },
  });

  // Fetch user's course progress
  const { data: courseProgress, isLoading: isLoadingProgress } = useQuery<CourseAccess[]>({
    queryKey: ['/api/education/progress'],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch('/api/education/progress', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json();
    },
  });

  // Claim course with BCC mutation
  const claimCourseMutation = useMutation({
    mutationFn: async (data: { courseId: string; useBCCBucket: 'transferable' | 'restricted' }) => {
      const response = await fetch('/api/education/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim course');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('education.claim.success.title') || 'Course Claimed!',
        description: t('education.claim.success.description') || 'You now have access to this course.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/education/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: t('education.claim.error.title') || 'Claim Failed',
        description: error.message || t('education.claim.error.description') || 'Failed to claim course',
        variant: 'destructive',
      });
    },
  });

  const getCourseAccess = (courseId: string) => {
    return courseProgress?.find(access => access.courseId === courseId);
  };

  const getCompletedCourses = () => {
    return courseProgress?.filter(access => access.completed).length || 0;
  };

  const getInProgressCourses = () => {
    return courseProgress?.filter(access => !access.completed && access.progress > 0).length || 0;
  };

  const getTotalHours = () => {
    const enrolled = courseProgress?.map(access => access.courseId) || [];
    const enrolledCourses = courses?.filter(course => enrolled.includes(course.id)) || [];
    return enrolledCourses.reduce((total, course) => {
      const hours = parseInt(course.duration.match(/\d+/)?.[0] || '0');
      return total + hours;
    }, 0);
  };

  const getCourseIcon = (course: Course) => {
    // First check course type
    if (course.courseType === 'online') return 'fas fa-video';
    if (course.courseType === 'video') return 'fas fa-play-circle';
    
    // Then check title content for specific icons
    if (course.title.includes('Blockchain')) return 'fas fa-cube';
    if (course.title.includes('DeFi')) return 'fas fa-chart-line';
    if (course.title.includes('NFT')) return 'fas fa-palette';
    if (course.title.includes('Trading')) return 'fas fa-chart-bar';
    if (course.title.includes('Development')) return 'fas fa-code';
    
    // Default based on course type
    return course.courseType === 'online' ? 'fas fa-video' : 'fas fa-play-circle';
  };

  const getCourseCategory = (title: string) => {
    if (title.includes('Blockchain')) return 'blockchain';
    if (title.includes('DeFi') || title.includes('Finance')) return 'finance';
    if (title.includes('NFT')) return 'nft';
    if (title.includes('Trading')) return 'trading';
    if (title.includes('Development')) return 'development';
    return 'general';
  };

  const getCourseContentType = (course: Course) => {
    return course.courseType; // 'online' or 'video'
  };

  const getCoursePaymentType = (course: Course) => {
    if (course.isFree) return 'free';
    if (course.priceBCC > 0) return 'paid';
    return 'free';
  };

  // Filter courses based on search and filters
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    
    return courses.filter(course => {
      // Search query filter
      const matchesSearch = searchQuery === '' || 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
        getCourseCategory(course.title) === selectedCategory;
      
      // Level filter
      const matchesLevel = selectedLevel === 'all' || 
        course.requiredLevel.toString() === selectedLevel;
      
      // Type filter (content type)
      const matchesType = selectedType === 'all' || 
        getCourseContentType(course) === selectedType;
      
      // Payment filter
      const matchesPayment = selectedPayment === 'all' || 
        getCoursePaymentType(course) === selectedPayment;
      
      return matchesSearch && matchesCategory && matchesLevel && matchesType && matchesPayment;
    });
  }, [courses, searchQuery, selectedCategory, selectedLevel, selectedType, selectedPayment]);

  // Get unique categories, levels, and types for filter options
  const filterOptions = useMemo(() => {
    if (!courses) return { categories: [], levels: [], types: [], payments: [] };
    
    const categories = Array.from(new Set(courses.map(course => getCourseCategory(course.title))));
    const levels = Array.from(new Set(courses.map(course => course.requiredLevel))).sort((a, b) => a - b);
    const types = Array.from(new Set(courses.map(course => getCourseContentType(course))));
    const payments = Array.from(new Set(courses.map(course => getCoursePaymentType(course))));
    
    return { categories, levels, types, payments };
  }, [courses]);

  if (isLoadingCourses || isLoadingProgress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted skeleton w-64"></div>
          <Card className="bg-secondary border-border">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="h-16 bg-muted skeleton"></div>
                <div className="h-16 bg-muted skeleton"></div>
                <div className="h-16 bg-muted skeleton"></div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-secondary border-border">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted skeleton"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* User Profile Component */}
      <div className="container mx-auto px-4 pt-8">
        <UserProfile />
      </div>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-honey/5 to-transparent"></div>
        <div className="absolute top-10 right-10 opacity-10">
          <i className="fas fa-graduation-cap text-8xl text-honey"></i>
        </div>
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-honey mb-4 tracking-tight">
              {t('education.title')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Master Web3 technologies, blockchain development, and DeFi protocols with our comprehensive learning platform
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="relative max-w-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-honey/20 to-transparent rounded-xl blur-xl"></div>
              <div className="relative bg-background/80 backdrop-blur border border-honey/20 rounded-xl p-1">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t('education.search.placeholder') || "What you want to learn today?"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg bg-transparent border-none focus:ring-2 focus:ring-honey/50 rounded-xl"
                    data-testid="input-search-courses"
                  />
                  <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-honey text-lg"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        {/* Enhanced Progress Overview */}
        <Card className="bg-gradient-to-r from-secondary to-secondary/50 border-honey/20 mb-8 shadow-xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-center">
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-honey/20 flex items-center justify-center">
                    <i className="fas fa-chart-line text-honey text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-honey font-bold text-xl">
                      {t('education.progress.title')}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t('education.progress.subtitle')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-3 grid grid-cols-3 gap-6">
                <div className="text-center group">
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-600/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <span className="text-3xl font-bold text-green-400">{getCompletedCourses()}</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-white text-xs"></i>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-sm font-medium">{t('education.progress.completed')}</div>
                </div>
                
                <div className="text-center group">
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <span className="text-3xl font-bold text-blue-400">{getInProgressCourses()}</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <i className="fas fa-play text-white text-xs"></i>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-sm font-medium">{t('education.progress.inProgress')}</div>
                </div>
                
                <div className="text-center group">
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-honey/20 to-honey/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <span className="text-3xl font-bold text-honey">{getTotalHours()}</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-honey rounded-full flex items-center justify-center">
                      <i className="fas fa-clock text-black text-xs"></i>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-sm font-medium">{t('education.progress.hours')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Filter Section */}
        <Card className="bg-secondary/50 border-honey/10 mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <i className="fas fa-filter text-honey"></i>
              <h3 className="font-semibold text-honey">Filter & Discover</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-background/50 border-honey/20 hover:border-honey/40 transition-colors" data-testid="select-category">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-tags text-honey text-sm"></i>
                    <SelectValue placeholder={t('education.filters.category')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('education.filters.allCategories')}</SelectItem>
                  {filterOptions.categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="bg-background/50 border-honey/20 hover:border-honey/40 transition-colors" data-testid="select-level">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-layer-group text-honey text-sm"></i>
                    <SelectValue placeholder={t('education.filters.level')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('education.filters.allLevels')}</SelectItem>
                  {filterOptions.levels.map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      {t('education.filters.level')} {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="bg-background/50 border-honey/20 hover:border-honey/40 transition-colors" data-testid="select-type">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-play-circle text-honey text-sm"></i>
                    <SelectValue placeholder={t('education.filters.type')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('education.filters.allTypes')}</SelectItem>
                  {filterOptions.types.map((type, index) => (
                    <SelectItem key={`type-${type}-${index}`} value={type}>
                      {type === 'online' ? t('education.filters.onlineZoom') : t('education.filters.videoLessons')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                <SelectTrigger className="bg-background/50 border-honey/20 hover:border-honey/40 transition-colors" data-testid="select-payment">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-coins text-honey text-sm"></i>
                    <SelectValue placeholder={t('education.filters.payment')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('education.filters.allCourses')}</SelectItem>
                  {filterOptions.payments.map((payment, index) => (
                    <SelectItem key={`payment-${payment}-${index}`} value={payment}>
                      {payment === 'free' ? t('education.filters.freeCourses') : t('education.filters.paidBCC')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course) => {
            const access = getCourseAccess(course.id);
            const canEnroll = currentLevel >= course.requiredLevel;
            const hasAccess = !!access;
            const canAfford = course.isFree || (bccBalance?.transferable || 0) >= course.priceBCC;

            return (
              <Card 
                key={course.id} 
                className="group bg-gradient-to-br from-secondary to-secondary/50 border-honey/20 hover:border-honey/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-honey/20 cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/education/${course.id}`)}
              >
                {/* Course Header with Icon */}
                <div className="relative p-6 pb-4">
                  <div className="absolute top-4 right-4">
                    {course.isFree && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <i className="fas fa-gift mr-1"></i>
                        FREE
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-honey/20 to-honey/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i className={`${getCourseIcon(course)} text-honey text-2xl`}></i>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-secondary to-background border-2 border-honey/30 flex items-center justify-center">
                        <i className={`fas fa-${course.courseType === 'online' ? 'video' : 'play'} text-honey text-xs`}></i>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-honey font-bold text-lg mb-2 group-hover:text-honey/80 transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge 
                          variant="outline"
                          className={course.courseType === 'online' 
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                            : "bg-purple-500/20 text-purple-400 border-purple-500/30"}
                        >
                          <i className={`fas fa-${course.courseType === 'online' ? 'video' : 'play-circle'} mr-1`}></i>
                          {course.courseType === 'online' ? t('education.filters.onlineZoom') : t('education.filters.videoLessons')}
                        </Badge>
                        {!course.isFree && (
                          <Badge className="bg-honey/20 text-honey border-honey/30">
                            <i className="fas fa-coins mr-1"></i>
                            {course.priceBCC} BCC
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="px-6 pb-6">
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  
                  {hasAccess ? (
                    <div className="space-y-4 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">{t('education.progress.label')}</span>
                        <span className="text-honey font-bold">{access.progress}%</span>
                      </div>
                      <Progress 
                        value={access.progress} 
                        className="h-2 bg-secondary"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t('education.levelRequired')}</span>
                        <Badge variant="outline" className="text-honey border-honey/30">
                          Level {course.requiredLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t('education.duration')}</span>
                        <span className="text-honey font-medium">{course.duration}</span>
                      </div>
                    </div>
                  )}

                  {hasAccess ? (
                    <div className="space-y-3">
                      {/* Enhanced course access content */}
                      {course.courseType === 'online' && course.zoomLink && (
                        <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/20 border border-blue-500/30 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-blue-400 mb-1">
                                <i className="fas fa-video mr-2"></i>
                                {t('education.courseTypes.zoomMeeting')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Password: <span className="font-mono bg-background/50 px-1 rounded">{course.zoomPassword}</span>
                              </p>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(course.zoomLink, '_blank');
                              }}
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                            >
                              <i className="fas fa-external-link-alt mr-2"></i>
                              {t('education.buttons.join')}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {course.courseType === 'video' && course.videoUrl && (
                        <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/20 border border-purple-500/30 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-purple-400 mb-1">
                                <i className="fas fa-play-circle mr-2"></i>
                                {t('education.courseTypes.videoAccess')}
                              </p>
                              <p className="text-xs text-muted-foreground">{t('education.courseTypes.streamOrDownload')}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(course.videoUrl, '_blank');
                                }}
                                size="sm"
                                className="bg-purple-500 hover:bg-purple-600 text-white"
                              >
                                <i className="fas fa-play mr-2"></i>
                                {t('education.buttons.watch')}
                              </Button>
                              {course.downloadLink && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(course.downloadLink, '_blank');
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white"
                                >
                                  <i className="fas fa-download"></i>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <Button
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                        disabled
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fas fa-check-circle mr-2"></i>
                        {access.completed ? t('education.buttons.completed') : t('education.buttons.enrolled')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (course.isFree) {
                          claimCourseMutation.mutate({ 
                            courseId: course.id, 
                            useBCCBucket: 'transferable' 
                          });
                        } else {
                          const preferredBucket = (bccBalance?.restricted || 0) >= course.priceBCC ? 'restricted' : 'transferable';
                          claimCourseMutation.mutate({ 
                            courseId: course.id, 
                            useBCCBucket: preferredBucket 
                          });
                        }
                      }}
                      className={
                        !canEnroll 
                          ? "w-full bg-gradient-to-r from-gray-500 to-gray-600 opacity-50 cursor-not-allowed text-white" 
                          : !canAfford && !course.isFree
                          ? "w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                          : "w-full bg-gradient-to-r from-honey to-honey/80 hover:from-honey/80 hover:to-honey text-black font-semibold shadow-lg"
                      }
                      disabled={!canEnroll || (!canAfford && !course.isFree) || claimCourseMutation.isPending}
                      data-testid={`button-course-${course.id}`}
                    >
                      {claimCourseMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          {t('education.buttons.claiming')}
                        </>
                      ) : !canEnroll ? (
                        <>
                          <i className="fas fa-lock mr-2"></i>
                          {t('education.filters.level')} {course.requiredLevel} {t('education.buttons.levelRequired')}
                        </>
                      ) : !canAfford && !course.isFree ? (
                        <>
                          <i className="fas fa-exclamation-triangle mr-2"></i>
                          {t('education.buttons.insufficientBCC')}
                        </>
                      ) : course.isFree ? (
                        <>
                          <i className="fas fa-gift mr-2"></i>
                          {t('education.buttons.claimFree')}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-coins mr-2"></i>
                          {t('education.buttons.claimPaid').replace('{}', course.priceBCC.toString())}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
            }) || []}
        </div>
        
        {/* Results Summary */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-honey/10 flex items-center justify-center">
              <i className="fas fa-search text-honey text-3xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-honey mb-2">No courses found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Try adjusting your search criteria or filters to discover more learning opportunities.
            </p>
          </div>
        )}
        
        {filteredCourses.length > 0 && (
          <div className="text-center mt-12 py-8 border-t border-honey/20">
            <p className="text-muted-foreground">
              Showing <span className="text-honey font-semibold">{filteredCourses.length}</span> courses
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
