import { useState } from 'react';
import { useWallet } from '../../../hooks/useWallet';
import { useI18n } from '../../../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Progress } from '../../../components/ui/progress';
import { 
  Search, 
  Play, 
  Clock, 
  Users, 
  Star, 
  Award, 
  BookOpen, 
  Video, 
  Headphones,
  Calendar,
  TrendingUp,
  Filter,
  Globe
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorAvatar: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  lessons: number;
  students: number;
  rating: number;
  price: number;
  currency: 'BCC' | 'Free';
  thumbnail: string;
  featured: boolean;
  trending: boolean;
  type: 'video' | 'live' | 'interactive';
  tags: string[];
  progress?: number;
}

export default function Courses() {
  const { walletAddress, currentLevel, bccBalance } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  const categories = [
    { id: 'all', name: 'All Categories', icon: BookOpen },
    { id: 'blockchain', name: 'Blockchain Fundamentals', icon: Globe },
    { id: 'defi', name: 'DeFi & Trading', icon: TrendingUp },
    { id: 'development', name: 'Smart Contract Development', icon: Play },
    { id: 'nft', name: 'NFT Creation & Minting', icon: Award },
    { id: 'business', name: 'Web3 Business', icon: Users },
    { id: 'security', name: 'Security & Auditing', icon: Star }
  ];

  const courseTypes = [
    { id: 'all', name: 'All Types', icon: BookOpen },
    { id: 'video', name: 'Video Courses', icon: Video },
    { id: 'live', name: 'Live Sessions', icon: Calendar },
    { id: 'interactive', name: 'Interactive Labs', icon: Play }
  ];

  const featuredCourses: Course[] = [
    {
      id: 'blockchain-mastery',
      title: 'Complete Blockchain Mastery Course',
      description: 'Master blockchain technology from basics to advanced concepts. Learn Bitcoin, Ethereum, smart contracts, and build real-world DApps.',
      instructor: 'Dr. Sarah Chen',
      instructorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=400',
      category: 'blockchain',
      level: 'Beginner',
      duration: '32 hours',
      lessons: 45,
      students: 12847,
      rating: 4.9,
      price: 2500,
      currency: 'BCC',
      thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
      featured: true,
      trending: true,
      type: 'video',
      tags: ['Blockchain', 'Bitcoin', 'Ethereum', 'Smart Contracts'],
      progress: 0
    },
    {
      id: 'defi-protocols',
      title: 'DeFi Protocols & Yield Farming Strategies',
      description: 'Deep dive into DeFi protocols, liquidity mining, yield farming, and advanced trading strategies in decentralized finance.',
      instructor: 'Marcus Rodriguez',
      instructorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      category: 'defi',
      level: 'Intermediate',
      duration: '28 hours',
      lessons: 35,
      students: 8432,
      rating: 4.8,
      price: 3200,
      currency: 'BCC',
      thumbnail: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800',
      featured: true,
      trending: false,
      type: 'video',
      tags: ['DeFi', 'Yield Farming', 'Liquidity', 'Trading'],
      progress: 0
    },
    {
      id: 'smart-contract-dev',
      title: 'Smart Contract Development with Solidity',
      description: 'Learn to build, test, and deploy smart contracts on Ethereum. Hands-on development with real projects.',
      instructor: 'Alex Thompson',
      instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      category: 'development',
      level: 'Advanced',
      duration: '40 hours',
      lessons: 52,
      students: 6821,
      rating: 4.9,
      price: 4500,
      currency: 'BCC',
      thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
      featured: true,
      trending: true,
      type: 'interactive',
      tags: ['Solidity', 'Smart Contracts', 'Ethereum', 'Development'],
      progress: 0
    },
    {
      id: 'nft-creation',
      title: 'NFT Creation & Marketplace Mastery',
      description: 'Complete guide to creating, marketing, and selling NFTs. Build your own NFT collection and marketplace.',
      instructor: 'Emma Wilson',
      instructorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      category: 'nft',
      level: 'Beginner',
      duration: '24 hours',
      lessons: 30,
      students: 15632,
      rating: 4.7,
      price: 0,
      currency: 'Free',
      thumbnail: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800',
      featured: true,
      trending: true,
      type: 'video',
      tags: ['NFT', 'Digital Art', 'Marketplace', 'OpenSea'],
      progress: 0
    },
    {
      id: 'web3-business',
      title: 'Web3 Business Strategy & Tokenomics',
      description: 'Learn to build sustainable Web3 businesses, design tokenomics, and create successful crypto projects.',
      instructor: 'James Park',
      instructorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      category: 'business',
      level: 'Intermediate',
      duration: '36 hours',
      lessons: 42,
      students: 9876,
      rating: 4.8,
      price: 3800,
      currency: 'BCC',
      thumbnail: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
      featured: false,
      trending: true,
      type: 'live',
      tags: ['Business', 'Tokenomics', 'Strategy', 'Entrepreneurship'],
      progress: 0
    },
    {
      id: 'security-auditing',
      title: 'Smart Contract Security & Auditing',
      description: 'Comprehensive course on smart contract security, common vulnerabilities, and professional auditing techniques.',
      instructor: 'Dr. Michael Liu',
      instructorAvatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=400',
      category: 'security',
      level: 'Advanced',
      duration: '44 hours',
      lessons: 58,
      students: 4521,
      rating: 4.9,
      price: 5500,
      currency: 'BCC',
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800',
      featured: false,
      trending: false,
      type: 'interactive',
      tags: ['Security', 'Auditing', 'Vulnerabilities', 'Testing'],
      progress: 0
    }
  ];

  const filteredCourses = featuredCourses.filter(course => {
    const matchesSearch = searchQuery === '' || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || course.level.toLowerCase() === selectedLevel;
    const matchesType = selectedType === 'all' || course.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesLevel && matchesType;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.students - a.students;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return b.id.localeCompare(a.id);
      case 'price-low':
        return (a.currency === 'Free' ? 0 : a.price) - (b.currency === 'Free' ? 0 : b.price);
      case 'price-high':
        return (b.currency === 'Free' ? 0 : b.price) - (a.currency === 'Free' ? 0 : a.price);
      default:
        return 0;
    }
  });

  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'live':
        return <Calendar className="w-4 h-4" />;
      case 'interactive':
        return <Play className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Intermediate':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Advanced':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'Free') return 'Free';
    return `${price.toLocaleString()} ${currency}`;
  };

  const canAffordCourse = (course: Course) => {
    if (course.currency === 'Free') return true;
    return (bccBalance?.transferable || 0) >= course.price;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-honey">
          Web3 Learning Academy
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Master blockchain technology, DeFi protocols, and smart contract development with industry-leading courses from top instructors.
        </p>
        
        {/* Featured Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">150+</div>
              <div className="text-sm text-muted-foreground">Courses</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">85K+</div>
              <div className="text-sm text-muted-foreground">Students</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">12K+</div>
              <div className="text-sm text-muted-foreground">Certificates</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">4.8</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-secondary/50 border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-honey" />
            Find Your Perfect Course
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search courses, instructors, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-honey/20"
              data-testid="input-search-courses"
            />
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-background/50 border-honey/20">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="bg-background/50 border-honey/20">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-background/50 border-honey/20">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {courseTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background/50 border-honey/20">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedLevel('all');
                setSelectedType('all');
                setSortBy('popular');
              }}
              className="border-honey/20 hover:bg-honey/10"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Featured Courses Section */}
      {filteredCourses.some(course => course.featured) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-honey">Featured Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.filter(course => course.featured).map(course => (
              <Card 
                key={course.id} 
                className="group bg-secondary border-honey/20 hover:border-honey/40 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/education/${course.id}`)}
              >
                {/* Course Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {course.featured && (
                      <Badge className="bg-honey text-black">Featured</Badge>
                    )}
                    {course.trending && (
                      <Badge className="bg-red-500">🔥 Trending</Badge>
                    )}
                  </div>
                  
                  {/* Course Type Icon */}
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 bg-background/80 rounded-full flex items-center justify-center">
                      {getCourseTypeIcon(course.type)}
                    </div>
                  </div>
                  
                  {/* Duration */}
                  <div className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 rounded text-white text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.duration}
                  </div>
                </div>
                
                <CardContent className="p-4 space-y-3">
                  {/* Title and Level */}
                  <div>
                    <h3 className="font-bold text-honey group-hover:text-honey/80 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <Badge variant="outline" className={`mt-2 ${getLevelColor(course.level)}`}>
                      {course.level}
                    </Badge>
                  </div>
                  
                  {/* Instructor */}
                  <div className="flex items-center gap-2">
                    <img 
                      src={course.instructorAvatar} 
                      alt={course.instructor}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-muted-foreground">{course.instructor}</span>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.students.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {course.rating}
                      </div>
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-honey">
                      {formatPrice(course.price, course.currency)}
                    </div>
                    <Button 
                      size="sm" 
                      className={`${
                        canAffordCourse(course) 
                          ? 'bg-honey text-black hover:bg-honey/90' 
                          : 'bg-gray-500 text-white cursor-not-allowed'
                      }`}
                      disabled={!canAffordCourse(course)}
                    >
                      {course.currency === 'Free' ? 'Start Free' : 'Enroll Now'}
                    </Button>
                  </div>
                  
                  {/* Progress if enrolled */}
                  {course.progress !== undefined && course.progress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-honey font-medium">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Courses Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-honey">
            All Courses ({filteredCourses.length})
          </h2>
          <Button variant="outline" className="border-honey/20 hover:bg-honey/10">
            View Learning Path
          </Button>
        </div>
        
        {filteredCourses.length === 0 ? (
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No courses found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search terms to find more courses.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map(course => (
              <Card 
                key={course.id} 
                className="group bg-secondary border-honey/20 hover:border-honey/40 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/education/${course.id}`)}
              >
                {/* Course Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {course.featured && (
                      <Badge className="bg-honey text-black">Featured</Badge>
                    )}
                    {course.trending && (
                      <Badge className="bg-red-500">🔥 Trending</Badge>
                    )}
                  </div>
                  
                  {/* Course Type Icon */}
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 bg-background/80 rounded-full flex items-center justify-center">
                      {getCourseTypeIcon(course.type)}
                    </div>
                  </div>
                  
                  {/* Duration */}
                  <div className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 rounded text-white text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.duration}
                  </div>
                </div>
                
                <CardContent className="p-4 space-y-3">
                  {/* Title and Level */}
                  <div>
                    <h3 className="font-bold text-honey group-hover:text-honey/80 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <Badge variant="outline" className={`mt-2 ${getLevelColor(course.level)}`}>
                      {course.level}
                    </Badge>
                  </div>
                  
                  {/* Instructor */}
                  <div className="flex items-center gap-2">
                    <img 
                      src={course.instructorAvatar} 
                      alt={course.instructor}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-muted-foreground">{course.instructor}</span>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.students.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {course.rating}
                      </div>
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-honey">
                      {formatPrice(course.price, course.currency)}
                    </div>
                    <Button 
                      size="sm" 
                      className={`${
                        canAffordCourse(course) 
                          ? 'bg-honey text-black hover:bg-honey/90' 
                          : 'bg-gray-500 text-white cursor-not-allowed'
                      }`}
                      disabled={!canAffordCourse(course)}
                    >
                      {course.currency === 'Free' ? 'Start Free' : 'Enroll Now'}
                    </Button>
                  </div>
                  
                  {/* Progress if enrolled */}
                  {course.progress !== undefined && course.progress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-honey font-medium">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}