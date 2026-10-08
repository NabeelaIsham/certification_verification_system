import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AuthLayout, FormField } from "../components/shared/PublicExperience";

const API_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const instituteTypes = [
  "University",
  "College",
  "School",
  "Training Center",
  "Online Platform",
  "Professional Institute",
  "Other",
];
const Register = () => {
  const [formData, setFormData] = useState({
    instituteName: "",
    email: "",
    phone: "",
    address: "",
    adminName: "",
    password: "",
    confirmPassword: "",
    instituteType: "",
    studentCount: "",
    agreeToTerms: false,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const handleChange = ({ target: { name, value, type, checked } }) => {
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please check both password fields.");
      return;
    }
    if (
      formData.password.length < 10 ||
      formData.password.length > 128 ||
      !/[a-z]/.test(formData.password) ||
      !/[A-Z]/.test(formData.password) ||
      !/\d/.test(formData.password)
    ) {
      setError(
        "Password must be 10–128 characters and include uppercase, lowercase, and a number.",
      );
      return;
    }
    if (!formData.agreeToTerms) {
      setError("Please agree to the Terms and Conditions and Privacy Policy.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_URL}/auth/register`, formData);
      if (response.data.success)
        navigate("/OTPVerification", { state: { email: formData.email } });
      else
        setError(
          response.data.message || "Registration failed. Please try again.",
        );
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };
  const input = (id, label, placeholder, type = "text", extra = {}) => (
    <FormField id={id} label={label}>
      <input
        id={id}
        name={id}
        type={type}
        required
        value={formData[id]}
        onChange={handleChange}
        placeholder={placeholder}
        {...extra}
      />
    </FormField>
  );
  return (
    <AuthLayout registration>
      <header className="cvx-form-heading">
        <span className="cvx-kicker">LET'S GET YOUR INSTITUTE STARTED</span>
        <h1>Create your account.</h1>
        <p>
          A new home for your institute's achievements. All fields are required.
        </p>
      </header>
      {import.meta.env.VITE_SAAS_ENABLED === "true" && (
        <div className="cvx-trial-note">
          <SparklesIcon aria-hidden="true" />
          <div>
            <strong>Your first 14 days are on us.</strong>
            <p>
              Starter package limits. No payment required. The trial starts at
              registration; email and institute approval are required before
              use.
            </p>
          </div>
        </div>
      )}
      <form className="cvx-form" onSubmit={handleSubmit}>
        <fieldset className="cvx-form-section">
          <legend>
            <span>01</span> Your institute
          </legend>
          <div className="cvx-field-grid">
            {input(
              "instituteName",
              "Institute name",
              "e.g. Horizon Academy",
              "text",
              { autoComplete: "organization" },
            )}
            <FormField id="instituteType" label="Institute type">
              <select
                id="instituteType"
                name="instituteType"
                required
                value={formData.instituteType}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Select institute type
                </option>
                {instituteTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </FormField>
            {input("phone", "Phone number", "+94 77 123 4567", "tel", {
              autoComplete: "tel",
            })}
            {input(
              "studentCount",
              "Approximate student count",
              "e.g. 500",
              "number",
              { min: 0, step: 1 },
            )}
            <div className="cvx-field-wide">
              <FormField id="address" label="Institute address">
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  required
                  value={formData.address}
                  onChange={handleChange}
                  autoComplete="street-address"
                  placeholder="Street address, city"
                />
              </FormField>
            </div>
          </div>
        </fieldset>
        <fieldset className="cvx-form-section">
          <legend>
            <span>02</span> Account administrator
          </legend>
          <div className="cvx-field-grid">
            {input("adminName", "Full name", "Your full name", "text", {
              autoComplete: "name",
            })}
            {input("email", "Email address", "you@institute.com", "email", {
              autoComplete: "email",
            })}
            <FormField
              id="password"
              label="Password"
              hint="10–128 characters, uppercase, lowercase & a number."
            >
              <div className="cvx-password">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                  value={formData.password}
                  onChange={handleChange}
                  aria-describedby="password-hint"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Hide passwords" : "Show passwords"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <EyeSlashIcon aria-hidden="true" />
                  ) : (
                    <EyeIcon aria-hidden="true" />
                  )}
                </button>
              </div>
            </FormField>
            {input(
              "confirmPassword",
              "Confirm password",
              "Re-enter your password",
              showPassword ? "text" : "password",
              { minLength: 10, maxLength: 128, autoComplete: "new-password" },
            )}
          </div>
        </fieldset>
        <label className="cvx-terms" htmlFor="agreeToTerms">
          <input
            id="agreeToTerms"
            name="agreeToTerms"
            type="checkbox"
            required
            checked={formData.agreeToTerms}
            onChange={handleChange}
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" target="_blank" rel="noopener noreferrer">
              Terms and Conditions
            </Link>{" "}
            and acknowledge the{" "}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </Link>
            . <span className="sr-only">These links open in a new tab.</span>
          </span>
        </label>
        {error && (
          <div className="cvx-alert" role="alert">
            {error}
          </div>
        )}
        <button type="submit" className="cvx-submit" disabled={isLoading}>
          {isLoading ? "Creating your account..." : "Create institute account"}
          <ArrowRightIcon aria-hidden="true" />
        </button>
        <p className="cvx-field-hint text-center">
          Next, we'll send a code to verify your email address.
        </p>
      </form>
      <p className="cvx-form-switch">
        Already part of CERTIVERXIA? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
};
export default Register;
