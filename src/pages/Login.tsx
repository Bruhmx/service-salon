import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/gb_logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginRole, setLoginRole] = useState<"customer" | "service_provider">("customer");
  const [loading, setLoading] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerRole, setRegisterRole] = useState<"customer" | "service_provider">("customer");
  
  // Service provider specific fields
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check user's role and redirect accordingly
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        const isServiceProvider = roles?.some((r) => r.role === "service_provider");

        toast.success("Welcome back!");
        
        if (isServiceProvider) {
          navigate("/provider/dashboard");
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please check your credentials and try again.");
      } else {
        toast.error(error.message || "Failed to login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build validation schema based on role
      const baseSchema = {
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        fullName: z.string().min(2, "Full name must be at least 2 characters"),
        phone: z.string().min(10, "Valid phone number is required"),
      };

      const serviceProviderSchema = registerRole === "service_provider" 
        ? {
            businessName: z.string().min(2, "Business name is required"),
            description: z.string().min(10, "Description must be at least 10 characters"),
            address: z.string().min(5, "Address is required"),
            zipCode: z.string().min(4, "Zip code is required"),
          }
        : {};

      const registerSchema = z.object({
        ...baseSchema,
        ...serviceProviderSchema,
      });

      const validationData: any = {
        email: registerEmail,
        password: registerPassword,
        fullName: registerFullName,
        phone: phone,
      };

      if (registerRole === "service_provider") {
        validationData.businessName = businessName;
        validationData.description = description;
        validationData.address = address;
        validationData.zipCode = zipCode;
      }

      const validated = registerSchema.parse(validationData);

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validated.fullName,
            role: registerRole,
            phone: validated.phone,
          },
        },
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("already registered") || error.message.includes("User already registered")) {
          toast.error("This email is already registered. Please try logging in instead.");
        } else {
          throw error;
        }
        return;
      }

      // If service provider, create the service provider profile via secure edge function
      if (registerRole === "service_provider" && data.user) {
        const { data: providerData, error: providerError } = await supabase.functions.invoke(
          'register-service-provider',
          {
            body: {
              businessName,
              description,
              address,
              zipCode,
              phone,
            },
          }
        );

        if (providerError || !providerData?.success) {
          console.error("Error creating provider profile:", providerError);
          
          toast.error(
            "Failed to create provider profile. Your account was created but the profile setup failed. Please contact support."
          );
          return;
        }
      }
      
      toast.success("Registration successful! You can now log in.");
      
      // Clear all form fields
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterFullName("");
      setBusinessName("");
      setDescription("");
      setAddress("");
      setZipCode("");
      setPhone("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.message?.includes("already registered") || error.message?.includes("User already registered")) {
        toast.error("This email is already registered. Please use the login tab or reset your password if you forgot it.");
      } else {
        toast.error(error.message || "Failed to register");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="GB Beauty" className="w-20 h-20" />
          </div>
          <CardTitle className="text-2xl text-center">Customer Login</CardTitle>
          <CardDescription className="text-center">
            Sign in to book beauty services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-role">Login As</Label>
                  <Select value={loginRole} onValueChange={(value: "customer" | "service_provider") => setLoginRole(value)}>
                    <SelectTrigger id="login-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="service_provider">Service Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading} variant="hero">
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-role">Register As</Label>
                  <Select value={registerRole} onValueChange={(value: "customer" | "service_provider") => setRegisterRole(value)}>
                    <SelectTrigger id="register-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="service_provider">Service Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-fullname">Full Name</Label>
                  <Input
                    id="register-fullname"
                    type="text"
                    placeholder="Your full name"
                    value={registerFullName}
                    onChange={(e) => setRegisterFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-phone">Phone Number</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="Contact number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    minLength={10}
                  />
                </div>
                
                {/* Service Provider Additional Fields */}
                {registerRole === "service_provider" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="business-name">Business Name</Label>
                      <Input
                        id="business-name"
                        type="text"
                        placeholder="Your business name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Street address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip-code">Zip Code</Label>
                      <Input
                        id="zip-code"
                        type="text"
                        placeholder="Postal code"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your services and expertise"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows={3}
                      />
                    </div>
                  </>
                )}
                
                <Button type="submit" className="w-full" disabled={loading} variant="hero">
                  {loading ? "Creating account..." : `Register as ${registerRole === "customer" ? "Customer" : "Service Provider"}`}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
