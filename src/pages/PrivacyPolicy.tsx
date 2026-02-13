import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300 pl-16 md:pl-0">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="font-semibold">Privacy Policy</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-8 max-w-4xl mx-auto py-12">
        {/* Title */}
        <section className="space-y-4">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: February 12, 2026
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            At Liverton Learning, we are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
          </p>
        </section>

        {/* Content Sections */}
        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Personal Information</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Full name and email address</li>
                <li>Phone number and physical address</li>
                <li>Profile picture and biographical information</li>
                <li>Educational background and qualifications</li>
                <li>Payment information (processed securely)</li>
                <li>Communication preferences</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Automatically Collected Information</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                When you use our platform, we automatically collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Device information (type, operating system, browser)</li>
                <li>IP address and location data</li>
                <li>Usage data (pages visited, time spent, interactions)</li>
                <li>Course progress and learning analytics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              We use the information we collect for various purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>To provide, maintain, and improve our services</li>
              <li>To process transactions and send related information</li>
              <li>To send promotional communications (with your consent)</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To monitor and analyze usage patterns and trends</li>
              <li>To personalize your learning experience</li>
              <li>To detect and prevent fraudulent activities</li>
              <li>To comply with legal obligations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Information Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              We do not sell, trade, or rent your personal information to third parties. However, we may share information in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li><strong>Service Providers:</strong> With vendors who assist us in operating our platform</li>
              <li><strong>Teachers and Schools:</strong> With educational institutions for course delivery</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              We implement comprehensive security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>SSL/TLS encryption for data in transit</li>
              <li>Secure password hashing and storage</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure payment processing through trusted providers</li>
              <li>Compliance with industry security standards</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              While we strive to protect your information, no security system is impenetrable. We cannot guarantee absolute security of your data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Data Portability:</strong> Request your data in a portable format</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              To exercise these rights, please contact us at <strong>infoliverton@gmail.com</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              We use cookies and similar technologies to enhance your experience:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li><strong>Essential Cookies:</strong> Required for platform functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand user behavior</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Marketing Cookies:</strong> Used for targeted advertising (with consent)</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              You can control cookie settings through your browser preferences. Disabling cookies may affect platform functionality.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Liverton Learning is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete such information promptly.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              For users between 13-18 years old, we provide additional privacy protections and parental consent mechanisms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Third-Party Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Our platform may contain links to third-party websites and services. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. You can request deletion of your account at any time by contacting us at <strong>infoliverton@gmail.com</strong>.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Some information may be retained for legal, accounting, or legitimate business purposes even after account deletion.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Your information may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have data protection laws that differ from your home country. By using Liverton Learning, you consent to the transfer of your information to countries outside your country of residence.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by posting the updated policy on our platform and updating the "Last updated" date.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Your continued use of Liverton Learning after changes become effective constitutes your acceptance of the updated Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p><strong>Email:</strong> infoliverton@gmail.com</p>
              <p><strong>Company:</strong> Liverton Learning</p>
              <p><strong>Response Time:</strong> We will respond to your inquiry within 24 hours</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This Privacy Policy is designed to comply with international data protection regulations including GDPR, CCPA, and other applicable privacy laws. We are committed to maintaining the highest standards of data protection and user privacy.
          </p>
        </div>
      </main>
    </div>
  );
}
