import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/UI/HexagonIcon';
import UserProfile from '../components/UI/UserProfile';
import { useState, useMemo } from 'react';

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
    <div className="container mx-auto px-4 py-8">
      {/* User Profile Component */}
      <UserProfile />
      
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('education.title')}
      </h2>
      
      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder={t('education.search.placeholder') || "What you want to learn"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12 py-3 rounded-lg border-border bg-background"
            data-testid="input-search-courses"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-honey transition-colors">
            <i className="fas fa-sliders-h"></i>
          </button>
        </div>
        
        {/* Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-category">
              <SelectValue placeholder={t('education.filters.category')} />
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
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-level">
              <SelectValue placeholder={t('education.filters.level')} />
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
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-type">
              <SelectValue placeholder={t('education.filters.type')} />
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
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-payment">
              <SelectValue placeholder={t('education.filters.payment')} />
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
      </div>
      
      {/* Progress Overview */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h3 className="text-honey font-semibold text-lg">
                {t('education.progress.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('education.progress.subtitle')}
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">{getCompletedCourses()}</div>
                <div className="text-muted-foreground text-sm">{t('education.progress.completed')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">{getInProgressCourses()}</div>
                <div className="text-muted-foreground text-sm">{t('education.progress.inProgress')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">{getTotalHours()}</div>
                <div className="text-muted-foreground text-sm">{t('education.progress.hours')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const access = getCourseAccess(course.id);
          const canEnroll = currentLevel >= course.requiredLevel;
          const hasAccess = !!access;
          const canAfford = course.isFree || (bccBalance?.transferable || 0) >= course.priceBCC;

          return (
            <Card key={course.id} className="bg-secondary border-border glow-hover card-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <HexagonIcon>
                    <i className={`${getCourseIcon(course)} text-honey`}></i>
                  </HexagonIcon>
                  <div className="flex-1">
                    <h3 className="text-honey font-semibold">{course.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline"
                        className={course.courseType === 'online' ? "bg-blue-600 text-white border-blue-600" : "bg-purple-600 text-white border-purple-600"}
                      >
                        {course.courseType === 'online' ? t('education.filters.onlineZoom') : t('education.filters.videoLessons')}
                      </Badge>
                      <Badge 
                        variant={course.isFree ? "secondary" : "default"}
                        className={course.isFree ? "bg-green-600 text-white" : "bg-honey text-black"}
                      >
                        {course.isFree ? t('education.free') || 'Free' : `${course.priceBCC} BCC`}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4">{course.description}</p>
                
                {hasAccess ? (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('education.progress.label')}</span>
                      <span className="text-honey">{access.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${access.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('education.levelRequired')}</span>
                      <span className="text-honey">Level {course.requiredLevel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('education.duration')}</span>
                      <span className="text-honey">{course.duration}</span>
                    </div>
                  </div>
                )}

                {hasAccess ? (
                  <div className="space-y-2">
                    {/* Show course access content based on type */}
                    {course.courseType === 'online' && course.zoomLink && (
                      <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-400">{t('education.courseTypes.zoomMeeting')}</p>
                            <p className="text-xs text-muted-foreground">Password: {course.zoomPassword}</p>
                          </div>
                          <Button
                            onClick={() => window.open(course.zoomLink, '_blank')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <i className="fas fa-video mr-2"></i>
                            {t('education.buttons.join')}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {course.courseType === 'video' && course.videoUrl && (
                      <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-400">{t('education.courseTypes.videoAccess')}</p>
                            <p className="text-xs text-muted-foreground">{t('education.courseTypes.streamOrDownload')}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => window.open(course.videoUrl, '_blank')}
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <i className="fas fa-play mr-2"></i>
                              {t('education.buttons.watch')}
                            </Button>
                            {course.downloadLink && (
                              <Button
                                onClick={() => window.open(course.downloadLink, '_blank')}
                                size="sm"
                                variant="outline"
                                className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
                              >
                                <i className="fas fa-download mr-2"></i>
                                {t('education.buttons.download')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled
                    >
                      <i className="fas fa-check mr-2"></i>
                      {access.completed ? t('education.buttons.completed') : t('education.buttons.enrolled')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      if (course.isFree) {
                        claimCourseMutation.mutate({ 
                          courseId: course.id, 
                          useBCCBucket: 'transferable' 
                        });
                      } else {
                        // Prefer restricted BCC first, then transferable
                        const preferredBucket = (bccBalance?.restricted || 0) >= course.priceBCC ? 'restricted' : 'transferable';
                        claimCourseMutation.mutate({ 
                          courseId: course.id, 
                          useBCCBucket: preferredBucket 
                        });
                      }
                    }}
                    className={!canEnroll ? "w-full btn-honey opacity-50 cursor-not-allowed" : "w-full btn-honey"}
                    disabled={!canEnroll || (!canAfford && !course.isFree) || claimCourseMutation.isPending}
                    data-testid={`button-course-${course.id}`}
                  >
                    {claimCourseMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        {t('education.buttons.claiming')}
                      </>
                    ) : !canEnroll ? (
                      `${t('education.filters.level')} ${course.requiredLevel} ${t('education.buttons.levelRequired')}`
                    ) : !canAfford && !course.isFree ? (
                      t('education.buttons.insufficientBCC')
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
    </div>
  );
}
