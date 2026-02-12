import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  HelpCircle,
  Send,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Support() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /**
   * Handle support form submission
   * Sends email to support team via mailto link
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create mailto link with form data
      const mailtoLink = `mailto:infoliverton@gmail.com?subject=${encodeURIComponent(
        `Support Request: ${formData.subject}`
      )}&body=${encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
      )}`;

      // Open email client
      window.location.href = mailtoLink;

      // Show success message
      setSubmitted(true);
      toast.success('Opening your email client...');

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' });
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting support request:', error);
      toast.error('Failed to open email client');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle direct email link click
   * Opens email client with support email
   */
  const handleEmailClick = () => {
    window.location.href = 'mailto:infoliverton@gmail.com';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <span className="font-semibold">Support</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-8 max-w-4xl mx-auto">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold">How Can We Help?</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            We're here to support you. Get in touch with our support team for any questions or issues.
          </p>
        </section>

        {/* Contact Methods */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* Email Support */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Send us an email and we'll respond within 24 hours.
              </p>
              <Button
                onClick={handleEmailClick}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email: infoliverton@gmail.com
              </Button>
            </CardContent>
          </Card>

          {/* Response Time */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Email:</strong> Within 24 hours
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Urgent Issues:</strong> Within 2 hours
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Business Hours:</strong> Monday - Friday, 9 AM - 6 PM (UTC+3)
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Support Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Send us a Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
                <h3 className="text-xl font-semibold">Thank You!</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Your support request has been sent. We'll get back to you soon!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="What is this about?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Please describe your issue or question in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-semibold">How do I reset my password?</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Click on "Forgot Password" on the login page and follow the instructions sent to your email.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">How do I update my profile information?</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Go to your Profile page and click the "Edit" button to update your personal information, phone number, address, and profile picture.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">How do I enroll in a course?</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Navigate to the Courses section, find the course you're interested in, and click "Enroll" to get started.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">How do I contact a teacher?</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Use the Chat feature to send direct messages to teachers. You can access Chat from the main navigation menu.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">What payment methods do you accept?</h4>
              <p className="text-gray-600 dark:text-gray-400">
                We accept various payment methods including credit cards, mobile money, and other digital payment options. Check the Payments section for details.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">How do I report a problem?</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Use the support form above to report any issues. Our team will investigate and get back to you within 24 hours.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Support Info */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">Need Urgent Help?</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  For urgent issues, please email us at <strong>infoliverton@gmail.com</strong> with "URGENT" in the subject line.
                </p>
                <Button
                  onClick={handleEmailClick}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Urgent Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
