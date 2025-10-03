import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Users, Star, Search, Heart, TrendingUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import heroImage from '@/assets/hero-image.jpg';

const Home = () => {
  const features = [
    {
      icon: Shield,
      title: 'Trust Score System',
      description: 'Every member has a trust score based on reviews, verifications, and community engagement.',
    },
    {
      icon: Users,
      title: 'Local Community',
      description: 'Connect with trusted neighbors and local service providers in your area.',
    },
    {
      icon: Star,
      title: 'Verified Reviews',
      description: 'Read genuine reviews from real customers to make informed decisions.',
    },
    {
      icon: Search,
      title: 'Easy Discovery',
      description: 'Find the perfect service provider with smart search and filters.',
    },
    {
      icon: Heart,
      title: 'Safe Transactions',
      description: 'Book with confidence knowing all transactions are secure and protected.',
    },
    {
      icon: TrendingUp,
      title: 'Grow Together',
      description: 'Build your reputation and grow your service business in your community.',
    },
  ];

  const categories = [
    { name: 'Home Maintenance', count: '234 services', color: 'from-primary to-primary-light' },
    { name: 'Cleaning', count: '189 services', color: 'from-secondary to-secondary-light' },
    { name: 'Pet Care', count: '156 services', color: 'from-accent to-purple-400' },
    { name: 'Tutoring', count: '142 services', color: 'from-success to-emerald-400' },
    { name: 'Gardening', count: '98 services', color: 'from-warning to-yellow-400' },
    { name: 'Tech Support', count: '87 services', color: 'from-primary-light to-primary' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Build <span className="text-gradient">Trusted</span> Connections
              </h1>
              <p className="text-xl text-muted-foreground">
                Connect with verified local service providers and build meaningful relationships in your community. 
                Trust, transparency, and quality service guaranteed.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/signup">Get Started Free</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/services">Browse Services</Link>
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-primary">10K+</div>
                  <div className="text-sm text-muted-foreground">Trusted Members</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-secondary">5K+</div>
                  <div className="text-sm text-muted-foreground">Active Services</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">4.9</div>
                  <div className="text-sm text-muted-foreground">Average Rating</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl rounded-full" />
              <img
                src={heroImage}
                alt="Community collaboration"
                className="relative rounded-2xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose TrustCircle?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We've built a platform that prioritizes trust, safety, and community connections
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-smooth hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Popular Categories</h2>
            <p className="text-xl text-muted-foreground">
              Find the perfect service for your needs
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Link
                key={index}
                to="/services"
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-xl transition-smooth h-full">
                  <CardContent className="p-6">
                    <div className={`h-2 w-full bg-gradient-to-r ${category.color} rounded-full mb-4`} />
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-smooth">
                      {category.name}
                    </h3>
                    <p className="text-muted-foreground">{category.count}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="gradient" size="lg" asChild>
              <Link to="/services">View All Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 relative">
          <Card className="border-2 border-primary/20 shadow-2xl">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to Join TrustCircle?</h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start building trusted connections in your community today. It's free to join!
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/signup">Sign Up Now</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/about">Learn More</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;