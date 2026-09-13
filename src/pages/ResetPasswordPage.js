import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom"; // Para makuha yung ?oobCode= sa link
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../services/firebase";
import ROUTES from "../constants/routes";
import { useApp } from "../context/AppContext";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const { navigate } = useApp();
  
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [oobCode, setOobCode] = useState(null);

  // Kunin yung secret code sa URL kapag nag-load ang page
  useEffect(() => {
    const code = searchParams.get("oobCode");
    if (code) {
      setOobCode(code);
    } else {
      setError("Invalid or missing reset code.");
    }
  }, [searchParams]);

  const handleReset = async () => {
    if (!oobCode) return;
    
    // DITO MO ILALAGAY YUNG PASSWORD STRENGTH CHECKER MO!
    // Kung hindi pasado sa requirements, mag-return at mag-set ng error.

    try {
      // Ito ang magse-save ng bagong password sa Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage("Password successfully reset! You can now log in.");
      setTimeout(() => navigate(ROUTES.LOGIN), 3000); // Balik sa login after 3 seconds
    } catch (err) {
      setError("Failed to reset password. The link might have expired.");
    }
  };

  return (
    <div className="auth-wrap" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
        <h2>Set New Password</h2>
        
        {error && <p style={{ color: "red" }}>{error}</p>}
        {message && <p style={{ color: "green" }}>{message}</p>}

        {!message && (
          <>
            <input 
              type="password" 
              placeholder="Enter new strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: "100%", padding: "10px", margin: "10px 0" }}
            />
            
            {/* ILAGAY MO DITO YUNG <PasswordStrengthBar password={newPassword} /> */}

            <button onClick={handleReset} className="btn-pri" style={{ width: "100%" }}>
              Confirm New Password
            </button>
          </>
        )}
      </div>
    </div>
  );
}