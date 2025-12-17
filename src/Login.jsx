import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setMessage(error.message);
    else setMessage("Magic link sent! Check your email.");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>MilaVault</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send Magic Link</button>
        </form>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}
