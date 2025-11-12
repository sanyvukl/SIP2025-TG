import React, { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { getLoginData } from "../api/tournaments";
import LoaderTwo from "./Loaders/LoaderTwo/LoaderTwo";

export default function Admin({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jwt, setJwt] = useState(localStorage.getItem('jwt') || '');

  const handleLoginSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const token = credentialResponse && credentialResponse.credential;
      if (!token) throw new Error('Missing Google credential');
      localStorage.setItem('jwt', token); // Save JWT for future use
      setJwt(token);
      const result = await getLoginData(token);
      setIsAuthorized(result.isAllowed);
    } catch (e) {
      console.error('Error during login:', e);
      setIsAuthorized(false);
    }
    setLoading(false);
  };
  
  if (loading) {
    return <LoaderTwo />;
  }
  if (isAuthorized === null) {
    console.log('User not authorized yet, showing Google login.');
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "#fff",
          background: "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)",
          borderRadius: "16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          margin: "40px auto",
          maxWidth: "400px",
          padding: "48px 32px",
          fontFamily: "Segoe UI, Arial, sans-serif",
        }}
      >
        <svg
          width="64"
          height="64"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#fff"
          style={{ marginBottom: "24px" }}
        >
          <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" fill="#43cea2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 12l2 2 4-4"
            stroke="#185a9d"
            fill="none"
          />
        </svg>
        <h2 style={{ marginBottom: "12px", fontWeight: 700 }}>Admin Login</h2>
        <p style={{ marginBottom: "24px", fontSize: "1.1rem", opacity: 0.85, textAlign: "center" }}>
          Please sign in with your Google account to access admin features.
        </p>
        <GoogleOAuthProvider clientId={process.env.REACT_APP_CLIENT_ID}>
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={() => { console.log('Google login error'); setIsAuthorized(false); }}
            width="100%"
          />
        </GoogleOAuthProvider>
      </div>
    );
  }
  if (isAuthorized) {
    console.log('User is authorized, rendering children.');
    // Pass jwt as prop to children if needed
    return React.cloneElement(children, { jwt });
  }
  console.log('User is NOT authorized, showing not authorized message.');
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
        color: "#fff",
        background: "linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)",
        borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        margin: "40px auto",
        maxWidth: "400px",
        padding: "48px 32px",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      <svg
        width="64"
        height="64"
        fill="none"
        viewBox="0 0 24 24"
        stroke="#fff"
        style={{ marginBottom: "24px" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
        />
      </svg>
      <h2 style={{ marginBottom: "12px", fontWeight: 700 }}>Not Authorized</h2>
      <p
        style={{
          marginBottom: "0",
          fontSize: "1.1rem",
          opacity: 0.85,
          textAlign: "center",
        }}
      >
        You do not have permission to view this page.
        <br /> Please contact your administrator if you believe this is a
        mistake.
      </p>
    </div>
  );
}
