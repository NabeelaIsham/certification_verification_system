import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../services/auth";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { AuthLayout, FormField } from "../components/shared/PublicExperience";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [challengeToken, setChallengeToken] = useState("");
  const [otp, setOtp] = useState("");
  const [verification, setVerification] = useState({
    otpExpiry: 5,
    maxOtpAttempts: 3,
    resendCooldown: 60,
    allowResendOtp: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!challengeToken && !validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = challengeToken
        ? await authService.verifyTwoFactor(challengeToken, otp)
        : await authService.login({
            email: formData.email,
            password: formData.password,
          });

      if (response.success) {
        if (response.requiresTwoFactor) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setChallengeToken(response.challengeToken);
          if (response.verification) setVerification(response.verification);
          setFormData((prev) => ({ ...prev, password: "" }));
          return;
        }
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        switch (response.user.userType) {
          case "superadmin":
            navigate("/admin/dashboard");
            break;
          case "institute":
            navigate(
              /^\/institute\/subscription(?:\/|$)/.test(
                location.state?.from || "",
              )
                ? location.state.from
                : "/institute/dashboard",
            );
            break;
          case "teacher":
            navigate("/teacher/dashboard");
            break;
          default:
            navigate("/dashboard");
        }
      } else {
        setErrors({ submit: response.message || "Login failed" });
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials.";
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <header className="cvx-form-heading">
        <img src="/favicon.svg" alt="" />
        <span className="cvx-kicker">
          {challengeToken ? "ONE MORE STEP" : "YOUR CERTIVERXIA ACCOUNT"}
        </span>
        <h1>{challengeToken ? "Verify your sign-in" : "Welcome back."}</h1>
        <p>
          {challengeToken
            ? `Enter the 6-digit code sent to your email. It expires in ${verification.otpExpiry} minutes and allows ${verification.maxOtpAttempts} attempts.`
            : "Good to see you again. Sign in to continue to your workspace."}
        </p>
      </header>
      <form className="cvx-form" onSubmit={handleSubmit}>
        {challengeToken ? (
          <>
            <FormField label="Login code" id="login-code">
              <input
                id="login-code"
                className="cvx-code-input"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
              />
            </FormField>
            {errors.submit && (
              <div role="alert" className="cvx-alert">
                {errors.submit}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="cvx-submit"
            >
              {isLoading ? "Verifying..." : "Verify and sign in"}
              <ArrowRightIcon aria-hidden="true" />
            </button>
            <p className="cvx-field-hint">
              {verification.allowResendOtp
                ? `Need another code? Return to sign-in and enter your password again. Wait at least ${verification.resendCooldown} seconds between requests.`
                : "Resending is disabled. Use the code already sent, or sign in again after it expires."}
            </p>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setChallengeToken("");
                setOtp("");
                setErrors({});
              }}
              className="text-sm text-blue-600"
            >
              Back to sign-in
            </button>
          </>
        ) : (
          <>
            <FormField label="Email address" id="email" error={errors.email}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                placeholder="you@institute.com"
              />
            </FormField>
            <FormField label="Password" id="password" error={errors.password}>
              <div className="cvx-password">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeSlashIcon aria-hidden="true" />
                  ) : (
                    <EyeIcon aria-hidden="true" />
                  )}
                </button>
              </div>
            </FormField>
            <div className="cvx-form-links">
              <span>Institute &amp; team access</span>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            {errors.submit && (
              <div role="alert" className="cvx-alert">
                {errors.submit}
              </div>
            )}
            <button type="submit" disabled={isLoading} className="cvx-submit">
              {isLoading ? "Signing in..." : "Sign in"}
              <ArrowRightIcon aria-hidden="true" />
            </button>
          </>
        )}
      </form>
      {!challengeToken && (
        <p className="cvx-form-switch">
          New to CERTIVERXIA?{" "}
          <Link to="/register">Create an institute account</Link>
        </p>
      )}
      <p className="cvx-form-security">
        <LockClosedIcon aria-hidden="true" /> Your workspace. Your credentials.
      </p>
    </AuthLayout>
  );
};

export default Login;
