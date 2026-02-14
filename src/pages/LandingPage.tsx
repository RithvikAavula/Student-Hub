/**
 * Landing Page Component
 * 
 * A beautiful, animated landing page for Student Hub
 * Features: Hero section, features, testimonials, CTA
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme/ThemeProvider';
import { AnimatedButton } from '@/components/ui/animated-button';
import { MorphingBlob, CountUp } from '@/components/motion';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  BarChart3, 
  MessageCircle, 
  Shield, 
  Zap,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  Globe,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// ANIMATION VARIANTS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] as const }
  })
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] as const }
  })
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }
  }
};

// ============================================
// NAVBAR
// ============================================

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled 
          ? 'bg-background/80 backdrop-blur-xl border-b shadow-sm' 
          : 'bg-transparent'
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div
            className="relative w-14 h-14 flex items-center justify-center"
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <img 
              src="https://res.cloudinary.com/dfnpgl0bb/image/upload/v1771046687/ChatGPT_Image_Feb_14_2026_10_54_24_AM_k20wkr.png" 
              alt="Student Hub Logo" 
              className="w-full h-full object-contain"
            />
          </motion.div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Student Hub
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login">
            <AnimatedButton variant="ghost" size="sm">
              Sign In
            </AnimatedButton>
          </Link>
          <Link to="/register">
            <AnimatedButton variant="gradient" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              Get Started
            </AnimatedButton>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

// ============================================
// HERO SECTION
// ============================================

const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const floatingIcons = [
    { Icon: BookOpen, color: 'text-blue-500', delay: 0, x: -120, y: -80 },
    { Icon: Award, color: 'text-yellow-500', delay: 0.2, x: 130, y: -60 },
    { Icon: TrendingUp, color: 'text-green-500', delay: 0.4, x: -100, y: 100 },
    { Icon: MessageCircle, color: 'text-purple-500', delay: 0.6, x: 120, y: 80 },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <MorphingBlob 
          className="absolute top-20 -left-40 w-[600px] h-[600px] opacity-40" 
          color="hsl(var(--primary)/0.15)"
        />
        <MorphingBlob 
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] opacity-30" 
          color="hsl(var(--warning)/0.1)"
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <motion.div 
        className="container mx-auto px-6 relative z-10"
        style={shouldReduceMotion ? {} : { y, opacity }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            variants={fadeInScale}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Trusted by 10,000+ students worldwide
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold leading-tight mb-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
          >
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Empower Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Academic Journey
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
          >
            A comprehensive platform connecting students, faculty, and administrators. 
            Track activities, manage records, and collaborate seamlessly.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
          >
            <Link to="/register">
              <AnimatedButton 
                variant="gradient" 
                size="lg" 
                rightIcon={<ArrowRight className="w-5 h-5" />}
                glow
              >
                Start Free Today
              </AnimatedButton>
            </Link>
            <Link to="/login">
              <AnimatedButton variant="outline" size="lg">
                Sign In to Dashboard
              </AnimatedButton>
            </Link>
          </motion.div>

          {/* Floating icons around hero */}
          <div className="relative">
            {floatingIcons.map(({ Icon, color, delay, x, y }, idx) => (
              <motion.div
                key={idx}
                className={cn(
                  'absolute left-1/2 top-1/2 w-12 h-12 rounded-xl bg-card shadow-lg border flex items-center justify-center',
                  color
                )}
                style={{ x, y }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: shouldReduceMotion ? y : [y - 10, y + 10, y - 10]
                }}
                transition={{
                  opacity: { delay, duration: 0.5 },
                  scale: { delay, duration: 0.5, type: 'spring' },
                  y: { delay: delay + 0.5, duration: 4, repeat: Infinity, ease: 'easeInOut' }
                }}
              >
                <Icon className="w-6 h-6" />
              </motion.div>
            ))}
          </div>

          {/* Dashboard preview */}
          <motion.div
            className="relative mt-8"
            variants={fadeInScale}
            initial="hidden"
            animate="visible"
            custom={0.5}
          >
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-info/20 to-success/20 rounded-2xl blur-2xl" />
              <div className="relative bg-card rounded-xl shadow-2xl border overflow-hidden">
                <div className="h-8 bg-muted/50 flex items-center gap-2 px-4 border-b">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="p-6 bg-gradient-to-br from-background to-muted/20">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                      { label: 'Records', value: 156, color: 'from-primary to-primary/60' },
                      { label: 'Approved', value: 142, color: 'from-success to-success/60' },
                      { label: 'Points', value: 2840, color: 'from-info to-info/60' },
                    ].map((stat, idx) => (
                      <motion.div
                        key={idx}
                        className="bg-card rounded-lg p-4 border shadow-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + idx * 0.1 }}
                      >
                        <div className={cn('text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent', stat.color)}>
                          <CountUp end={stat.value} duration={2000} />
                        </div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 h-24 rounded-lg bg-muted/50 animate-pulse" />
                    <div className="w-32 h-24 rounded-lg bg-muted/50 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div
            className="w-1.5 h-3 rounded-full bg-muted-foreground/50"
            animate={{ opacity: [1, 0, 1], y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

// ============================================
// FEATURES SECTION
// ============================================

const features = [
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track progress with beautiful charts and insights. Monitor performance across all activities.',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: MessageCircle,
    title: 'Instant Messaging',
    description: 'Connect with faculty and peers instantly. WhatsApp-like interface for seamless communication.',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Enterprise-grade security with role-based access. Your data is always protected.',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built for speed with real-time updates. No more waiting for page refreshes.',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: Users,
    title: 'Collaborative',
    description: 'Students, faculty, and admins working together. Streamlined approval workflows.',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: Globe,
    title: 'Access Anywhere',
    description: 'Fully responsive design works on any device. Manage records on the go.',
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-500/10',
  },
];

const FeaturesSection = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <motion.span 
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            Features
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful tools designed for modern education. Simplify record management, 
            enhance collaboration, and gain valuable insights.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={staggerItem}
              className="group relative"
            >
              <div className="relative h-full p-6 rounded-2xl bg-card border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
                {/* Hover gradient */}
                <div className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  feature.bgColor
                )} />
                
                <div className="relative z-10">
                  <motion.div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                      'bg-gradient-to-br shadow-lg',
                      feature.color
                    )}
                    whileHover={shouldReduceMotion ? {} : { scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// STATS SECTION
// ============================================

const StatsSection = () => {
  // Static stats - update these values manually as needed
  const stats = [
    { value: 7, suffix: '+', label: 'Active Students' },
    { value: 5, suffix: '+', label: 'Faculty Members' },
    { value: 12, suffix: '+', label: 'Records Managed' },
    { value: 1, suffix: '', label: 'Departments' },
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-primary via-accent to-primary relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 border border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-60 h-60 border border-white/30 rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              variants={staggerItem}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                <CountUp end={stat.value} duration={2000} />
                {stat.suffix}
              </div>
              <div className="text-white/80 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// TESTIMONIALS SECTION
// ============================================

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Computer Science Student',
    avatar: 'SJ',
    content: 'Student Hub has completely transformed how I track my academic activities. The analytics feature helps me understand my progress at a glance.',
    rating: 5,
  },
  {
    name: 'Dr. Michael Chen',
    role: 'Faculty Advisor',
    avatar: 'MC',
    content: 'Managing student records has never been easier. The approval workflow saves me hours every week. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Department Admin',
    avatar: 'ER',
    content: 'The dashboard gives us complete visibility into departmental activities. Reports that used to take days now take minutes.',
    rating: 5,
  },
];

const TestimonialsSection = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Loved by educators & students
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See what our community has to say about their experience with Student Hub.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              variants={staggerItem}
              className="relative group"
            >
              <motion.div
                className="h-full p-6 rounded-2xl bg-card border shadow-sm"
                whileHover={shouldReduceMotion ? {} : { y: -5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// CTA SECTION
// ============================================

const CTASection = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <MorphingBlob 
          className="absolute top-0 left-1/4 w-[500px] h-[500px] opacity-30" 
          color="hsl(var(--primary)/0.2)"
        />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-info/20 to-success/20 rounded-3xl blur-2xl" />
          
          <div className="relative bg-card rounded-2xl border shadow-xl p-8 md:p-12">
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
              animate={shouldReduceMotion ? {} : { 
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <img 
                src="https://res.cloudinary.com/dfnpgl0bb/image/upload/v1771046687/ChatGPT_Image_Feb_14_2026_10_54_24_AM_k20wkr.png" 
                alt="Student Hub Logo" 
                className="w-full h-full object-contain"
              />
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to transform your{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                academic experience?
              </span>
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of students and educators who are already using Student Hub 
              to streamline their academic activities.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <AnimatedButton 
                  variant="gradient" 
                  size="lg" 
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  glow
                >
                  Create Free Account
                </AnimatedButton>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// FOOTER
// ============================================

const Footer = () => {
  return (
    <footer className="py-12 border-t bg-muted/20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src="https://res.cloudinary.com/dfnpgl0bb/image/upload/v1771046687/ChatGPT_Image_Feb_14_2026_10_54_24_AM_k20wkr.png" 
                alt="Student Hub Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Student Hub</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>

          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Student Hub. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

// ============================================
// MAIN LANDING PAGE
// ============================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
