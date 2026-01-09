'use client';

import type React from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wind, Eye, EyeOff, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSignUp, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type RegistrationStep = 'form' | 'verification' | 'success';

export default function RegisterPage() {
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>('form');

  // Registration form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [regError, setRegError] = useState('');
  const [regIsLoading, setRegIsLoading] = useState(false);

  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  const { isSignedIn, isLoaded } = useAuth();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, isLoaded, router]);

  // Password validation
  const isPasswordValid = (password: string) => {
    return password.length >= 8;
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 8) return { strength: 1, text: 'Too short (minimum 8 characters)' };

    let score = 1;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;

    if (score <= 2) return { strength: 2, text: 'Weak' };
    if (score <= 3) return { strength: 3, text: 'Medium' };
    return { strength: 4, text: 'Strong' };
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUp) return;

    setRegIsLoading(true);
    setRegError('');

    try {
      // Validation
      if (!firstName.trim()) {
        setRegError('Please enter your first name.');
        setRegIsLoading(false);
        return;
      }

      if (!regEmail.trim()) {
        setRegError('Please enter your email address.');
        setRegIsLoading(false);
        return;
      }

      if (!isPasswordValid(regPassword)) {
        setRegError('Password must contain 8 or more characters.');
        setRegIsLoading(false);
        return;
      }

      if (regPassword !== regConfirmPassword) {
        setRegError('Passwords do not match.');
        setRegIsLoading(false);
        return;
      }

      if (!phone.trim()) {
        setRegError('Please enter your phone number.');
        setRegIsLoading(false);
        return;
      }

      if (!location.trim()) {
        setRegError('Please enter your location.');
        setRegIsLoading(false);
        return;
      }

      if (!/^(\+?60|0)1[0-9]{8,9}$/.test(phone)) {
        setRegError('Please enter a valid Malaysian phone number.');
        setRegIsLoading(false);
        return;
      }

      console.log('User submitted registration form:', {
        firstName,
        lastName,
        email: regEmail,
      });

      // Create user in Clerk
      const result = await signUp.create({
        firstName,
        lastName,
        emailAddress: regEmail,
        password: regPassword,
      });

      if (result.status === 'missing_requirements') {
        // Need email verification
        await signUp.prepareEmailAddressVerification({
          strategy: 'email_code',
        });
        console.log('Verification email sent to:', regEmail);
        setRegistrationStep('verification');
      } else if (result.status === 'complete') {
        // Registration complete without verification
        await setActiveSignUp({ session: result.createdSessionId });
        setRegistrationStep('success');
      }
    } catch (err: any) {
      console.error('Registration error:', err);

      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.includes('email_address_taken')) {
          setRegError('An account with this email already exists.');
        } else if (errorMessage.includes('password_pwned')) {
          setRegError(
            'This password has been found in a data breach. Please choose a different password.'
          );
        } else if (errorMessage.includes('password_too_short')) {
          setRegError('Password must be at least 8 characters long.');
        } else {
          setRegError(errorMessage);
        }
      } else {
        setRegError('Registration failed. Please try again.');
      }
    } finally {
      setRegIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUp) return;

    setVerificationLoading(true);
    setVerificationError('');

    try {
      console.log('User entered verification code:', verificationCode);

      // Verify email with Clerk
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === 'complete') {
        // ✅ CRITICAL: Create user in MongoDB BEFORE activating session
        try {
          const clerkUserId = result.createdUserId;
          const fullName = `${firstName} ${lastName}`.trim();

          console.log('Creating user in MongoDB...', {
            clerkUserId,
            email: regEmail,
            name: fullName,
          });

          const mongoResponse = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clerkUserId: clerkUserId,
              email: regEmail,
              name: fullName,
              phone: phone,
              location: location,
            }),
          });

          if (!mongoResponse.ok) {
            const errorText = await mongoResponse.text();
            console.error('MongoDB user creation failed:', errorText);
            throw new Error(`Failed to create user in database: ${errorText}`);
          }

          const mongoData = await mongoResponse.json();
          console.log('✅ User created in MongoDB:', mongoData);

          // Now activate the Clerk session
          await setActiveSignUp({ session: result.createdSessionId });
          console.log('Registration successful!');
          setRegistrationStep('success');
        } catch (dbError: any) {
          console.error('Database error:', dbError);
          setVerificationError(
            'Account created but failed to save profile. Please contact support.'
          );
          // Don't activate session if MongoDB failed
          return;
        }
      } else {
        setVerificationError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);

      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.includes('incorrect_code')) {
          setVerificationError('Incorrect verification code. Please try again.');
        } else if (errorMessage.includes('expired')) {
          setVerificationError('Verification code has expired. Please request a new one.');
        } else {
          setVerificationError(errorMessage);
        }
      } else {
        setVerificationError('Verification failed. Please try again.');
      }
    } finally {
      setVerificationLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    if (!signUp) return;

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerificationError('');
      console.log('New verification code sent to:', regEmail);
    } catch (err: any) {
      console.error('Resend error:', err);
      setVerificationError('Failed to resend code. Please try again.');
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
    router.push('/dashboard');
    return null;
  }

  // Registration Success Page
  if (registrationStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Udara!</h1>
            <p className="text-gray-600 mt-2">Your account has been created successfully</p>
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
                  onClick={() => router.push('/dashboard')}
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
  if (registrationStep === 'verification') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Check Your Email</h1>
            <p className="text-gray-600 mt-2">We've sent a verification code to your email</p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Enter Verification Code</CardTitle>
              <CardDescription className="text-center">
                Please enter the 6-digit code sent to <strong>{regEmail}</strong>
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
                      setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
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
                    <span className="text-sm text-red-700">{verificationError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={verificationLoading || verificationCode.length !== 6}
                >
                  {verificationLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Verify Email'
                  )}
                </Button>
              </form>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Didn't receive the code?</p>
                <Button
                  variant="ghost"
                  onClick={resendVerificationCode}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Resend Code
                </Button>
              </div>

              <div className="text-center">
                <Button variant="ghost" onClick={() => router.push('/')} className="text-sm">
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
            <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
            <CardDescription className="text-center">
              Enter your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegistration} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={regIsLoading}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={regIsLoading}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regEmail">Email</Label>
                <Input
                  id="regEmail"
                  name="regEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  disabled={regIsLoading}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="regPassword"
                    name="regPassword"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Create a password"
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
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength.strength === 4
                            ? 'bg-green-500 w-full'
                            : passwordStrength.strength === 3
                              ? 'bg-yellow-500 w-3/4'
                              : passwordStrength.strength === 2
                                ? 'bg-orange-500 w-1/2'
                                : 'bg-red-500 w-1/4'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{passwordStrength.text}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="regConfirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="regConfirmPassword"
                    name="regConfirmPassword"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    disabled={regIsLoading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
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
                  required
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
                  required
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

              <Button
                type="submit"
                className="w-full"
                disabled={
                  regIsLoading ||
                  !firstName ||
                  !regEmail ||
                  !isPasswordValid(regPassword) ||
                  regPassword !== regConfirmPassword ||
                  !phone ||
                  !location
                }
              >
                {regIsLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>

            <div className="text-center mt-4 text-sm">
              Already have an account?{' '}
              <Link href="/" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
