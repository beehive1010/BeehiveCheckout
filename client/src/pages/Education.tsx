import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/UI/HexagonIcon';

interface Course {
  id: string;
  title: string;
  description: string;
  requiredLevel: number;
  priceBCC: number;
  isFree: boolean;
  duration: string;
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

  // Enroll in course mutation
  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await fetch('/api/education/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify({ courseId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enroll');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('education.enroll.success.title'),
        description: t('education.enroll.success.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/education/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: t('education.enroll.error.title'),
        description: error.message || t('education.enroll.error.description'),
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

  const getCourseIcon = (title: string) => {
    if (title.includes('Blockchain')) return 'fas fa-cube';
    if (title.includes('DeFi')) return 'fas fa-chart-line';
    if (title.includes('NFT')) return 'fas fa-palette';
    if (title.includes('Trading')) return 'fas fa-chart-bar';
    if (title.includes('Development')) return 'fas fa-code';
    if (title.includes('Workshop')) return 'fas fa-video';
    return 'fas fa-book';
  };

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
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('education.title')}
      </h2>
      
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
        {courses?.map((course) => {
          const access = getCourseAccess(course.id);
          const canEnroll = currentLevel >= course.requiredLevel;
          const hasAccess = !!access;
          const canAfford = course.isFree || (bccBalance?.transferable || 0) >= course.priceBCC;

          return (
            <Card key={course.id} className="bg-secondary border-border glow-hover card-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <HexagonIcon>
                    <i className={`${getCourseIcon(course.title)} text-honey`}></i>
                  </HexagonIcon>
                  <div>
                    <h3 className="text-honey font-semibold">{course.title}</h3>
                    <Badge 
                      variant={course.isFree ? "secondary" : "default"}
                      className={course.isFree ? "bg-green-600 text-white" : "bg-honey text-black"}
                    >
                      {course.isFree ? t('education.free') : `${course.priceBCC} BCC`}
                    </Badge>
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

                <Button
                  onClick={() => enrollMutation.mutate(course.id)}
                  className={hasAccess ? "w-full btn-honey" : !canEnroll ? "w-full btn-honey opacity-50 cursor-not-allowed" : "w-full btn-honey"}
                  disabled={!canEnroll || (!canAfford && !course.isFree) || enrollMutation.isPending}
                  data-testid={`button-course-${course.id}`}
                >
                  {enrollMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      {t('education.enrolling')}
                    </>
                  ) : hasAccess ? (
                    access.completed ? (
                      <>
                        <i className="fas fa-check mr-2"></i>
                        {t('education.completed')}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play mr-2"></i>
                        {t('education.continue')}
                      </>
                    )
                  ) : !canEnroll ? (
                    `Level ${course.requiredLevel} Required`
                  ) : !canAfford && !course.isFree ? (
                    t('education.insufficientBCC')
                  ) : course.isFree ? (
                    <>
                      <i className="fas fa-play mr-2"></i>
                      {t('education.startFree')}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-shopping-cart mr-2"></i>
                      {t('education.purchase')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        }) || []}
      </div>
    </div>
  );
}
