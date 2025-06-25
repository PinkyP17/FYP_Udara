"use client";

import type React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wind,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useSignUp, useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type RegistrationStep = "form" | "verification" | "success";

export default function RegisterPage() {
  const [registrationStep, setRegistrationStep] =
    useState<RegistrationStep>("form");

  // Registration form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [regError, setRegError] = useState("");
  const [regIsLoading, setRegIsLoading] = useState(false);

  // Verification state
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);

  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, isLoaded, router]);

  useEffect(() => {
    const saveUserProfile = async () => {
      if (
        registrationStep === "success" &&
        user &&
        user.id &&
        phone &&
        location
      ) {
        try {
          const res = await fetch("http://localhost:4000/api/user-profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clerkUserId: user.id,
              phone,
              location,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Server error: ${errText}`);
          }

          console.log("✅ User profile saved in DB");
        } catch (err) {
          console.error(
            "❌ Failed to save user profile after verification:",
            err
          );
        }
      }
    };

    saveUserProfile();
  }, [registrationStep, user, phone, location]);

  // Password validation
  const isPasswordValid = (password: string) => {
    return password.length >= 8;
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: "" };
    if (password.length < 8)
      return { strength: 1, text: "Too short (minimum 8 characters)" };

    let score = 1;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;

    if (score <= 2) return { strength: 2, text: "Weak" };
    if (score <= 3) return { strength: 3, text: "Medium" };
    return { strength: 4, text: "Strong" };
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUp) return;

    setRegIsLoading(true);
    setRegError("");

    try {
      // Step 2: Validate user input
      if (!firstName.trim()) {
        setRegError("Please enter your first name.");
        setRegIsLoading(false);
        return;
      }

      if (!regEmail.trim()) {
        setRegError("Please enter your email address.");
        setRegIsLoading(false);
        return;
      }

      // Step 2.1: Password must contain 8 or more characters
      if (!isPasswordValid(regPassword)) {
        setRegError("Password must contain 8 or more characters.");
        setRegIsLoading(false);
        return;
      }

      // Step 3: User confirms their password
      if (regPassword !== regConfirmPassword) {
        setRegError("Passwords do not match.");
        setRegIsLoading(false);
        return;
      }

      if (!phone.trim()) {
        setRegError("Please enter your phone number.");
        setRegIsLoading(false);
        return;
      }

      if (!location.trim()) {
        setRegError("Please enter your location.");
        setRegIsLoading(false);
        return;
      }

      if (!/^(\+?60|0)1[0-9]{8,9}$/.test(phone)) {
        setRegError("Please enter a valid Malaysian phone number.");
        setRegIsLoading(false);
        return;
      }

      console.log("User submitted registration form:", {
        firstName,
        lastName,
        email: regEmail,
      });

      // Step 4: User clicks 'Continue' button (form submission)
      // Step 5: System requests code for user's email
      // Using the correct Clerk API parameters
      const result = await signUp.create({
        firstName,
        lastName,
        emailAddress: regEmail,
        password: regPassword,
      });

      if (result.status === "missing_requirements") {
        // Need email verification
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        console.log("Verification email sent to:", regEmail);
        setRegistrationStep("verification");
      } else if (result.status === "complete") {
        // Registration complete without verification
        await setActiveSignUp({ session: result.createdSessionId });
        setRegistrationStep("success");
      }
    } catch (err: any) {
      console.error("Registration error:", err);

      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.includes("email_address_taken")) {
          setRegError("An account with this email already exists.");
        } else if (errorMessage.includes("password_pwned")) {
          setRegError(
            "This password has been found in a data breach. Please choose a different password."
          );
        } else if (errorMessage.includes("password_too_short")) {
          setRegError("Password must be at least 8 characters long.");
        } else {
          setRegError(errorMessage);
        }
      } else {
        setRegError("Registration failed. Please try again.");
      }
    } finally {
      setRegIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUp) return;

    setVerificationLoading(true);
    setVerificationError("");

    try {
      // Step 6: User enters the given code
      console.log("User entered verification code:", verificationCode);

      // Step 7: System verifies the entered information and creates user account
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
        console.log("Registration successful!");
        // Step 8: System notifies user that registration is successful
        setRegistrationStep("success");
      } else {
        setVerificationError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);

      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.includes("incorrect_code")) {
          setVerificationError(
            "Incorrect verification code. Please try again."
          );
        } else if (errorMessage.includes("expired")) {
          setVerificationError(
            "Verification code has expired. Please request a new one."
          );
        } else {
          setVerificationError(errorMessage);
        }
      } else {
        setVerificationError("Verification failed. Please try again.");
      }
    } finally {
      setVerificationLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    if (!signUp) return;

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerificationError("");
      console.log("New verification code sent to:", regEmail);
    } catch (err: any) {
      console.error("Resend error:", err);
      setVerificationError("Failed to resend code. Please try again.");
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isSignedIn) {
    router.push("/dashboard");
    return null;
  }

  // Registration Success Page
  if (registrationStep === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to Udara!
            </h1>
            <p className="text-gray-600 mt-2">
              Your account has been created successfully
            </p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-green-700">
                Registration Successful!
              </CardTitle>
              <CardDescription className="text-center">
                You can now access your air quality monitoring dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    <strong>Account created for:</strong> {regEmail}
                  </p>
                </div>

                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Email Verification Page
  if (registrationStep === "verification") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Check Your Email
            </h1>
            <p className="text-gray-600 mt-2">
              We've sent a verification code to your email
            </p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">
                Enter Verification Code
              </CardTitle>
              <CardDescription className="text-center">
                Please enter the 6-digit code sent to{" "}
                <strong>{regEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    name="verification-code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    required
                    disabled={verificationLoading}
                    className="w-full text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                </div>

                {verificationError && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">
                      {verificationError}
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    verificationLoading || verificationCode.length !== 6
                  }
                >
                  {verificationLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify Email"
                  )}
                </Button>
              </form>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?
                </p>
                <Button
                  variant="ghost"
                  onClick={resendVerificationCode}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Resend Code
                </Button>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/")}
                  className="text-sm"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Registration Form Page (Default)
  const passwordStrength = getPasswordStrength(regPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Wind className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Udara</h1>
          <p className="text-gray-600 mt-2">Monitor air quality in real-time</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Create an account
            </CardTitle>
            <CardDescription className="text-center">
              Enter your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRegistration} className="space-y-4">
              {/* Step 2: User enters name, email, and password */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    name="first-name"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={regIsLoading}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    name="last-name"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={regIsLoading}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  name="reg-email"
                  type="email"
                  placeholder="Enter your email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  disabled={regIsLoading}
                  className="w-full"
                />
              </div>

              {/* Step 2.1: Password must contain 8 or more characters */}
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    name="reg-password"
                    type={showRegPassword ? "text" : "password"}
                    placeholder="Enter your password (min. 8 characters)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    disabled={regIsLoading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={regIsLoading}
                  >
                    {showRegPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {regPassword && (
                  <div className="space-y-1">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded ${
                            level <= passwordStrength.strength
                              ? level <= 2
                                ? "bg-red-500"
                                : level <= 3
                                ? "bg-yellow-500"
                                : "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">
                      {passwordStrength.text}
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: User confirms their password */}
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="reg-confirm-password"
                    name="reg-confirm-password"
                    type={showRegConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    disabled={regIsLoading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowRegConfirmPassword(!showRegConfirmPassword)
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={regIsLoading}
                  >
                    {showRegConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {regConfirmPassword && regPassword !== regConfirmPassword && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+60123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={regIsLoading}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g. Kuala Lumpur"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={regIsLoading}
                  className="w-full"
                />
              </div>

              {regError && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{regError}</span>
                </div>
              )}

              {/* Step 4: User clicks 'Continue' button */}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  regIsLoading ||
                  !firstName ||
                  !regEmail ||
                  !isPasswordValid(regPassword) ||
                  regPassword !== regConfirmPassword
                }
              >
                {regIsLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/"
                className="text-blue-600 hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-gray-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-gray-700">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
