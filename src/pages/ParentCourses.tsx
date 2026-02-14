/**
 * Parent Courses Page
 * Browse and purchase courses for children
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, ShoppingCart, Star } from 'lucide-react';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  instructor: string;
  rating: number;
  students: number;
  level: string;
}

export default function ParentCourses() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<string[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      // Mock courses data
      const mockCourses: Course[] = [
        {
          id: '1',
          title: 'Advanced Mathematics',
          description: 'Master advanced math concepts for high school',
          price: 49.99,
          instructor: 'Prof. John Smith',
          rating: 4.8,
          students: 1250,
          level: 'Advanced',
        },
        {
          id: '2',
          title: 'English Literature',
          description: 'Comprehensive English literature course',
          price: 39.99,
          instructor: 'Dr. Sarah Johnson',
          rating: 4.7,
          students: 980,
          level: 'Intermediate',
        },
        {
          id: '3',
          title: 'Science Fundamentals',
          description: 'Complete science course covering physics, chemistry, and biology',
          price: 59.99,
          instructor: 'Prof. Michael Brown',
          rating: 4.9,
          students: 1500,
          level: 'Beginner',
        },
        {
          id: '4',
          title: 'History & Culture',
          description: 'Explore world history and cultural studies',
          price: 34.99,
          instructor: 'Dr. Emily Davis',
          rating: 4.6,
          students: 750,
          level: 'Intermediate',
        },
      ];
      setCourses(mockCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (courseId: string) => {
    if (!cart.includes(courseId)) {
      setCart([...cart, courseId]);
      toast.success('Course added to cart');
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    toast.success('Proceeding to checkout...');
    // Implement checkout logic
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ParentSideNavbar />
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Available Courses</h1>
            {cart.length > 0 && (
              <Button onClick={handleCheckout} className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Checkout ({cart.length})
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span className="flex-1">{course.title}</span>
                      <span className="text-lg font-bold text-blue-600">${course.price}</span>
                    </CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Instructor</span>
                      <span className="font-medium">{course.instructor}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Level</span>
                      <span className="font-medium">{course.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(course.rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({course.students} students)</span>
                    </div>
                    <Button
                      onClick={() => handleAddToCart(course.id)}
                      disabled={cart.includes(course.id)}
                      className="w-full"
                    >
                      {cart.includes(course.id) ? 'In Cart' : 'Add to Cart'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
