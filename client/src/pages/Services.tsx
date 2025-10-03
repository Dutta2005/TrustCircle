import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Star, DollarSign } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  pricing: {
    type: string;
    amount: number;
    currency: string;
  };
  provider: {
    firstName: string;
    lastName: string;
    avatar?: string;
    trustScore: number;
  };
  reviews: {
    total: number;
    average: number;
  };
  address: {
    city: string;
    state: string;
  };
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  useEffect(() => {
    fetchServices();
  }, [category, sortBy]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (category !== 'all') params.append('category', category);
      params.append('sortBy', sortBy);
      params.append('sortOrder', 'desc');
      
      const response = await api.get(`/services?${params}`);
      setServices(response.data.data.services);
    } catch (error: any) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchServices();
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/services/search?q=${searchQuery}`);
      setServices(response.data.data.services);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const getTrustScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'trust';
    if (score >= 60) return 'success';
    if (score >= 40) return 'warning';
    return 'default';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1">
        {/* Header */}
        <section className="gradient-hero py-16 text-primary-foreground">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-bold mb-4">Browse Services</h1>
            <p className="text-xl opacity-90 mb-8">
              Find trusted local service providers in your area
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-3xl">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search for services..."
                    className="pl-10 h-14 bg-background text-foreground"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" variant="secondary" className="h-14 px-8">
                  Search
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-4 items-center">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="home_maintenance">Home Maintenance</SelectItem>
                  <SelectItem value="pet_care">Pet Care</SelectItem>
                  <SelectItem value="tutoring">Tutoring</SelectItem>
                  <SelectItem value="gardening">Gardening</SelectItem>
                  <SelectItem value="tech_support">Tech Support</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest First</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price">Price: Low to High</SelectItem>
                  <SelectItem value="views">Most Popular</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto text-sm text-muted-foreground">
                {services.length} services found
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-48 w-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">No services found</p>
                <Button variant="gradient" className="mt-4" onClick={fetchServices}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Link key={service.id} to={`/services/${service.id}`}>
                    <Card className="h-full hover:shadow-xl transition-smooth hover:border-primary/50">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="secondary" className="text-xs">
                            {service.category.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-warning text-warning" />
                            <span className="text-sm font-semibold">
                              {service.reviews.average.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({service.reviews.total})
                            </span>
                          </div>
                        </div>

                        <h3 className="text-xl font-semibold mb-2 line-clamp-2">
                          {service.title}
                        </h3>

                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {service.description}
                        </p>

                        <div className="flex items-center gap-2 mb-4">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {service.address.city}, {service.address.state}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {service.provider.firstName?.[0]}{service.provider.lastName?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {service.provider.firstName} {service.provider.lastName}
                              </p>
                              <Badge
                                variant={getTrustScoreBadgeVariant(service.provider.trustScore)}
                                className="text-xs"
                              >
                                Trust: {service.provider.trustScore}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                              <DollarSign className="w-5 h-5" />
                              {service.pricing.amount}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              per {service.pricing.type}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default Services;