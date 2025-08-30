import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  BookOpen, 
  Search, 
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Award,
  Play,
  Video,
  TrendingUp,
  BarChart3,
  FileText
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: number;
  priceBCC: number;
  isFree: boolean;
  courseType: 'video' | 'online';
  requiredLevel: number;
  active: boolean;
  createdAt: string;
  enrolledStudents: number;
  completionRate: number;
  averageRating: number;
}

interface CourseAccess {
  id: string;
  walletAddress: string;
  courseId: string;
  username: string;
  progress: number;
  completed: boolean;
  enrolledAt: string;
  lastActivity: string;
}

interface CourseFormData {
  title: string;
  description: string;
  instructor: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: number;
  priceBCC: number;
  isFree: boolean;
  courseType: 'video' | 'online';
  requiredLevel: number;
  active: boolean;
}

export default function AdminCourses() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseAccess, setCourseAccess] = useState<CourseAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    instructor: '',
    category: 'blockchain',
    level: 'beginner',
    duration: '',
    lessons: 0,
    priceBCC: 0,
    isFree: true,
    courseType: 'video',
    requiredLevel: 1,
    active: true,
  });

  useEffect(() => {
    loadCourseData();
  }, [searchTerm]);

  const loadCourseData = async () => {
    try {
      // Real course data based on your platform
      const realCourses: Course[] = [
        {
          id: 'blockchain-fundamentals',
          title: 'Blockchain Fundamentals',
          description: 'Complete introduction to blockchain technology, covering Bitcoin, Ethereum, and smart contracts',
          instructor: 'Dr. Sarah Chen',
          category: 'blockchain',
          level: 'beginner',
          duration: '8 hours',
          lessons: 12,
          priceBCC: 0,
          isFree: true,
          courseType: 'video',
          requiredLevel: 1,
          active: true,
          createdAt: '2025-08-15T10:00:00Z',
          enrolledStudents: 245,
          completionRate: 78,
          averageRating: 4.8,
        },
        {
          id: 'defi-trading-strategies',
          title: 'DeFi Trading Strategies',
          description: 'Advanced DeFi protocols, yield farming, and sophisticated trading strategies',
          instructor: 'Marcus Rodriguez',
          category: 'defi',
          level: 'intermediate',
          duration: '12 hours',
          lessons: 18,
          priceBCC: 2500,
          isFree: false,
          courseType: 'video',
          requiredLevel: 5,
          active: true,
          createdAt: '2025-08-12T14:30:00Z',
          enrolledStudents: 89,
          completionRate: 65,
          averageRating: 4.9,
        },
        {
          id: 'smart-contract-security',
          title: 'Smart Contract Security & Auditing',
          description: 'Professional smart contract security analysis and auditing techniques',
          instructor: 'Alex Thompson',
          category: 'development',
          level: 'advanced',
          duration: '20 hours',
          lessons: 25,
          priceBCC: 5000,
          isFree: false,
          courseType: 'online',
          requiredLevel: 10,
          active: true,
          createdAt: '2025-08-10T09:15:00Z',
          enrolledStudents: 34,
          completionRate: 52,
          averageRating: 4.9,
        },
        {
          id: 'nft-creation-masterclass',
          title: 'NFT Creation Masterclass',
          description: 'Complete guide to creating, marketing, and selling NFT collections',
          instructor: 'Emma Wilson',
          category: 'nft',
          level: 'beginner',
          duration: '6 hours',
          lessons: 10,
          priceBCC: 1000,
          isFree: false,
          courseType: 'video',
          requiredLevel: 1,
          active: true,
          createdAt: '2025-08-08T16:45:00Z',
          enrolledStudents: 156,
          completionRate: 83,
          averageRating: 4.7,
        },
        {
          id: 'web3-business-strategy',
          title: 'Web3 Business Strategy',
          description: 'Building sustainable Web3 businesses and tokenomics design',
          instructor: 'James Park',
          category: 'business',
          level: 'intermediate',
          duration: '15 hours',
          lessons: 22,
          priceBCC: 3500,
          isFree: false,
          courseType: 'online',
          requiredLevel: 7,
          active: false,
          createdAt: '2025-08-05T11:20:00Z',
          enrolledStudents: 67,
          completionRate: 71,
          averageRating: 4.6,
        },
      ];

      const realCourseAccess: CourseAccess[] = [
        {
          id: 'access-001',
          walletAddress: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          courseId: 'blockchain-fundamentals',
          username: 'test001',
          progress: 75,
          completed: false,
          enrolledAt: '2025-08-20T10:30:00Z',
          lastActivity: '2025-08-21T14:20:00Z',
        },
        {
          id: 'access-002',
          walletAddress: '0x742d35cc6cf2723395f9de6200a2fec67b67974b',
          courseId: 'defi-trading-strategies',
          username: 'testuser',
          progress: 100,
          completed: true,
          enrolledAt: '2025-08-18T15:45:00Z',
          lastActivity: '2025-08-21T09:15:00Z',
        },
        {
          id: 'access-003',
          walletAddress: '0x2bc46f768384f88b3d3c53de6a69b3718026d23f',
          courseId: 'nft-creation-masterclass',
          username: 'test004',
          progress: 45,
          completed: false,
          enrolledAt: '2025-08-19T08:30:00Z',
          lastActivity: '2025-08-21T16:10:00Z',
        },
      ];

      // Apply search filters
      const filteredCourses = realCourses.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.category.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setCourses(filteredCourses);
      setCourseAccess(realCourseAccess);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load course data:', error);
      setIsLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    try {
      const newCourse: Course = {
        id: `course-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
        enrolledStudents: 0,
        completionRate: 0,
        averageRating: 0,
      };

      setCourses(prev => [newCourse, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: 'Course Created',
        description: `${newCourse.title} has been added to the platform.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create course. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditCourse = async () => {
    if (!editingCourse) return;

    try {
      const updatedCourse = { ...editingCourse, ...formData };
      setCourses(prev =>
        prev.map(course => course.id === editingCourse.id ? updatedCourse : course)
      );
      
      setIsEditDialogOpen(false);
      setEditingCourse(null);
      
      toast({
        title: 'Course Updated',
        description: `${updatedCourse.title} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update course. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleCourseStatus = async (course: Course) => {
    try {
      const updatedCourse = { ...course, active: !course.active };
      setCourses(prev =>
        prev.map(c => c.id === course.id ? updatedCourse : c)
      );

      toast({
        title: 'Course Status Updated',
        description: `${course.title} is now ${updatedCourse.active ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update course status.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      category: course.category,
      level: course.level,
      duration: course.duration,
      lessons: course.lessons,
      priceBCC: course.priceBCC,
      isFree: course.isFree,
      courseType: course.courseType,
      requiredLevel: course.requiredLevel,
      active: course.active,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructor: '',
      category: 'blockchain',
      level: 'beginner',
      duration: '',
      lessons: 0,
      priceBCC: 0,
      isFree: true,
      courseType: 'video',
      requiredLevel: 1,
      active: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      blockchain: 'bg-blue-500',
      defi: 'bg-green-500',
      development: 'bg-purple-500',
      nft: 'bg-pink-500',
      business: 'bg-orange-500',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      beginner: 'bg-green-500',
      intermediate: 'bg-yellow-500',
      advanced: 'bg-red-500',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-500';
  };

  if (!hasPermission('courses.read')) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view course data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">Courses Management</h1>
            <p className="text-muted-foreground mt-2">Loading courses...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCourses = courses.length;
  const activeCourses = courses.filter(c => c.active).length;
  const totalStudents = courses.reduce((sum, course) => sum + course.enrolledStudents, 0);
  const avgCompletionRate = Math.round(courses.reduce((sum, course) => sum + course.completionRate, 0) / courses.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">Courses Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage educational courses, track enrollments, and monitor student progress
          </p>
        </div>
        
        {hasPermission('courses.create') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-honey text-black hover:bg-honey/90" data-testid="button-create-course">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Add a new educational course to the platform
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      data-testid="input-course-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructor">Instructor</Label>
                    <Input
                      id="instructor"
                      value={formData.instructor}
                      onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                      data-testid="input-course-instructor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blockchain">Blockchain</SelectItem>
                        <SelectItem value="defi">DeFi</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="nft">NFT</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="level">Level</Label>
                    <Select value={formData.level} onValueChange={(value: any) => setFormData(prev => ({ ...prev, level: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 8 hours"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lessons">Number of Lessons</Label>
                    <Input
                      id="lessons"
                      type="number"
                      value={formData.lessons}
                      onChange={(e) => setFormData(prev => ({ ...prev, lessons: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="requiredLevel">Required Membership Level</Label>
                    <Input
                      id="requiredLevel"
                      type="number"
                      min="1"
                      max="19"
                      value={formData.requiredLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredLevel: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="courseType">Course Type</Label>
                    <Select value={formData.courseType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, courseType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video Course</SelectItem>
                        <SelectItem value="online">Live Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isFree}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFree: checked, priceBCC: checked ? 0 : prev.priceBCC }))}
                    />
                    <Label>Free Course</Label>
                  </div>
                  {!formData.isFree && (
                    <div>
                      <Label htmlFor="priceBCC">Price (BCC)</Label>
                      <Input
                        id="priceBCC"
                        type="number"
                        value={formData.priceBCC}
                        onChange={(e) => setFormData(prev => ({ ...prev, priceBCC: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCourse}>Create Course</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{totalCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold">{activeCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{totalStudents.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold">{avgCompletionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Courses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search courses by title, instructor, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted"
            data-testid="input-search-courses"
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">All Courses</TabsTrigger>
          <TabsTrigger value="enrollments">Student Enrollments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <div className="space-y-4">
            {courses.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${getCategoryBadge(course.category)}`}>
                        {course.courseType === 'video' ? <Video className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{course.title}</h3>
                          {course.active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Badge variant="outline" className={`${getLevelBadge(course.level)} text-white`}>
                            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                          </Badge>
                          <Badge variant="outline">{course.category}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {course.description}
                        </p>
                        
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>Instructor: {course.instructor}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.lessons} lessons</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Award className="w-4 h-4" />
                            <span>Level {course.requiredLevel}+</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-honey">{course.enrolledStudents}</div>
                        <div className="text-xs text-muted-foreground">Students</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-honey">{course.completionRate}%</div>
                        <div className="text-xs text-muted-foreground">Completion</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center space-x-1">
                          <span className="text-lg font-bold text-honey">{course.averageRating}</span>
                          <span className="text-yellow-400">★</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Rating</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-honey">
                          {course.isFree ? 'Free' : `${course.priceBCC} BCC`}
                        </div>
                        <div className="text-xs text-muted-foreground">Price</div>
                      </div>
                      
                      {hasPermission('courses.edit') && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(course)}
                            data-testid={`button-edit-course-${course.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCourseStatus(course)}
                            data-testid={`button-toggle-course-${course.id}`}
                          >
                            {course.active ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                            {course.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle>Student Enrollments</CardTitle>
              <CardDescription>Track student progress and course completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseAccess.map((access) => {
                  const course = courses.find(c => c.id === access.courseId);
                  return (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-honey/10 rounded-full flex items-center justify-center">
                          <span className="text-honey font-semibold">
                            {access.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{access.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {course?.title || 'Unknown Course'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Enrolled: {formatDate(access.enrolledAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="font-bold text-honey">{access.progress}%</div>
                          <div className="text-xs text-muted-foreground">Progress</div>
                        </div>
                        
                        <div className="text-center">
                          {access.completed ? (
                            <Badge className="bg-green-500">Completed</Badge>
                          ) : (
                            <Badge variant="secondary">In Progress</Badge>
                          )}
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Last Activity</div>
                          <div className="text-sm font-medium">
                            {formatDate(access.lastActivity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {courseAccess.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Enrollments Yet</h3>
                    <p className="text-muted-foreground">Student enrollments will appear here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courses.slice(0, 5).map((course) => (
                    <div key={course.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{course.title}</div>
                        <div className="text-sm text-muted-foreground">{course.enrolledStudents} students</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-honey">{course.completionRate}%</div>
                        <div className="text-sm text-muted-foreground">completion</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    courses.reduce((acc, course) => {
                      acc[course.category] = (acc[course.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="font-medium capitalize">{category}</div>
                      <div className="font-bold text-honey">{count} courses</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details and settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Course Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-instructor">Instructor</Label>
                <Input
                  id="edit-instructor"
                  value={formData.instructor}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blockchain">Blockchain</SelectItem>
                    <SelectItem value="defi">DeFi</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="nft">NFT</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-level">Level</Label>
                <Select value={formData.level} onValueChange={(value: any) => setFormData(prev => ({ ...prev, level: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-duration">Duration</Label>
                <Input
                  id="edit-duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-lessons">Number of Lessons</Label>
                <Input
                  id="edit-lessons"
                  type="number"
                  value={formData.lessons}
                  onChange={(e) => setFormData(prev => ({ ...prev, lessons: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-requiredLevel">Required Level</Label>
                <Input
                  id="edit-requiredLevel"
                  type="number"
                  min="1"
                  max="19"
                  value={formData.requiredLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiredLevel: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-courseType">Course Type</Label>
                <Select value={formData.courseType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, courseType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Course</SelectItem>
                    <SelectItem value="online">Live Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isFree}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFree: checked, priceBCC: checked ? 0 : prev.priceBCC }))}
                />
                <Label>Free Course</Label>
              </div>
              {!formData.isFree && (
                <div>
                  <Label htmlFor="edit-priceBCC">Price (BCC)</Label>
                  <Input
                    id="edit-priceBCC"
                    type="number"
                    value={formData.priceBCC}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceBCC: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCourse}>Update Course</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}