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
import UserProfile from '../components/shared/UserProfile';
import { coursesApi } from '../api/education/courses.api';
import { useState, useMemo } from 'react';
import { Progress } from '../components/ui/progress';
import styles from '../styles/education/education.module.css';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Fetch courses
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['/api/courses'],
    queryFn: coursesApi.getCourses
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
      coursesApi.purchaseCourse(courseId, bccAmount),
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
    return courses.filter((course: Course) => {
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

  const myCourses = courses.filter((course: Course) => hasAccess(course.id));
  const completedCourses = myCourses.filter((course: Course) => getProgress(course.id) === 100);
  const inProgressCourses = myCourses.filter((course: Course) => {
    const progress = getProgress(course.id);
    return progress > 0 && progress < 100;
  });

  return (
    <div className={`${styles.educationContainer} container mx-auto px-4 py-8`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-honey mb-2">
            {t('education.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('education.subtitle')}
          </p>
        </div>
        <UserProfile />
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
                <SelectItem value="all">{t('education.allLevels')}</SelectItem>
                <SelectItem value="1">{t('education.level')} 1+</SelectItem>
                <SelectItem value="3">{t('education.level')} 3+</SelectItem>
                <SelectItem value="5">{t('education.level')} 5+</SelectItem>
                <SelectItem value="10">{t('education.level')} 10+</SelectItem>
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
              {filteredCourses.map((course: Course) => {
                const hasUserAccess = hasAccess(course.id);
                const progress = getProgress(course.id);
                const canAccess = currentLevel >= course.requiredLevel;

                return (
                  <Card key={course.id} className="bg-secondary border-border hover:border-honey/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-honey mb-1">{course.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        </div>
                        <HexagonIcon className="w-8 h-8 text-honey/70 flex-shrink-0 ml-2">
                          <Book className="w-4 h-4" />
                        </HexagonIcon>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('education.duration')}</span>
                        <span>{course.duration}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant={canAccess ? 'default' : 'destructive'}>
                          {t('education.level')} {course.requiredLevel}+
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
                        {hasUserAccess ? (
                          <Button 
                            className="w-full bg-honey text-secondary hover:bg-honey/90"
                            onClick={() => setSelectedCourse(course)}
                          >
                            {progress === 100 ? t('education.review') : t('education.continue')}
                          </Button>
                        ) : (
                          <Button 
                            className="w-full bg-honey text-secondary hover:bg-honey/90"
                            onClick={() => handlePurchaseCourse(course)}
                            disabled={!canAccess || (!course.isFree && (bccBalance?.transferable || 0) < course.priceBCC)}
                          >
                            {course.isFree ? t('education.enroll') : t('education.purchase')}
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
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-honey">Learning Progress</CardTitle>
                </CardHeader>
                <CardContent>
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
                      <CardContent className="space-y-3">
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
                          {isCompleted ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started'}
                        </Badge>

                        <Button 
                          className="w-full bg-honey text-secondary hover:bg-honey/90"
                          onClick={() => setSelectedCourse(course)}
                        >
                          {isCompleted ? 'Review Course' : progress > 0 ? 'Continue Learning' : 'Start Course'}
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
    </div>
  );
}