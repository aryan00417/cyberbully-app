import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LABEL = {
  religion: "religion-based harassment",
  age: "age-based harassment",
  gender: "gender-based harassment",
  ethnicity: "ethnicity-based harassment",
  harassment_other: "harassment",
};

export function WarningModal() {
  const { warning, dismissWarning } = useAuth();
  if (!warning) return null;

  const left = warning.maxStrikes - warning.strikes;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900">
          Warning {warning.strikes} of {warning.maxStrikes}
        </h2>
        <p className="text-gray-600 mt-2">
          Your last message was flagged as possible {LABEL[warning.category] || "harassment"}.{" "}
          {left} more flagged {left === 1 ? "message" : "messages"} and your account will be banned.
        </p>
        <button
          onClick={dismissWarning}
          className="mt-5 bg-gray-900 text-white px-6 py-2 rounded-full font-semibold hover:bg-gray-700 transition"
        >
          I understand
        </button>
      </div>
    </div>
  );
}

export function BannedScreen() {
  const { banMessage, dismissBan } = useAuth();
  const navigate = useNavigate();
  if (!banMessage) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-red-700 text-white flex items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <div className="text-7xl mb-4">🚫</div>
        <h1 className="text-4xl font-extrabold mb-3">Account banned</h1>
        <p className="text-lg text-red-100">{banMessage}</p>
        <button
          onClick={() => {
            dismissBan();
            navigate("/login");
          }}
          className="mt-8 bg-white text-red-700 px-6 py-2 rounded-full font-semibold hover:bg-red-50 transition"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}