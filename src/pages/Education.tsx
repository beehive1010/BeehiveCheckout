import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/shared/HexagonIcon';
import { Book, BookOpen, Award, User } from 'lucide-react';
import UserProfileCard from '../components/shared/UserProfileCard';
import { coursesApi } from '../api/education/courses.api';
import CourseDetail from '../components/education/CourseDetail';
import { useState, useMemo } from 'react';
import { Progress } from '../components/ui/progress';
import styles from '../styles/education/education.module.css';
import { useActiveAccount } from "thirdweb/react";

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
  const { t, currentLanguage } = useI18n();
  const activeAccount = useActiveAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Fetch courses with language support and user level filtering
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['/api/courses', currentLanguage, currentLevel],
    queryFn: () => coursesApi.getCourses(currentLanguage, currentLevel)
  });

  // Fetch user's course access
  const { data: courseAccess = [], isLoading: isLoadingAccess } = useQuery({
    queryKey: ['/api/course-access', walletAddress],
    queryFn: () => coursesApi.getCourseAccess(walletAddress!),
    enabled: !!walletAddress
  });

  // Purchase course mutation
  const purchaseCourseMutation = useMutation({
    mutationFn: ({ courseId, bccAmount }: { courseId: string; bccAmount: number }) =>
      coursesApi.purchaseCourse(courseId, bccAmount, activeAccount?.address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/course-access'] });
      toast({
        title: t('education.purchaseSuccess'),
        description: t('education.purchaseSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('education.purchaseError'),
        description: t('education.purchaseErrorDesc'),
        variant: 'destructive',
      });
    }
  });

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course: any) => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = filterLevel === 'all' || course.requiredLevel <= parseInt(filterLevel);
      return matchesSearch && matchesLevel;
    });
  }, [courses, searchTerm, filterLevel]);

  const hasAccess = (courseId: string) => {
    return courseAccess.some((access: CourseAccess) => access.courseId === courseId);
  };

  const getProgress = (courseId: string) => {
    const access = courseAccess.find((access: CourseAccess) => access.courseId === courseId);
    return access?.progress || 0;
  };

  const handlePurchaseCourse = (course: Course) => {
    if (currentLevel < course.requiredLevel) {
      toast({
        title: t('education.levelRequired'),
        description: t('education.levelRequiredDesc', { level: course.requiredLevel }),
        variant: 'destructive',
      });
      return;
    }

    if (!course.isFree && (bccBalance?.transferable || 0) < course.priceBCC) {
      toast({
        title: t('education.insufficientBalance'),
        description: t('education.insufficientBalanceDesc'),
        variant: 'destructive',
      });
      return;
    }

    purchaseCourseMutation.mutate({
      courseId: course.id,
      bccAmount: course.priceBCC
    });
  };

  const myCourses = courses.filter((course: any) => hasAccess(course.id));
  const completedCourses = myCourses.filter((course: any) => getProgress(course.id) === 100);
  const inProgressCourses = myCourses.filter((course: any) => {
    const progress = getProgress(course.id);
    return progress > 0 && progress < 100;
  });
  const availableCourses = courses.filter((course: any) => course.canAccess);
  const lockedCourses = courses.filter((course: any) => !course.canAccess);

  return (
    <div className={`${styles.educationContainer} container mx-auto px-4 py-8`}>
      {/* Header with UserProfile */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-2">
            {t('education.title')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('education.subtitle')}
          </p>
        </div>
        <UserProfileCard variant="compact" />
      </div>

      <Tabs defaultValue="all-courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-secondary">
          <TabsTrigger value="all-courses" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            All Courses
          </TabsTrigger>
          <TabsTrigger value="my-courses" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            My Courses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-courses" className="space-y-6">
          {/* Course Statistics */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-honey/10 via-amber-300/5 to-yellow-400/10 opacity-70"></div>
            <CardContent className="relative p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey">{availableCourses.length}</div>
                  <p className="text-sm text-muted-foreground">Available Courses</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{availableCourses.filter(c => c.isFree).length}</div>
                  <p className="text-sm text-muted-foreground">Free Courses</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{availableCourses.filter(c => !c.isFree).length}</div>
                  <p className="text-sm text-muted-foreground">Premium Courses</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{lockedCourses.length}</div>
                  <p className="text-sm text-muted-foreground">Level Locked</p>
                </div>
              </div>
              {lockedCourses.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    🔒 You have <strong>{lockedCourses.length} courses</strong> locked due to level requirements. 
                    Upgrade your membership to unlock advanced courses!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('education.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-48 bg-secondary border-border">
                <SelectValue placeholder={t('education.filterByLevel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="1">Level 1+ (Beginner)</SelectItem>
                <SelectItem value="3">Level 3+ (Intermediate)</SelectItem>
                <SelectItem value="5">Level 5+ (Advanced)</SelectItem>
                <SelectItem value="10">Level 10+ (Expert)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* All Courses Grid */}
          {isLoadingCourses ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course: any) => {
                const hasUserAccess = hasAccess(course.id);
                const progress = getProgress(course.id);
                const canAccess = course.canAccess;
                const isLevelLocked = course.levelLocked;

                return (
                  <Card key={course.id} className={`group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 transition-all duration-500 hover:scale-[1.02] shadow-2xl ${
                    isLevelLocked
                      ? 'opacity-60'
                      : 'hover:border-honey/50 hover:shadow-3xl hover:shadow-honey/20'
                  }`}>
                    {/* Honey background gradient for unlocked courses */}
                    {!isLevelLocked && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-honey/20 via-amber-300/15 to-yellow-400/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                        <div className="absolute inset-0 rounded-xl border-2 border-honey/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                      </>
                    )}
                    <CardHeader className="relative pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold mb-1 ${
                              isLevelLocked ? 'text-muted-foreground' : 'text-honey'
                            }`}>{course.title}</h3>
                            {isLevelLocked && <Badge variant="secondary">🔒 Locked</Badge>}
                            {course.isFree && <Badge variant="outline" className="text-green-500 border-green-500">FREE</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        </div>
                        <HexagonIcon className={`w-8 h-8 flex-shrink-0 ml-2 ${
                          isLevelLocked ? 'text-muted-foreground' : 'text-honey/70'
                        }`}>
                          <Book className="w-4 h-4" />
                        </HexagonIcon>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('education.duration')}</span>
                        <span>{course.duration}h</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="outline" className="capitalize">
                          {course.courseType === 'online' ? '🎥 Live' : '📚 Video'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant={canAccess ? 'default' : 'destructive'}>
                          Level {course.requiredLevel}+
                        </Badge>
                        {!course.isFree && (
                          <Badge variant="outline" className="text-honey border-honey">
                            {course.priceBCC} BCC
                          </Badge>
                        )}
                      </div>

                      {hasUserAccess && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{t('education.progress')}</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      <div className="pt-2">
                        {isLevelLocked ? (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            disabled
                          >
                            🔒 Requires Level {course.requiredLevel}
                          </Button>
                        ) : hasUserAccess ? (
                          <Button 
                            className="w-full bg-honey text-secondary hover:bg-honey/90"
                            onClick={() => setSelectedCourseId(course.id)}
                          >
                            {progress === 100 ? t('education.review') : t('education.continue')}
                          </Button>
                        ) : (
                          <Button 
                            className="w-full bg-honey text-secondary hover:bg-honey/90"
                            onClick={() => handlePurchaseCourse(course)}
                            disabled={!course.isFree && (bccBalance?.transferable || 0) < course.priceBCC}
                          >
                            {course.isFree ? '🆓 Enroll Free' : `💰 Purchase ${course.priceBCC} BCC`}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredCourses.length === 0 && !isLoadingCourses && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('education.noCourses')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-courses" className="space-y-6">
          {isLoadingAccess ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
            </div>
          ) : myCourses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-honey/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-honey" />
              </div>
              <h3 className="text-lg font-semibold text-honey mb-2">No Courses Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't enrolled in any courses yet. Browse available courses and start learning!
              </p>
              <Button
                onClick={() => {
                  const tabButton = document.querySelector('[data-state="inactive"][value="all-courses"]') as HTMLElement;
                  tabButton?.click();
                }}
                className="bg-honey text-secondary hover:bg-honey/90"
              >
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Learning Progress Summary */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-400/15 to-green-600/20 opacity-60"></div>
                <CardHeader className="relative">
                  <CardTitle className="text-honey">Learning Progress</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-honey">{myCourses.length}</div>
                      <p className="text-sm text-muted-foreground">Total Courses</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-honey">{inProgressCourses.length}</div>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-honey">{completedCourses.length}</div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* My Courses List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCourses.map((course: Course) => {
                  const progress = getProgress(course.id);
                  const isCompleted = progress === 100;

                  return (
                    <Card key={course.id} className="bg-secondary border-border hover:border-honey/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-honey">{course.title}</h3>
                              {isCompleted && <Award className="w-4 h-4 text-honey" />}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {course.description}
                            </p>
                          </div>
                          <HexagonIcon className="w-8 h-8 text-honey/70 flex-shrink-0 ml-2">
                            <Book className="w-4 h-4" />
                          </HexagonIcon>
                        </div>
                      </CardHeader>
                      <CardContent className="relative space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium text-honey">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span>{course.duration}</span>
                        </div>

                        <Badge
                          variant={isCompleted ? 'default' : progress > 0 ? 'secondary' : 'outline'}
                          className={isCompleted ? 'bg-honey text-secondary' : ''}
                        >
                          {isCompleted ? t('education.status.completed') : progress > 0 ? t('education.status.inProgress') : t('education.status.notStarted')}
                        </Badge>

                        <Button 
                          className="w-full bg-honey text-secondary hover:bg-honey/90"
                          onClick={() => setSelectedCourseId(course.id)}
                        >
                          {isCompleted ? t('education.actions.reviewCourse') : progress > 0 ? t('education.actions.continueLearning') : t('education.actions.startCourse')}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Course Detail Modal */}
      {selectedCourseId && (
        <CourseDetail 
          courseId={selectedCourseId} 
          onClose={() => setSelectedCourseId(null)} 
        />
      )}
    </div>
  );
}